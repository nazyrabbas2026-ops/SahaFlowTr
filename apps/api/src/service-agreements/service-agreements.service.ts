import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ServiceAgreementGenerationStatus } from "@sahaflow/database";
import { computeDueOccurrences, periodKeyFor } from "@sahaflow/domain";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { JobsService } from "../jobs/jobs.service";
import type {
  CreateServiceAgreementInput,
  GenerateServiceAgreementInput,
  ServiceAgreementListInput,
  UpdateServiceAgreementInput,
} from "./service-agreements.schemas";

const detailInclude = {
  customer: { select: { id: true, displayName: true } },
  asset: { select: { id: true, name: true } },
  generationRuns: {
    orderBy: { createdAt: "desc" as const },
    include: { job: { select: { id: true, jobNumber: true, title: true } } },
  },
} satisfies Prisma.ServiceAgreementInclude;

@Injectable()
export class ServiceAgreementsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(JobsService) private readonly jobs: JobsService,
  ) {}

  async list(org: string, input: ServiceAgreementListInput) {
    const where: Prisma.ServiceAgreementWhereInput = {
      organizationId: org,
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.active !== "ALL" ? { active: input.active === "TRUE" } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.serviceAgreement.findMany({
        where,
        include: {
          customer: { select: { id: true, displayName: true } },
          asset: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.db.serviceAgreement.count({ where }),
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
    const item = await this.db.serviceAgreement.findFirst({
      where: { organizationId: org, id },
      include: detailInclude,
    });
    if (!item) throw new NotFoundException("Servis sözleşmesi bulunamadı");
    return item;
  }

  async create(org: string, actor: string, input: CreateServiceAgreementInput, req: Request) {
    await this.validateLinks(org, input.customerId, input.assetId);
    const item = await this.db.serviceAgreement.create({
      data: {
        organizationId: org,
        customerId: input.customerId,
        assetId: input.assetId ?? null,
        title: input.title,
        category: input.category,
        priority: input.priority,
        problemDescription: input.problemDescription ?? null,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
        recurrenceIntervalMonths: input.recurrenceIntervalMonths,
        anchorDate: new Date(input.anchorDate),
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
      include: detailInclude,
    });
    await this.audit.write({
      organizationId: org,
      actorId: actor,
      action: "service_agreement.created",
      entity: "ServiceAgreement",
      entityId: item.id,
      ...requestMeta(req),
    });
    return item;
  }

  async update(
    org: string,
    actor: string,
    id: string,
    input: UpdateServiceAgreementInput,
    req: Request,
  ) {
    const existing = await this.db.serviceAgreement.findFirst({
      where: { organizationId: org, id },
    });
    if (!existing) throw new NotFoundException("Servis sözleşmesi bulunamadı");
    await this.validateLinks(
      org,
      input.customerId ?? existing.customerId,
      input.assetId === undefined ? existing.assetId : input.assetId,
    );
    const data: Prisma.ServiceAgreementUncheckedUpdateManyInput = {
      version: { increment: 1 },
    };
    if (input.customerId !== undefined) data.customerId = input.customerId;
    if (input.assetId !== undefined) data.assetId = input.assetId;
    if (input.title !== undefined) data.title = input.title;
    if (input.category !== undefined) data.category = input.category;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.problemDescription !== undefined)
      data.problemDescription = input.problemDescription;
    if (input.estimatedDurationMinutes !== undefined)
      data.estimatedDurationMinutes = input.estimatedDurationMinutes;
    if (input.recurrenceIntervalMonths !== undefined)
      data.recurrenceIntervalMonths = input.recurrenceIntervalMonths;
    if (input.anchorDate !== undefined)
      data.anchorDate = new Date(input.anchorDate);
    if (input.startDate !== undefined)
      data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.active !== undefined) data.active = input.active;

    const updated = await this.db.serviceAgreement.updateMany({
      where: { organizationId: org, id, version: input.version },
      data,
    });
    if (!updated.count)
      throw new ConflictException(
        "Servis sözleşmesi başka bir kullanıcı tarafından güncellendi",
      );
    await this.audit.write({
      organizationId: org,
      actorId: actor,
      action: "service_agreement.updated",
      entity: "ServiceAgreement",
      entityId: id,
      ...requestMeta(req),
    });
    return this.get(org, id);
  }

  async generate(
    org: string,
    actor: string,
    id: string,
    input: GenerateServiceAgreementInput,
    req: Request,
  ) {
    const agreement = await this.db.serviceAgreement.findFirst({
      where: { organizationId: org, id },
    });
    if (!agreement) throw new NotFoundException("Servis sözleşmesi bulunamadı");
    if (!agreement.active)
      throw new ForbiddenException("Pasif sözleşme için iş emri üretilemez");

    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    const occurrences = computeDueOccurrences(
      {
        anchorDate: agreement.anchorDate,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        intervalMonths: agreement.recurrenceIntervalMonths,
      },
      asOf,
    );

    const results: Array<{
      periodKey: string;
      status: ServiceAgreementGenerationStatus;
      jobId: string | null;
    }> = [];

    for (const occurrence of occurrences) {
      const periodKey = periodKeyFor(occurrence);
      const existingRun = await this.db.serviceAgreementGenerationRun.findUnique({
        where: {
          organizationId_serviceAgreementId_periodKey: {
            organizationId: org,
            serviceAgreementId: id,
            periodKey,
          },
        },
      });
      if (existingRun) {
        results.push({
          periodKey,
          status: existingRun.status,
          jobId: existingRun.jobId,
        });
        continue;
      }

      try {
        const job = await this.jobs.create(
          org,
          actor,
          {
            customerId: agreement.customerId,
            assetId: agreement.assetId,
            addressId: null,
            category: agreement.category,
            title: agreement.title,
            problemDescription: agreement.problemDescription,
            priority: agreement.priority,
            scheduledStart: occurrence.toISOString(),
            scheduledEnd: null,
            estimatedDurationMinutes: agreement.estimatedDurationMinutes,
            source: "INTERNAL",
            tags: [],
            internalNote: null,
            customerNote: null,
          },
          req,
        );
        await this.db.serviceAgreementGenerationRun.create({
          data: {
            organizationId: org,
            serviceAgreementId: id,
            periodKey,
            status: ServiceAgreementGenerationStatus.GENERATED,
            jobId: job.id,
            triggeredByUserId: actor,
          },
        });
        results.push({
          periodKey,
          status: ServiceAgreementGenerationStatus.GENERATED,
          jobId: job.id,
        });
      } catch (error) {
        await this.db.serviceAgreementGenerationRun.create({
          data: {
            organizationId: org,
            serviceAgreementId: id,
            periodKey,
            status: ServiceAgreementGenerationStatus.FAILED,
            failureReason:
              error instanceof Error ? error.message : "Bilinmeyen hata",
            triggeredByUserId: actor,
          },
        });
        results.push({
          periodKey,
          status: ServiceAgreementGenerationStatus.FAILED,
          jobId: null,
        });
      }
    }

    await this.audit.write({
      organizationId: org,
      actorId: actor,
      action: "service_agreement.generated",
      entity: "ServiceAgreement",
      entityId: id,
      metadata: { periods: results.map((r) => r.periodKey) },
      ...requestMeta(req),
    });

    return { periods: results };
  }

  private async validateLinks(
    org: string,
    customerId: string,
    assetId?: string | null,
  ) {
    const customer = await this.db.customer.findFirst({
      where: { organizationId: org, id: customerId, status: "ACTIVE" },
    });
    if (!customer) throw new NotFoundException("Aktif müşteri bulunamadı");
    if (
      assetId &&
      !(await this.db.asset.findFirst({
        where: { organizationId: org, id: assetId, customerId, active: true },
      }))
    )
      throw new NotFoundException("Müşteriye ait cihaz bulunamadı");
  }
}
