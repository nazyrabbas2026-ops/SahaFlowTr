import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JobStatus, Prisma } from "@sahaflow/database";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";
import type {
  AssignJobInput,
  CreateJobInput,
  JobListInput,
  UpdateJobInput,
} from "./jobs.schemas";

const transitions: Record<JobStatus, JobStatus[]> = {
  NEW: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["INVOICED"],
  INVOICED: ["PAID"],
  PAID: [],
  CANCELLED: [],
};
const detailInclude = {
  customer: {
    select: {
      id: true,
      displayName: true,
      customerNumber: true,
      primaryPhone: true,
    },
  },
  address: true,
  asset: true,
  assignments: {
    where: { unassignedAt: null },
    include: {
      member: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" as const },
  },
  statusHistory: {
    include: { changedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  notes: {
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.JobInclude;

@Injectable()
export class JobsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
  ) {}
  async list(org: string, input: JobListInput) {
    const where: Prisma.JobWhereInput = {
      organizationId: org,
      ...(input.status !== "ALL" ? { status: input.status } : {}),
      ...(input.priority !== "ALL" ? { priority: input.priority } : {}),
      ...(input.scheduledFrom || input.scheduledTo
        ? {
            scheduledStart: {
              ...(input.scheduledFrom
                ? { gte: new Date(input.scheduledFrom) }
                : {}),
              ...(input.scheduledTo
                ? { lte: new Date(input.scheduledTo) }
                : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { jobNumber: { contains: input.search, mode: "insensitive" } },
              { title: { contains: input.search, mode: "insensitive" } },
              { category: { contains: input.search, mode: "insensitive" } },
              {
                customer: {
                  displayName: { contains: input.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.job.findMany({
        where,
        include: {
          customer: { select: { id: true, displayName: true } },
          assignments: {
            where: { unassignedAt: null },
            include: {
              member: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.db.job.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / input.pageSize)),
      },
    };
  }
  async get(org: string, id: string) {
    const item = await this.db.job.findFirst({
      where: { organizationId: org, id },
      include: detailInclude,
    });
    if (!item) throw new NotFoundException("İş emri bulunamadı");
    return item;
  }
  async create(
    org: string,
    actor: string,
    input: CreateJobInput,
    req: Request,
  ) {
    await this.validateLinks(
      org,
      input.customerId,
      input.addressId,
      input.assetId,
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"=${org} FOR UPDATE`;
        const entitlement = await tx.planEntitlement.findFirst({
          where: {
            featureKey: "operations.jobs",
            enabled: true,
            plan: {
              subscriptions: {
                some: { organizationId: org, status: "active" },
              },
            },
          },
          select: { limitValue: true },
        });
        if (!entitlement)
          throw new ForbiddenException(
            "İş emirleri mevcut planınızda etkin değil",
          );
        if (
          entitlement.limitValue !== null &&
          (await tx.job.count({ where: { organizationId: org } })) >=
            entitlement.limitValue
        )
          throw new ForbiddenException("İş emri kotası doldu");
        const seq = await tx.organizationSequence.upsert({
          where: { organizationId_key: { organizationId: org, key: "job" } },
          create: { organizationId: org, key: "job", nextValue: 2 },
          update: { nextValue: { increment: 1 } },
          select: { nextValue: true },
        });
        const status = input.scheduledStart
          ? JobStatus.SCHEDULED
          : JobStatus.NEW;
        const item = await tx.job.create({
          data: {
            organizationId: org,
            jobNumber: `WO-${new Date().getFullYear()}-${String(seq.nextValue - 1).padStart(6, "0")}`,
            ...this.data(input),
            customerId: input.customerId,
            category: input.category,
            title: input.title,
            status,
          },
        });
        await tx.jobStatusHistory.create({
          data: {
            organizationId: org,
            jobId: item.id,
            toStatus: status,
            changedByUserId: actor,
          },
        });
        await tx.organizationOnboardingStep.updateMany({
          where: {
            organizationId: org,
            key: "first_job_created",
            completedAt: null,
          },
          data: { completedAt: new Date() },
        });
        await this.audit.write(
          {
            organizationId: org,
            actorId: actor,
            action: "job.created",
            entity: "Job",
            entityId: item.id,
            metadata: { jobNumber: item.jobNumber },
            ...requestMeta(req),
          },
          tx,
        );
        return item;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async update(
    org: string,
    actor: string,
    id: string,
    input: UpdateJobInput,
    req: Request,
  ) {
    const old = await this.db.job.findFirst({
      where: { organizationId: org, id },
    });
    if (!old) throw new NotFoundException("İş emri bulunamadı");
    await this.validateLinks(
      org,
      input.customerId ?? old.customerId,
      input.addressId === undefined ? old.addressId : input.addressId,
      input.assetId === undefined ? old.assetId : input.assetId,
    );
    const updated = await this.db.job.updateMany({
      where: { organizationId: org, id, version: input.version },
      data: { ...this.data(input), version: { increment: 1 } },
    });
    if (!updated.count)
      throw new ConflictException(
        "İş emri başka bir kullanıcı tarafından güncellendi",
      );
    await this.audit.write({
      organizationId: org,
      actorId: actor,
      action: "job.updated",
      entity: "Job",
      entityId: id,
      ...requestMeta(req),
    });
    return this.get(org, id);
  }
  async assign(
    org: string,
    actor: string,
    id: string,
    input: AssignJobInput,
    req: Request,
  ) {
    const job = await this.db.job.findFirst({
      where: { organizationId: org, id },
    });
    if (!job) throw new NotFoundException("İş emri bulunamadı");
    const member = await this.db.organizationMember.findFirst({
      where: { organizationId: org, id: input.memberId, active: true },
    });
    if (!member) throw new NotFoundException("Aktif ekip üyesi bulunamadı");
    if (
      job.status !== JobStatus.NEW &&
      job.status !== JobStatus.SCHEDULED &&
      job.status !== JobStatus.ASSIGNED
    )
      throw new ConflictException("Bu durumdaki iş emrine atama yapılamaz");
    return this.db.$transaction(async (tx) => {
      if (input.primary)
        await tx.jobAssignment.updateMany({
          where: {
            organizationId: org,
            jobId: id,
            primary: true,
            unassignedAt: null,
          },
          data: { unassignedAt: new Date(), primary: false },
        });
      const assignment = await tx.jobAssignment.create({
        data: {
          organizationId: org,
          jobId: id,
          memberId: input.memberId,
          primary: input.primary,
        },
      });
      if (job.status !== JobStatus.ASSIGNED) {
        await tx.job.update({
          where: { id },
          data: { status: JobStatus.ASSIGNED, version: { increment: 1 } },
        });
        await tx.jobStatusHistory.create({
          data: {
            organizationId: org,
            jobId: id,
            fromStatus: job.status,
            toStatus: JobStatus.ASSIGNED,
            changedByUserId: actor,
          },
        });
      }
      await this.audit.write(
        {
          organizationId: org,
          actorId: actor,
          action: "job.assigned",
          entity: "Job",
          entityId: id,
          metadata: { memberId: input.memberId },
          ...requestMeta(req),
        },
        tx,
      );
      return assignment;
    });
  }
  async transition(
    org: string,
    actor: string,
    id: string,
    to: JobStatus,
    reason: string | undefined,
    req: Request,
  ) {
    const job = await this.db.job.findFirst({
      where: { organizationId: org, id },
    });
    if (!job) throw new NotFoundException("İş emri bulunamadı");
    if (!transitions[job.status]?.includes(to))
      throw new ConflictException(
        `${job.status} durumundan ${to} durumuna geçilemez`,
      );
    if ((to === JobStatus.ON_HOLD || to === JobStatus.CANCELLED) && !reason)
      throw new ConflictException("Durum nedeni gereklidir");
    return this.db.$transaction(async (tx) => {
      const item = await tx.job.update({
        where: { id },
        data: {
          status: to,
          holdReason: to === JobStatus.ON_HOLD ? reason : null,
          cancellationReason: to === JobStatus.CANCELLED ? reason : null,
          completedAt: to === JobStatus.COMPLETED ? new Date() : undefined,
          cancelledAt: to === JobStatus.CANCELLED ? new Date() : undefined,
          version: { increment: 1 },
        },
      });
      await tx.jobStatusHistory.create({
        data: {
          organizationId: org,
          jobId: id,
          fromStatus: job.status,
          toStatus: to,
          reason,
          changedByUserId: actor,
        },
      });
      await this.audit.write(
        {
          organizationId: org,
          actorId: actor,
          action: `job.${to.toLowerCase()}`,
          entity: "Job",
          entityId: id,
          metadata: reason ? { reason } : undefined,
          ...requestMeta(req),
        },
        tx,
      );
      return item;
    });
  }
  async note(
    org: string,
    actor: string,
    id: string,
    body: string,
    visibility: "INTERNAL" | "CUSTOMER",
    req: Request,
  ) {
    await this.get(org, id);
    const note = await this.db.jobNote.create({
      data: {
        organizationId: org,
        jobId: id,
        body,
        visibility,
        createdByUserId: actor,
      },
    });
    await this.audit.write({
      organizationId: org,
      actorId: actor,
      action: "job.note.created",
      entity: "JobNote",
      entityId: note.id,
      metadata: { jobId: id },
      ...requestMeta(req),
    });
    return note;
  }
  private async validateLinks(
    org: string,
    customerId: string,
    addressId?: string | null,
    assetId?: string | null,
  ) {
    const customer = await this.db.customer.findFirst({
      where: { organizationId: org, id: customerId, status: "ACTIVE" },
    });
    if (!customer) throw new NotFoundException("Aktif müşteri bulunamadı");
    if (
      addressId &&
      !(await this.db.customerAddress.findFirst({
        where: { organizationId: org, customerId, id: addressId, active: true },
      }))
    )
      throw new NotFoundException("Müşteriye ait servis adresi bulunamadı");
    if (
      assetId &&
      !(await this.db.asset.findFirst({
        where: {
          organizationId: org,
          customerId,
          id: assetId,
          active: true,
          ...(addressId ? { OR: [{ addressId }, { addressId: null }] } : {}),
        },
      }))
    )
      throw new NotFoundException("Müşteriye ait cihaz bulunamadı");
  }
  private data(input: Partial<CreateJobInput>) {
    return {
      ...input,
      scheduledStart:
        input.scheduledStart === undefined
          ? undefined
          : input.scheduledStart
            ? new Date(input.scheduledStart)
            : null,
      scheduledEnd:
        input.scheduledEnd === undefined
          ? undefined
          : input.scheduledEnd
            ? new Date(input.scheduledEnd)
            : null,
    };
  }
}
