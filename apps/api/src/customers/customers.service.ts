import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";
import type {
  AddressInput,
  AssetInput,
  ContactInput,
  CreateCustomerInput,
  CustomerListInput,
  UpdateCustomerInput,
} from "./customers.schemas";
import { encryptSensitive } from "./sensitive-data";

const summarySelect = {
  id: true,
  customerNumber: true,
  type: true,
  status: true,
  displayName: true,
  primaryPhone: true,
  email: true,
  tags: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { contacts: true, addresses: true, assets: true } },
} satisfies Prisma.CustomerSelect;

const detailSelect = {
  ...summarySelect,
  firstName: true,
  lastName: true,
  companyName: true,
  alternatePhone: true,
  nationalIdLastFour: true,
  taxNumber: true,
  taxOffice: true,
  notes: true,
  contacts: {
    orderBy: [{ isPrimary: "desc" as const }, { name: "asc" as const }],
  },
  addresses: {
    orderBy: [{ active: "desc" as const }, { label: "asc" as const }],
  },
  assets: {
    orderBy: [{ active: "desc" as const }, { name: "asc" as const }],
    include: { address: { select: { id: true, label: true } } },
  },
} satisfies Prisma.CustomerSelect;

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, input: CustomerListInput) {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(input.type !== "ALL" ? { type: input.type } : {}),
      ...(input.status !== "ALL" ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { displayName: { contains: input.search, mode: "insensitive" } },
              {
                customerNumber: { contains: input.search, mode: "insensitive" },
              },
              { primaryPhone: { contains: input.search } },
              { email: { contains: input.search, mode: "insensitive" } },
              { taxNumber: { contains: input.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.customer.findMany({
        where,
        select: summarySelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.customer.count({ where }),
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

  async get(organizationId: string, customerId: string) {
    const customer = await this.database.customer.findFirst({
      where: { id: customerId, organizationId },
      select: detailSelect,
    });
    if (!customer) throw new NotFoundException("Müşteri bulunamadı");
    return customer;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateCustomerInput,
    request: Request,
  ) {
    return this.database.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
        const entitlement = await tx.planEntitlement.findFirst({
          where: {
            featureKey: "crm.customers",
            enabled: true,
            plan: {
              subscriptions: { some: { organizationId, status: "active" } },
            },
          },
          select: { limitValue: true },
        });
        if (!entitlement)
          throw new ForbiddenException("CRM mevcut planınızda etkin değil");
        if (
          entitlement.limitValue !== null &&
          (await tx.customer.count({ where: { organizationId } })) >=
            entitlement.limitValue
        )
          throw new ForbiddenException("Müşteri kotası doldu");
        const sequence = await tx.organizationSequence.upsert({
          where: {
            organizationId_key: { organizationId, key: "customer" },
          },
          create: { organizationId, key: "customer", nextValue: 2 },
          update: { nextValue: { increment: 1 } },
          select: { nextValue: true },
        });
        const allocated = sequence.nextValue - 1;
        const customer = await tx.customer.create({
          data: {
            organizationId,
            customerNumber: `MUS-${String(allocated).padStart(6, "0")}`,
            ...this.customerData(input),
          },
          select: summarySelect,
        });
        await tx.organizationOnboardingStep.updateMany({
          where: {
            organizationId,
            key: "first_customer_created",
            completedAt: null,
          },
          data: { completedAt: new Date() },
        });
        await this.audit.write(
          {
            organizationId,
            actorId,
            action: "customer.created",
            entity: "Customer",
            entityId: customer.id,
            metadata: {
              customerNumber: customer.customerNumber,
              type: input.type,
            },
            ...requestMeta(request),
          },
          tx,
        );
        return customer;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(
    organizationId: string,
    actorId: string,
    customerId: string,
    input: UpdateCustomerInput,
    request: Request,
  ) {
    const existing = await this.database.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!existing) throw new NotFoundException("Müşteri bulunamadı");
    const type = input.type ?? existing.type;
    const firstName = input.firstName ?? existing.firstName ?? undefined;
    const lastName = input.lastName ?? existing.lastName ?? undefined;
    const companyName = input.companyName ?? existing.companyName ?? undefined;
    if (type === "INDIVIDUAL" && (!firstName || !lastName))
      throw new ConflictException("Bireysel müşteri adı ve soyadı gereklidir");
    if (type === "COMPANY" && !companyName)
      throw new ConflictException("Firma adı gereklidir");
    return this.database.$transaction(async (tx) => {
      const national = this.nationalIdData(input.nationalId);
      const updated = await tx.customer.updateMany({
        where: { id: customerId, organizationId, version: input.version },
        data: {
          type,
          displayName:
            type === "INDIVIDUAL"
              ? `${firstName} ${lastName}`.trim()
              : companyName!,
          firstName: type === "INDIVIDUAL" ? firstName : input.firstName,
          lastName: type === "INDIVIDUAL" ? lastName : input.lastName,
          companyName: type === "COMPANY" ? companyName : null,
          primaryPhone: input.primaryPhone,
          alternatePhone: input.alternatePhone,
          email: input.email,
          taxNumber: input.taxNumber === "" ? null : input.taxNumber,
          taxOffice: input.taxOffice,
          notes: input.notes,
          tags: input.tags,
          ...national,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Müşteri başka bir kullanıcı tarafından güncellendi",
        );
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: "customer.updated",
          entity: "Customer",
          entityId: customerId,
          metadata: { previousVersion: input.version },
          ...requestMeta(request),
        },
        tx,
      );
      return tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: detailSelect,
      });
    });
  }

  async archive(
    organizationId: string,
    actorId: string,
    customerId: string,
    request: Request,
  ) {
    return this.setCustomerStatus(
      organizationId,
      actorId,
      customerId,
      "ARCHIVED",
      request,
    );
  }

  async restore(
    organizationId: string,
    actorId: string,
    customerId: string,
    request: Request,
  ) {
    return this.setCustomerStatus(
      organizationId,
      actorId,
      customerId,
      "ACTIVE",
      request,
    );
  }

  async createContact(
    organizationId: string,
    actorId: string,
    customerId: string,
    input: ContactInput,
    request: Request,
  ) {
    await this.ensureCustomer(organizationId, customerId);
    return this.database.$transaction(async (tx) => {
      if (input.isPrimary)
        await tx.customerContact.updateMany({
          where: { organizationId, customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      const item = await tx.customerContact.create({
        data: {
          organizationId,
          customerId,
          name: input.name,
          role: input.role,
          phone: input.phone,
          email: input.email,
          preferredChannel: input.preferredChannel,
          isPrimary: input.isPrimary,
          marketingConsentAt: input.marketingConsent ? new Date() : null,
          marketingConsentSource: input.marketingConsent
            ? input.marketingConsentSource
            : null,
        },
      });
      await this.writeChildAudit(
        tx,
        organizationId,
        actorId,
        "contact.created",
        "CustomerContact",
        item.id,
        customerId,
        request,
      );
      return item;
    });
  }

  updateContact(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    input: ContactInput,
    request: Request,
  ) {
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "contact",
      request,
      async (tx) => {
        if (input.isPrimary)
          await tx.customerContact.updateMany({
            where: {
              organizationId,
              customerId,
              isPrimary: true,
              id: { not: itemId },
            },
            data: { isPrimary: false },
          });
        return tx.customerContact.update({
          where: { id: itemId },
          data: {
            name: input.name,
            role: input.role,
            phone: input.phone,
            email: input.email,
            preferredChannel: input.preferredChannel,
            isPrimary: input.isPrimary,
            marketingConsentAt: input.marketingConsent ? new Date() : null,
            marketingConsentSource: input.marketingConsent
              ? input.marketingConsentSource
              : null,
          },
        });
      },
    );
  }

  archiveContact(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    request: Request,
  ) {
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "contact",
      request,
      (tx) =>
        tx.customerContact.update({
          where: { id: itemId },
          data: { active: false, isPrimary: false },
        }),
    );
  }

  async createAddress(
    organizationId: string,
    actorId: string,
    customerId: string,
    input: AddressInput,
    request: Request,
  ) {
    await this.ensureCustomer(organizationId, customerId);
    return this.database.$transaction(async (tx) => {
      const item = await tx.customerAddress.create({
        data: { organizationId, customerId, ...input },
      });
      await this.writeChildAudit(
        tx,
        organizationId,
        actorId,
        "address.created",
        "CustomerAddress",
        item.id,
        customerId,
        request,
      );
      return item;
    });
  }

  updateAddress(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    input: AddressInput,
    request: Request,
  ) {
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "address",
      request,
      (tx) => tx.customerAddress.update({ where: { id: itemId }, data: input }),
    );
  }

  archiveAddress(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    request: Request,
  ) {
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "address",
      request,
      (tx) =>
        tx.customerAddress.update({
          where: { id: itemId },
          data: { active: false },
        }),
    );
  }

  async createAsset(
    organizationId: string,
    actorId: string,
    customerId: string,
    input: AssetInput,
    request: Request,
  ) {
    await this.ensureCustomer(organizationId, customerId);
    await this.ensureAssetAddress(organizationId, customerId, input.addressId);
    return this.database.$transaction(async (tx) => {
      const item = await tx.asset.create({
        data: { organizationId, customerId, ...this.assetData(input) },
      });
      await this.writeChildAudit(
        tx,
        organizationId,
        actorId,
        "asset.created",
        "Asset",
        item.id,
        customerId,
        request,
      );
      return item;
    });
  }

  async updateAsset(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    input: AssetInput,
    request: Request,
  ) {
    await this.ensureAssetAddress(organizationId, customerId, input.addressId);
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "asset",
      request,
      (tx) =>
        tx.asset.update({ where: { id: itemId }, data: this.assetData(input) }),
    );
  }

  archiveAsset(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    request: Request,
  ) {
    return this.updateChild(
      organizationId,
      actorId,
      customerId,
      itemId,
      "asset",
      request,
      (tx) =>
        tx.asset.update({ where: { id: itemId }, data: { active: false } }),
    );
  }

  private customerData(input: CreateCustomerInput) {
    return {
      type: input.type,
      displayName:
        input.type === "INDIVIDUAL"
          ? `${input.firstName} ${input.lastName}`
          : input.companyName,
      firstName:
        input.type === "INDIVIDUAL" ? input.firstName : input.firstName,
      lastName: input.type === "INDIVIDUAL" ? input.lastName : input.lastName,
      companyName: input.type === "COMPANY" ? input.companyName : undefined,
      primaryPhone: input.primaryPhone,
      alternatePhone: input.alternatePhone,
      email: input.email,
      taxNumber: input.taxNumber || undefined,
      taxOffice: input.taxOffice,
      notes: input.notes,
      tags: input.tags,
      ...this.nationalIdData(input.nationalId),
    };
  }

  private nationalIdData(value: string | null | undefined) {
    if (value === undefined) return {};
    if (!value) return { nationalIdCiphertext: null, nationalIdLastFour: null };
    return {
      nationalIdCiphertext: encryptSensitive(value),
      nationalIdLastFour: value.slice(-4),
    };
  }

  private assetData(input: AssetInput) {
    return {
      ...input,
      addressId: input.addressId || null,
      installationDate: input.installationDate
        ? new Date(input.installationDate)
        : null,
      warrantyEndsAt: input.warrantyEndsAt
        ? new Date(input.warrantyEndsAt)
        : null,
    };
  }

  private async ensureCustomer(organizationId: string, customerId: string) {
    if (
      !(await this.database.customer.findFirst({
        where: { id: customerId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException("Müşteri bulunamadı");
  }

  private async ensureAssetAddress(
    organizationId: string,
    customerId: string,
    addressId: string | null | undefined,
  ) {
    if (!addressId) return;
    if (
      !(await this.database.customerAddress.findFirst({
        where: { id: addressId, organizationId, customerId, active: true },
        select: { id: true },
      }))
    )
      throw new NotFoundException("Servis adresi bulunamadı");
  }

  private async setCustomerStatus(
    organizationId: string,
    actorId: string,
    customerId: string,
    status: "ACTIVE" | "ARCHIVED",
    request: Request,
  ) {
    const existing = await this.database.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException("Müşteri bulunamadı");
    return this.database.$transaction(async (tx) => {
      const item = await tx.customer.update({
        where: { id: customerId },
        data: { status, version: { increment: 1 } },
        select: summarySelect,
      });
      await this.audit.write(
        {
          organizationId,
          actorId,
          action:
            status === "ACTIVE" ? "customer.restored" : "customer.archived",
          entity: "Customer",
          entityId: customerId,
          metadata: { previousStatus: existing.status },
          ...requestMeta(request),
        },
        tx,
      );
      return item;
    });
  }

  private async updateChild<T>(
    organizationId: string,
    actorId: string,
    customerId: string,
    itemId: string,
    kind: "contact" | "address" | "asset",
    request: Request,
    mutation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    const exists =
      kind === "contact"
        ? await this.database.customerContact.findFirst({
            where: { id: itemId, organizationId, customerId },
            select: { id: true },
          })
        : kind === "address"
          ? await this.database.customerAddress.findFirst({
              where: { id: itemId, organizationId, customerId },
              select: { id: true },
            })
          : await this.database.asset.findFirst({
              where: { id: itemId, organizationId, customerId },
              select: { id: true },
            });
    if (!exists) throw new NotFoundException("Kayıt bulunamadı");
    return this.database.$transaction(async (tx) => {
      const item = await mutation(tx);
      await this.writeChildAudit(
        tx,
        organizationId,
        actorId,
        `${kind}.updated`,
        kind === "contact"
          ? "CustomerContact"
          : kind === "address"
            ? "CustomerAddress"
            : "Asset",
        itemId,
        customerId,
        request,
      );
      return item;
    });
  }

  private writeChildAudit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorId: string,
    action: string,
    entity: string,
    entityId: string,
    customerId: string,
    request: Request,
  ) {
    return this.audit.write(
      {
        organizationId,
        actorId,
        action,
        entity,
        entityId,
        metadata: { customerId },
        ...requestMeta(request),
      },
      tx,
    );
  }
}
