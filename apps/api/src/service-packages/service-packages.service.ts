import {
  ConflictException,
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
  CreateFamilyInput,
  CreatePackageInput,
  FamilyListInput,
  PackageListInput,
  ReplaceItemsInput,
  UpdateFamilyInput,
  UpdatePackageInput,
} from "./service-packages.schemas";

const itemSelect = {
  catalogItemId: true,
  quantity: true,
  addon: true,
  shared: true,
  catalogItem: {
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      listPriceMinor: true,
      vatRateBps: true,
      active: true,
    },
  },
} satisfies Prisma.ServicePackageItemSelect;

const packageSelect = {
  id: true,
  familyId: true,
  tier: true,
  key: true,
  name: true,
  description: true,
  priceMinor: true,
  vatRateBps: true,
  active: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  items: { select: itemSelect, orderBy: [{ catalogItemId: "asc" as const }] },
} satisfies Prisma.ServicePackageSelect;

const familySelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  active: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  packages: {
    select: packageSelect,
    orderBy: [{ tier: "asc" as const }, { name: "asc" as const }],
  },
} satisfies Prisma.ServicePackageFamilySelect;

@Injectable()
export class ServicePackagesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // --- Aileler -------------------------------------------------------------

  async listFamilies(organizationId: string, input: FamilyListInput) {
    const where: Prisma.ServicePackageFamilyWhereInput = {
      organizationId,
      ...(input.status !== "ALL" ? { active: input.status === "ACTIVE" } : {}),
      ...(input.search
        ? {
            OR: [
              { key: { contains: input.search, mode: "insensitive" } },
              { name: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.servicePackageFamily.findMany({
        where,
        select: familySelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.servicePackageFamily.count({ where }),
    ]);
    return { items, pagination: this.paginate(input, total) };
  }

  async getFamily(organizationId: string, familyId: string) {
    const family = await this.database.servicePackageFamily.findFirst({
      where: { id: familyId, organizationId },
      select: familySelect,
    });
    if (!family) throw new NotFoundException("Paket ailesi bulunamadı");
    return family;
  }

  async createFamily(
    organizationId: string,
    actorId: string,
    input: CreateFamilyInput,
    request: Request,
  ) {
    return this.database.$transaction(async (tx) => {
      await this.assertKeyFree(tx, organizationId, "family", input.key);
      const family = await tx.servicePackageFamily.create({
        data: {
          organizationId,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
        },
        select: familySelect,
      });
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package-family.created",
        entity: "ServicePackageFamily",
        entityId: family.id,
        metadata: { key: family.key },
      });
      return family;
    });
  }

  async updateFamily(
    organizationId: string,
    actorId: string,
    familyId: string,
    input: UpdateFamilyInput,
    request: Request,
  ) {
    const existing = await this.database.servicePackageFamily.findFirst({
      where: { id: familyId, organizationId },
      select: { id: true, key: true },
    });
    if (!existing) throw new NotFoundException("Paket ailesi bulunamadı");
    return this.database.$transaction(async (tx) => {
      if (input.key && input.key !== existing.key)
        await this.assertKeyFree(
          tx,
          organizationId,
          "family",
          input.key,
          familyId,
        );
      const updated = await tx.servicePackageFamily.updateMany({
        where: { id: familyId, organizationId, version: input.version },
        data: {
          key: input.key,
          name: input.name,
          description: input.description,
          active: input.active,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Paket ailesi başka bir kullanıcı tarafından güncellendi",
        );
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package-family.updated",
        entity: "ServicePackageFamily",
        entityId: familyId,
        metadata: { previousVersion: input.version },
      });
      return tx.servicePackageFamily.findUniqueOrThrow({
        where: { id: familyId },
        select: familySelect,
      });
    });
  }

  /**
   * Ailenin ortak satırlarını değiştirir ve sonucu ailedeki tüm paketlere
   * `shared = true` olarak yazar. Pakete özel satırlar (`shared = false`)
   * korunur; aynı katalog kalemi hem ortak hem pakete özel olamayacağı için
   * çakışan pakete özel satır ortak satıra devredilir.
   */
  async replaceFamilySharedItems(
    organizationId: string,
    actorId: string,
    familyId: string,
    input: ReplaceItemsInput,
    request: Request,
  ) {
    const family = await this.database.servicePackageFamily.findFirst({
      where: { id: familyId, organizationId },
      select: { id: true, packages: { select: { id: true } } },
    });
    if (!family) throw new NotFoundException("Paket ailesi bulunamadı");
    await this.assertCatalogItems(organizationId, input.items);
    return this.database.$transaction(async (tx) => {
      const updated = await tx.servicePackageFamily.updateMany({
        where: { id: familyId, organizationId, version: input.version },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Paket ailesi başka bir kullanıcı tarafından güncellendi",
        );
      const packageIds = family.packages.map((item) => item.id);
      await tx.servicePackageItem.deleteMany({
        where: { organizationId, packageId: { in: packageIds }, shared: true },
      });
      for (const packageId of packageIds) {
        // Aynı katalog kalemi pakete özel satır olarak duruyorsa ortak satır
        // onun yerini alır; composite primary key ikisine birden izin vermez.
        await tx.servicePackageItem.deleteMany({
          where: {
            organizationId,
            packageId,
            catalogItemId: {
              in: input.items.map((item) => item.catalogItemId),
            },
          },
        });
        await tx.servicePackageItem.createMany({
          data: input.items.map((item) => ({
            organizationId,
            packageId,
            catalogItemId: item.catalogItemId,
            quantity: new Prisma.Decimal(item.quantity),
            addon: item.addon,
            shared: true,
          })),
        });
      }
      // Ortak satır listesi değişince paketlerin içeriği de değişmiş olur;
      // sürümleri artırılmazsa elinde eski paketi tutan bir istemci
      // değişiklikten habersiz kaydetmeye devam ederdi.
      await tx.servicePackage.updateMany({
        where: { organizationId, id: { in: packageIds } },
        data: { version: { increment: 1 } },
      });
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package-family.shared-items-replaced",
        entity: "ServicePackageFamily",
        entityId: familyId,
        metadata: {
          itemCount: input.items.length,
          packageCount: packageIds.length,
        },
      });
      return tx.servicePackageFamily.findUniqueOrThrow({
        where: { id: familyId },
        select: familySelect,
      });
    });
  }

  // --- Paketler ------------------------------------------------------------

  async listPackages(organizationId: string, input: PackageListInput) {
    const where: Prisma.ServicePackageWhereInput = {
      organizationId,
      ...(input.familyId ? { familyId: input.familyId } : {}),
      ...(input.status !== "ALL" ? { active: input.status === "ACTIVE" } : {}),
      ...(input.search
        ? {
            OR: [
              { key: { contains: input.search, mode: "insensitive" } },
              { name: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.servicePackage.findMany({
        where,
        select: packageSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.servicePackage.count({ where }),
    ]);
    return { items, pagination: this.paginate(input, total) };
  }

  async getPackage(organizationId: string, packageId: string) {
    const item = await this.database.servicePackage.findFirst({
      where: { id: packageId, organizationId },
      select: packageSelect,
    });
    if (!item) throw new NotFoundException("Paket bulunamadı");
    return item;
  }

  async createPackage(
    organizationId: string,
    actorId: string,
    input: CreatePackageInput,
    request: Request,
  ) {
    const familyId = input.familyId ?? null;
    const tier = input.tier ?? null;
    this.assertFamilyTierPair(familyId, tier);
    return this.database.$transaction(async (tx) => {
      await this.assertKeyFree(tx, organizationId, "package", input.key);
      await this.assertTierFree(tx, organizationId, familyId, tier);
      const sharedItems = familyId
        ? await this.familySharedItems(tx, organizationId, familyId)
        : [];
      const created = await tx.servicePackage.create({
        data: {
          organizationId,
          familyId,
          tier,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          priceMinor: input.priceMinor,
          vatRateBps: input.vatRateBps,
        },
        select: { id: true },
      });
      // Aileye katılan paket ortak satırları doğrudan devralır; aksi hâlde
      // aile bir daha düzenlenene kadar eksik satırlarla kalırdı. Satırlar
      // paketten ayrı yazılır: `organizationId` hem pakete hem katalog
      // kalemine giden composite ilişkinin parçası olduğu için iç içe
      // `createMany` içinde verilemiyor.
      if (sharedItems.length)
        await tx.servicePackageItem.createMany({
          data: sharedItems.map((item) => ({ ...item, packageId: created.id })),
        });
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package.created",
        entity: "ServicePackage",
        entityId: created.id,
        metadata: { key: input.key, tier },
      });
      return tx.servicePackage.findUniqueOrThrow({
        where: { id: created.id },
        select: packageSelect,
      });
    });
  }

  async updatePackage(
    organizationId: string,
    actorId: string,
    packageId: string,
    input: UpdatePackageInput,
    request: Request,
  ) {
    const existing = await this.database.servicePackage.findFirst({
      where: { id: packageId, organizationId },
      select: { id: true, key: true, familyId: true, tier: true },
    });
    if (!existing) throw new NotFoundException("Paket bulunamadı");
    const familyId =
      input.familyId === undefined ? existing.familyId : input.familyId;
    const tier = input.tier === undefined ? existing.tier : input.tier;
    this.assertFamilyTierPair(familyId, tier);
    return this.database.$transaction(async (tx) => {
      if (input.key && input.key !== existing.key)
        await this.assertKeyFree(
          tx,
          organizationId,
          "package",
          input.key,
          packageId,
        );
      if (familyId !== existing.familyId || tier !== existing.tier)
        await this.assertTierFree(
          tx,
          organizationId,
          familyId,
          tier,
          packageId,
        );
      const updated = await tx.servicePackage.updateMany({
        where: { id: packageId, organizationId, version: input.version },
        data: {
          familyId,
          tier,
          key: input.key,
          name: input.name,
          description: input.description,
          priceMinor: input.priceMinor,
          vatRateBps: input.vatRateBps,
          active: input.active,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Paket başka bir kullanıcı tarafından güncellendi",
        );
      if (familyId !== existing.familyId)
        await this.resyncSharedItems(tx, organizationId, packageId, familyId);
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package.updated",
        entity: "ServicePackage",
        entityId: packageId,
        metadata: { previousVersion: input.version },
      });
      return tx.servicePackage.findUniqueOrThrow({
        where: { id: packageId },
        select: packageSelect,
      });
    });
  }

  /** Yalnızca pakete özel satırları değiştirir; ortak satırlara dokunmaz. */
  async replacePackageItems(
    organizationId: string,
    actorId: string,
    packageId: string,
    input: ReplaceItemsInput,
    request: Request,
  ) {
    const existing = await this.database.servicePackage.findFirst({
      where: { id: packageId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Paket bulunamadı");
    await this.assertCatalogItems(organizationId, input.items);
    const shared = await this.database.servicePackageItem.findMany({
      where: { organizationId, packageId, shared: true },
      select: { catalogItemId: true },
    });
    const sharedIds = new Set(shared.map((item) => item.catalogItemId));
    const clashing = input.items.find((item) =>
      sharedIds.has(item.catalogItemId),
    );
    if (clashing)
      throw new ConflictException(
        "Bu katalog kalemi ailenin ortak satırlarında zaten var",
      );
    return this.database.$transaction(async (tx) => {
      const updated = await tx.servicePackage.updateMany({
        where: { id: packageId, organizationId, version: input.version },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Paket başka bir kullanıcı tarafından güncellendi",
        );
      await tx.servicePackageItem.deleteMany({
        where: { organizationId, packageId, shared: false },
      });
      await tx.servicePackageItem.createMany({
        data: input.items.map((item) => ({
          organizationId,
          packageId,
          catalogItemId: item.catalogItemId,
          quantity: new Prisma.Decimal(item.quantity),
          addon: item.addon,
          shared: false,
        })),
      });
      await this.write(tx, organizationId, actorId, request, {
        action: "service-package.items-replaced",
        entity: "ServicePackage",
        entityId: packageId,
        metadata: { itemCount: input.items.length },
      });
      return tx.servicePackage.findUniqueOrThrow({
        where: { id: packageId },
        select: packageSelect,
      });
    });
  }

  archivePackage(
    organizationId: string,
    actorId: string,
    packageId: string,
    request: Request,
  ) {
    return this.setPackageActive(
      organizationId,
      actorId,
      packageId,
      false,
      request,
    );
  }

  restorePackage(
    organizationId: string,
    actorId: string,
    packageId: string,
    request: Request,
  ) {
    return this.setPackageActive(
      organizationId,
      actorId,
      packageId,
      true,
      request,
    );
  }

  // --- Yardımcılar ---------------------------------------------------------

  private paginate(input: { page: number; pageSize: number }, total: number) {
    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pages: Math.max(1, Math.ceil(total / input.pageSize)),
    };
  }

  private assertFamilyTierPair(familyId: string | null, tier: string | null) {
    // Seviye yalnızca bir aile içinde anlamlıdır; ailesiz bir "Premium" paket
    // hangi üçlünün parçası olduğunu söylemez.
    if ((familyId === null) !== (tier === null))
      throw new ConflictException(
        "Aile ve seviye birlikte verilmelidir; ikisi de boş bırakılabilir",
      );
  }

  private async assertKeyFree(
    tx: Prisma.TransactionClient,
    organizationId: string,
    kind: "family" | "package",
    key: string,
    exceptId?: string,
  ) {
    const where = {
      organizationId,
      key,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    };
    const clash =
      kind === "family"
        ? await tx.servicePackageFamily.findFirst({
            where,
            select: { id: true },
          })
        : await tx.servicePackage.findFirst({ where, select: { id: true } });
    if (clash) throw new ConflictException("Bu anahtar zaten kullanılıyor");
  }

  /**
   * Bir ailede her seviyeden yalnızca bir paket olur. Veritabanındaki unique
   * kısıt bunu zaten garanti ediyor, ama ihlali oraya bırakmak istemciye 500
   * döndürürdü; kontrol burada yapılıp anlaşılır bir 409 üretilir.
   */
  private async assertTierFree(
    tx: Prisma.TransactionClient,
    organizationId: string,
    familyId: string | null,
    tier: string | null,
    exceptId?: string,
  ) {
    if (!familyId || !tier) return;
    const clash = await tx.servicePackage.findFirst({
      where: {
        organizationId,
        familyId,
        tier: tier as Prisma.EnumServicePackageTierNullableFilter["equals"],
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash)
      throw new ConflictException("Bu ailede bu seviyede zaten bir paket var");
  }

  private async assertCatalogItems(
    organizationId: string,
    items: ReplaceItemsInput["items"],
  ) {
    const ids = [...new Set(items.map((item) => item.catalogItemId))];
    if (ids.length !== items.length)
      throw new ConflictException("Aynı katalog kalemi iki kez eklenemez");
    if (!ids.length) return;
    const found = await this.database.catalogItem.count({
      where: { organizationId, id: { in: ids } },
    });
    if (found !== ids.length)
      throw new NotFoundException("Katalog kalemi bulunamadı");
  }

  private async familySharedItems(
    tx: Prisma.TransactionClient,
    organizationId: string,
    familyId: string,
  ) {
    const family = await tx.servicePackageFamily.findFirst({
      where: { id: familyId, organizationId },
      select: { packages: { select: { id: true }, take: 1 } },
    });
    if (!family) throw new NotFoundException("Paket ailesi bulunamadı");
    const source = family.packages[0];
    if (!source) return [];
    const items = await tx.servicePackageItem.findMany({
      where: { organizationId, packageId: source.id, shared: true },
      select: { catalogItemId: true, quantity: true, addon: true },
    });
    return items.map((item) => ({
      organizationId,
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
      addon: item.addon,
      shared: true,
    }));
  }

  private async resyncSharedItems(
    tx: Prisma.TransactionClient,
    organizationId: string,
    packageId: string,
    familyId: string | null,
  ) {
    await tx.servicePackageItem.deleteMany({
      where: { organizationId, packageId, shared: true },
    });
    if (!familyId) return;
    const shared = await this.familySharedItems(tx, organizationId, familyId);
    if (!shared.length) return;
    const own = await tx.servicePackageItem.findMany({
      where: { organizationId, packageId },
      select: { catalogItemId: true },
    });
    const owned = new Set(own.map((item) => item.catalogItemId));
    await tx.servicePackageItem.createMany({
      data: shared
        .filter((item) => !owned.has(item.catalogItemId))
        .map((item) => ({ ...item, packageId })),
    });
  }

  private async setPackageActive(
    organizationId: string,
    actorId: string,
    packageId: string,
    active: boolean,
    request: Request,
  ) {
    const existing = await this.database.servicePackage.findFirst({
      where: { id: packageId, organizationId },
      select: { id: true, active: true },
    });
    if (!existing) throw new NotFoundException("Paket bulunamadı");
    return this.database.$transaction(async (tx) => {
      const item = await tx.servicePackage.update({
        where: { id: packageId },
        data: { active, version: { increment: 1 } },
        select: packageSelect,
      });
      await this.write(tx, organizationId, actorId, request, {
        action: active
          ? "service-package.restored"
          : "service-package.archived",
        entity: "ServicePackage",
        entityId: packageId,
        metadata: { previousActive: existing.active },
      });
      return item;
    });
  }

  private write(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorId: string,
    request: Request,
    entry: {
      action: string;
      entity: string;
      entityId: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    return this.audit.write(
      { organizationId, actorId, ...entry, ...requestMeta(request) },
      tx,
    );
  }
}
