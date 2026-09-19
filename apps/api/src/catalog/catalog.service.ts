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
  CatalogItemListInput,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
} from "./catalog.schemas";

const itemSelect = {
  id: true,
  sku: true,
  name: true,
  kind: true,
  category: true,
  unit: true,
  listPriceMinor: true,
  costPriceMinor: true,
  vatRateBps: true,
  trackInventory: true,
  reorderPoint: true,
  serialized: true,
  active: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CatalogItemSelect;

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, input: CatalogItemListInput) {
    const where: Prisma.CatalogItemWhereInput = {
      organizationId,
      ...(input.kind !== "ALL" ? { kind: input.kind } : {}),
      ...(input.status !== "ALL" ? { active: input.status === "ACTIVE" } : {}),
      ...(input.search
        ? {
            OR: [
              { sku: { contains: input.search, mode: "insensitive" } },
              { name: { contains: input.search, mode: "insensitive" } },
              { category: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.catalogItem.findMany({
        where,
        select: itemSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.catalogItem.count({ where }),
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

  async get(organizationId: string, catalogItemId: string) {
    const item = await this.database.catalogItem.findFirst({
      where: { id: catalogItemId, organizationId },
      select: itemSelect,
    });
    if (!item) throw new NotFoundException("Katalog kalemi bulunamadı");
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateCatalogItemInput,
    request: Request,
  ) {
    return this.database.$transaction(async (tx) => {
      // Kota kontrolü ile ekleme arasında başka bir isteğin araya girmemesi
      // için tenant satırı kilitlenir; kota backend-authoritative'dir (ADR-009).
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
      const entitlement = await tx.planEntitlement.findFirst({
        where: {
          featureKey: "inventory.products",
          enabled: true,
          plan: {
            subscriptions: { some: { organizationId, status: "active" } },
          },
        },
        select: { limitValue: true },
      });
      if (!entitlement)
        throw new ForbiddenException("Katalog mevcut planınızda etkin değil");
      if (
        entitlement.limitValue !== null &&
        (await tx.catalogItem.count({ where: { organizationId } })) >=
          entitlement.limitValue
      )
        throw new ForbiddenException("Katalog kalemi kotası doldu");
      if (
        await tx.catalogItem.findFirst({
          where: { organizationId, sku: input.sku },
          select: { id: true },
        })
      )
        throw new ConflictException("Bu SKU zaten kullanılıyor");
      const item = await tx.catalogItem.create({
        data: {
          organizationId,
          sku: input.sku,
          name: input.name,
          kind: input.kind,
          category: input.category,
          unit: input.unit,
          listPriceMinor: input.listPriceMinor,
          costPriceMinor: input.costPriceMinor ?? 0n,
          vatRateBps: input.vatRateBps,
          trackInventory: input.trackInventory,
          reorderPoint: input.reorderPoint,
          serialized: input.serialized,
        },
        select: itemSelect,
      });
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: "catalog-item.created",
          entity: "CatalogItem",
          entityId: item.id,
          metadata: { sku: item.sku, kind: item.kind },
          ...requestMeta(request),
        },
        tx,
      );
      return item;
    });
  }

  async update(
    organizationId: string,
    actorId: string,
    catalogItemId: string,
    input: UpdateCatalogItemInput,
    request: Request,
  ) {
    const existing = await this.database.catalogItem.findFirst({
      where: { id: catalogItemId, organizationId },
      select: { id: true, sku: true },
    });
    if (!existing) throw new NotFoundException("Katalog kalemi bulunamadı");
    return this.database.$transaction(async (tx) => {
      if (input.sku && input.sku !== existing.sku) {
        const duplicate = await tx.catalogItem.findFirst({
          where: { organizationId, sku: input.sku, id: { not: catalogItemId } },
          select: { id: true },
        });
        if (duplicate) throw new ConflictException("Bu SKU zaten kullanılıyor");
      }
      const updated = await tx.catalogItem.updateMany({
        where: { id: catalogItemId, organizationId, version: input.version },
        data: {
          sku: input.sku,
          name: input.name,
          kind: input.kind,
          category: input.category,
          unit: input.unit,
          listPriceMinor: input.listPriceMinor,
          costPriceMinor: input.costPriceMinor,
          vatRateBps: input.vatRateBps,
          trackInventory: input.trackInventory,
          reorderPoint: input.reorderPoint,
          serialized: input.serialized,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Katalog kalemi başka bir kullanıcı tarafından güncellendi",
        );
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: "catalog-item.updated",
          entity: "CatalogItem",
          entityId: catalogItemId,
          metadata: { previousVersion: input.version },
          ...requestMeta(request),
        },
        tx,
      );
      return tx.catalogItem.findUniqueOrThrow({
        where: { id: catalogItemId },
        select: itemSelect,
      });
    });
  }

  archive(
    organizationId: string,
    actorId: string,
    catalogItemId: string,
    request: Request,
  ) {
    return this.setActive(
      organizationId,
      actorId,
      catalogItemId,
      false,
      request,
    );
  }

  restore(
    organizationId: string,
    actorId: string,
    catalogItemId: string,
    request: Request,
  ) {
    return this.setActive(
      organizationId,
      actorId,
      catalogItemId,
      true,
      request,
    );
  }

  /**
   * Katalog kalemi silinmez, pasife alınır: geçmiş teklif, fatura ve stok
   * hareketleri ona referans vermeye devam eder.
   */
  private async setActive(
    organizationId: string,
    actorId: string,
    catalogItemId: string,
    active: boolean,
    request: Request,
  ) {
    const existing = await this.database.catalogItem.findFirst({
      where: { id: catalogItemId, organizationId },
      select: { id: true, active: true },
    });
    if (!existing) throw new NotFoundException("Katalog kalemi bulunamadı");
    return this.database.$transaction(async (tx) => {
      const item = await tx.catalogItem.update({
        where: { id: catalogItemId },
        data: { active, version: { increment: 1 } },
        select: itemSelect,
      });
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: active ? "catalog-item.restored" : "catalog-item.archived",
          entity: "CatalogItem",
          entityId: catalogItemId,
          metadata: { previousActive: existing.active },
          ...requestMeta(request),
        },
        tx,
      );
      return item;
    });
  }
}
