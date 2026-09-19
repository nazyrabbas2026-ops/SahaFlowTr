import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import { priceLine, summarizeLines } from "@sahaflow/domain";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { allocateDocumentNumber } from "../common/document-number";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";
import type {
  CreateQuoteInput,
  QuoteListInput,
  ReplaceLinesInput,
  ReplaceOptionsInput,
  SelectOptionInput,
  UpdateQuoteInput,
} from "./quotes.schemas";

const QUOTE_SERIES = "TEK";

const lineSelect = {
  id: true,
  optionId: true,
  position: true,
  kind: true,
  catalogItemId: true,
  name: true,
  description: true,
  unit: true,
  quantity: true,
  unitPriceMinor: true,
  discountBps: true,
  vatRateBps: true,
  lineTotalMinor: true,
  vatMinor: true,
} satisfies Prisma.QuoteLineSelect;

const quoteSelect = {
  id: true,
  quoteNumber: true,
  status: true,
  customerId: true,
  jobId: true,
  convertedJobId: true,
  selectedOptionId: true,
  title: true,
  description: true,
  terms: true,
  validUntil: true,
  versionNumber: true,
  subtotalMinor: true,
  discountMinor: true,
  vatMinor: true,
  totalMinor: true,
  currency: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, displayName: true, customerNumber: true } },
  options: {
    select: {
      id: true,
      tier: true,
      name: true,
      description: true,
      position: true,
      packageId: true,
      subtotalMinor: true,
      vatMinor: true,
      totalMinor: true,
    },
    orderBy: [{ position: "asc" as const }],
  },
  lines: { select: lineSelect, orderBy: [{ position: "asc" as const }] },
} satisfies Prisma.QuoteSelect;

const TIER_POSITION: Record<string, number> = {
  ECONOMY: 0,
  RECOMMENDED: 1,
  PREMIUM: 2,
};

/** `Decimal(12,3)` miktarı `money.ts`'in beklediği binde bir birime çevirir. */
function toQuantityMilli(quantity: Prisma.Decimal | string): bigint {
  return BigInt(new Prisma.Decimal(quantity).mul(1000).toFixed(0));
}

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, input: QuoteListInput) {
    const where: Prisma.QuoteWhereInput = {
      organizationId,
      ...(input.status !== "ALL" ? { status: input.status } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.search
        ? {
            OR: [
              { quoteNumber: { contains: input.search, mode: "insensitive" } },
              { title: { contains: input.search, mode: "insensitive" } },
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
      this.database.quote.findMany({
        where,
        select: quoteSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.quote.count({ where }),
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

  async get(organizationId: string, quoteId: string) {
    const quote = await this.database.quote.findFirst({
      where: { id: quoteId, organizationId },
      select: quoteSelect,
    });
    if (!quote) throw new NotFoundException("Teklif bulunamadı");
    return quote;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateQuoteInput,
    request: Request,
  ) {
    return this.database.$transaction(async (tx) => {
      // Kota kontrolü ile ekleme arasında başka bir isteğin araya girmemesi
      // için tenant satırı kilitlenir; kota backend-authoritative'dir (ADR-009).
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
      const entitlement = await tx.planEntitlement.findFirst({
        where: {
          featureKey: "sales.quotes",
          enabled: true,
          plan: {
            subscriptions: { some: { organizationId, status: "active" } },
          },
        },
        select: { limitValue: true },
      });
      if (!entitlement)
        throw new ForbiddenException("Teklif mevcut planınızda etkin değil");
      if (
        entitlement.limitValue !== null &&
        (await tx.quote.count({ where: { organizationId } })) >=
          entitlement.limitValue
      )
        throw new ForbiddenException("Teklif kotası doldu");
      await this.assertCustomer(tx, organizationId, input.customerId);
      if (input.jobId) await this.assertJob(tx, organizationId, input.jobId);
      const quote = await tx.quote.create({
        data: {
          organizationId,
          customerId: input.customerId,
          jobId: input.jobId ?? null,
          quoteNumber: await allocateDocumentNumber(
            tx,
            organizationId,
            QUOTE_SERIES,
          ),
          title: input.title,
          description: input.description ?? null,
          terms: input.terms ?? null,
          validUntil: new Date(input.validUntil),
          discountMinor: input.discountMinor ?? 0n,
          createdByUserId: actorId,
        },
        select: { id: true, quoteNumber: true },
      });
      await this.write(tx, organizationId, actorId, request, {
        action: "quote.created",
        entityId: quote.id,
        metadata: { quoteNumber: quote.quoteNumber },
      });
      return tx.quote.findUniqueOrThrow({
        where: { id: quote.id },
        select: quoteSelect,
      });
    });
  }

  async update(
    organizationId: string,
    actorId: string,
    quoteId: string,
    input: UpdateQuoteInput,
    request: Request,
  ) {
    const existing = await this.loadDraft(organizationId, quoteId);
    return this.database.$transaction(async (tx) => {
      if (input.customerId && input.customerId !== existing.customerId)
        await this.assertCustomer(tx, organizationId, input.customerId);
      if (input.jobId) await this.assertJob(tx, organizationId, input.jobId);
      const updated = await tx.quote.updateMany({
        where: { id: quoteId, organizationId, version: input.version },
        data: {
          customerId: input.customerId,
          jobId: input.jobId,
          title: input.title,
          description: input.description,
          terms: input.terms,
          discountMinor: input.discountMinor,
          ...(input.validUntil
            ? { validUntil: new Date(input.validUntil) }
            : {}),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw this.staleConflict();
      await this.recalculate(tx, organizationId, quoteId);
      await this.write(tx, organizationId, actorId, request, {
        action: "quote.updated",
        entityId: quoteId,
        metadata: { previousVersion: input.version },
      });
      return tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        select: quoteSelect,
      });
    });
  }

  /**
   * Seçenek kümesini bütün olarak değiştirir. Seçeneğe bağlı satırlar
   * seçeneklerle birlikte silinir (cascade); ortak satırlara dokunulmaz.
   * `packageId` verilen seçeneğin satırları paketten snapshot olarak üretilir:
   * fiyat ve KDV o anki katalog değerleriyle dondurulur, katalog sonradan
   * değişse de teklif değişmez.
   */
  async replaceOptions(
    organizationId: string,
    actorId: string,
    quoteId: string,
    input: ReplaceOptionsInput,
    request: Request,
  ) {
    await this.loadDraft(organizationId, quoteId);
    const tiers = input.options.map((option) => option.tier);
    if (new Set(tiers).size !== tiers.length)
      throw new ConflictException("Aynı seviye iki kez verilemez");
    return this.database.$transaction(async (tx) => {
      const updated = await tx.quote.updateMany({
        where: { id: quoteId, organizationId, version: input.version },
        // Seçenekler silinmeden önce seçim boşaltılır; aksi hâlde foreign key
        // hâlâ silinecek satıra işaret ediyor olurdu.
        data: { selectedOptionId: null, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.staleConflict();
      await tx.quoteOption.deleteMany({ where: { organizationId, quoteId } });
      for (const option of input.options) {
        const created = await tx.quoteOption.create({
          data: {
            organizationId,
            quoteId,
            tier: option.tier,
            name: option.name,
            description: option.description ?? null,
            position: TIER_POSITION[option.tier] ?? 0,
            packageId: option.packageId ?? null,
          },
          select: { id: true },
        });
        if (option.packageId)
          await this.createLinesFromPackage(
            tx,
            organizationId,
            quoteId,
            created.id,
            option.packageId,
          );
      }
      await this.recalculate(tx, organizationId, quoteId);
      await this.write(tx, organizationId, actorId, request, {
        action: "quote.options-replaced",
        entityId: quoteId,
        metadata: { optionCount: input.options.length },
      });
      return tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        select: quoteSelect,
      });
    });
  }

  async replaceLines(
    organizationId: string,
    actorId: string,
    quoteId: string,
    input: ReplaceLinesInput,
    request: Request,
  ) {
    await this.loadDraft(organizationId, quoteId);
    const options = await this.database.quoteOption.findMany({
      where: { organizationId, quoteId },
      select: { id: true },
    });
    const optionIds = new Set(options.map((option) => option.id));
    for (const line of input.lines)
      if (line.optionId && !optionIds.has(line.optionId))
        throw new NotFoundException("Teklif seçeneği bulunamadı");
    return this.database.$transaction(async (tx) => {
      const updated = await tx.quote.updateMany({
        where: { id: quoteId, organizationId, version: input.version },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.staleConflict();
      await tx.quoteLine.deleteMany({ where: { organizationId, quoteId } });
      let position = 0;
      for (const line of input.lines) {
        // Satır toplamı ve KDV'si burada hesaplanmaz; tek kaynak
        // `packages/domain/src/money.ts` içindeki `priceLine`.
        const priced = priceLine({
          unitPriceMinor: line.unitPriceMinor,
          quantityMilli: toQuantityMilli(line.quantity),
          discountBps: line.discountBps,
          vatRateBps: line.vatRateBps,
        });
        await tx.quoteLine.create({
          data: {
            organizationId,
            quoteId,
            optionId: line.optionId ?? null,
            position: position++,
            kind: line.kind,
            catalogItemId: line.catalogItemId ?? null,
            name: line.name,
            description: line.description ?? null,
            unit: line.unit,
            quantity: new Prisma.Decimal(line.quantity),
            unitPriceMinor: line.unitPriceMinor,
            discountBps: line.discountBps,
            vatRateBps: line.vatRateBps,
            lineTotalMinor: priced.lineTotalMinor,
            vatMinor: priced.vatMinor,
          },
        });
      }
      await this.recalculate(tx, organizationId, quoteId);
      await this.write(tx, organizationId, actorId, request, {
        action: "quote.lines-replaced",
        entityId: quoteId,
        metadata: { lineCount: input.lines.length },
      });
      return tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        select: quoteSelect,
      });
    });
  }

  async selectOption(
    organizationId: string,
    actorId: string,
    quoteId: string,
    input: SelectOptionInput,
    request: Request,
  ) {
    await this.loadDraft(organizationId, quoteId);
    if (input.optionId) {
      const option = await this.database.quoteOption.findFirst({
        where: { id: input.optionId, organizationId, quoteId },
        select: { id: true },
      });
      if (!option) throw new NotFoundException("Teklif seçeneği bulunamadı");
    }
    return this.database.$transaction(async (tx) => {
      const updated = await tx.quote.updateMany({
        where: { id: quoteId, organizationId, version: input.version },
        data: { selectedOptionId: input.optionId, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.staleConflict();
      await this.recalculate(tx, organizationId, quoteId);
      await this.write(tx, organizationId, actorId, request, {
        action: "quote.option-selected",
        entityId: quoteId,
        metadata: { optionId: input.optionId },
      });
      return tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        select: quoteSelect,
      });
    });
  }

  /**
   * Seçenek ve teklif toplamlarını satırlardan yeniden üretir.
   *
   * Bir seçeneğin toplamı ortak satırlar (optionId = null) ile kendi
   * satırlarının toplamıdır; teklifin toplamı ise ortak satırlar ile seçili
   * seçeneğin satırlarıdır. Seçim yapılmamışsa yalnızca ortak satırlar sayılır,
   * çünkü hangi seçeneğin satılacağı henüz belli değildir ve rastgele birini
   * saymak uydurma bir toplam üretirdi.
   */
  private async recalculate(
    tx: Prisma.TransactionClient,
    organizationId: string,
    quoteId: string,
  ) {
    const quote = await tx.quote.findUniqueOrThrow({
      where: { id: quoteId },
      select: { discountMinor: true, selectedOptionId: true },
    });
    const lines = await tx.quoteLine.findMany({
      where: { organizationId, quoteId },
      select: { optionId: true, lineTotalMinor: true, vatRateBps: true },
    });
    const options = await tx.quoteOption.findMany({
      where: { organizationId, quoteId },
      select: { id: true },
    });
    const common = lines.filter((line) => line.optionId === null);
    for (const option of options) {
      const totals = summarizeLines([
        ...common,
        ...lines.filter((line) => line.optionId === option.id),
      ]);
      await tx.quoteOption.update({
        where: { id: option.id },
        data: {
          subtotalMinor: totals.subtotalMinor,
          vatMinor: totals.vatMinor,
          totalMinor: totals.totalMinor,
        },
      });
    }
    const selected = quote.selectedOptionId
      ? lines.filter((line) => line.optionId === quote.selectedOptionId)
      : [];
    const totals = summarizeLines(
      [...common, ...selected],
      quote.discountMinor,
    );
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        vatMinor: totals.vatMinor,
        totalMinor: totals.totalMinor,
      },
    });
  }

  private async createLinesFromPackage(
    tx: Prisma.TransactionClient,
    organizationId: string,
    quoteId: string,
    optionId: string,
    packageId: string,
  ) {
    const servicePackage = await tx.servicePackage.findFirst({
      where: { id: packageId, organizationId },
      select: {
        items: {
          select: {
            quantity: true,
            addon: true,
            catalogItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                listPriceMinor: true,
                vatRateBps: true,
              },
            },
          },
        },
      },
    });
    if (!servicePackage) throw new NotFoundException("Paket bulunamadı");
    const last = await tx.quoteLine.aggregate({
      where: { organizationId, quoteId },
      _max: { position: true },
    });
    let position = (last._max.position ?? -1) + 1;
    for (const item of servicePackage.items) {
      const priced = priceLine({
        unitPriceMinor: item.catalogItem.listPriceMinor,
        quantityMilli: toQuantityMilli(item.quantity),
        vatRateBps: item.catalogItem.vatRateBps,
      });
      await tx.quoteLine.create({
        data: {
          organizationId,
          quoteId,
          optionId,
          position: position++,
          kind: item.addon ? "ADDON" : "SERVICE",
          catalogItemId: item.catalogItem.id,
          name: item.catalogItem.name,
          unit: item.catalogItem.unit,
          quantity: item.quantity,
          unitPriceMinor: item.catalogItem.listPriceMinor,
          vatRateBps: item.catalogItem.vatRateBps,
          lineTotalMinor: priced.lineTotalMinor,
          vatMinor: priced.vatMinor,
        },
      });
    }
  }

  /** Yalnızca taslak teklif düzenlenebilir; sonraki durumlar PR 5 kapsamında. */
  private async loadDraft(organizationId: string, quoteId: string) {
    const quote = await this.database.quote.findFirst({
      where: { id: quoteId, organizationId },
      select: { id: true, status: true, customerId: true },
    });
    if (!quote) throw new NotFoundException("Teklif bulunamadı");
    if (quote.status !== "DRAFT")
      throw new ConflictException("Yalnızca taslak teklif düzenlenebilir");
    return quote;
  }

  private staleConflict() {
    return new ConflictException(
      "Teklif başka bir kullanıcı tarafından güncellendi",
    );
  }

  private async assertCustomer(
    tx: Prisma.TransactionClient,
    organizationId: string,
    customerId: string,
  ) {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Müşteri bulunamadı");
  }

  private async assertJob(
    tx: Prisma.TransactionClient,
    organizationId: string,
    jobId: string,
  ) {
    const job = await tx.job.findFirst({
      where: { id: jobId, organizationId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException("İş emri bulunamadı");
  }

  private write(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorId: string,
    request: Request,
    entry: {
      action: string;
      entityId: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    return this.audit.write(
      {
        organizationId,
        actorId,
        entity: "Quote",
        ...entry,
        ...requestMeta(request),
      },
      tx,
    );
  }
}
