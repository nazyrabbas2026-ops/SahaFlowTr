import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import cookieParser from "cookie-parser";
import EmbeddedPostgres from "embedded-postgres";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@sahaflow/database";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const port = 55_432;
const databaseName = "sahaflow_auth_test";
const password = "integration-test-password";
const databaseDir = resolve(tmpdir(), `sahaflow-postgres-auth-${Date.now()}`);
let postgres: EmbeddedPostgres;
let app: INestApplication;
let database: PrismaClient;

async function applyMigrations() {
  const client = postgres.getPgClient(databaseName);
  await client.connect();
  for (const migration of [
    "202609130001_foundation",
    "202609130002_auth_rbac",
    "202609140001_workspace_shell",
    "202609140002_onboarding_member_delete_policy",
    "202609140003_crm_customers",
    "20260914125354_jobs",
    "20260915122624_field_service_operations",
    "20260918105223_service_agreements",
    "20260919112455_money_bigint_vat_bps",
    "20260919114244_catalog_item_version",
    "20260919121520_service_package_families",
    "20260919144338_quote_options",
  ]) {
    const sql = await readFile(
      resolve(
        "packages/database/prisma/migrations",
        migration,
        "migration.sql",
      ),
      "utf8",
    );
    await client.query(sql);
  }
  await client.end();
}

function cookieValue(headers: string[] | undefined, name: string) {
  const cookie = headers?.find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) throw new Error(`${name} cookie bulunamadı`);
  return cookie.split(";", 1)[0];
}

describe("auth, organization and tenant isolation", () => {
  beforeAll(async () => {
    postgres = new EmbeddedPostgres({
      databaseDir,
      port,
      user: "postgres",
      password,
      persistent: true,
      initdbFlags: ["--no-locale", "--encoding=UTF8"],
      onLog: () => undefined,
      onError: () => undefined,
    });
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);
    process.env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:${port}/${databaseName}?schema=public`;
    process.env.JWT_ACCESS_SECRET =
      "test-access-secret-with-at-least-32-characters";
    process.env.REFRESH_TOKEN_PEPPER =
      "test-refresh-pepper-with-at-least-32-characters";
    process.env.WEB_ORIGIN = "http://localhost:3000";
    process.env.FIELD_ENCRYPTION_KEY =
      "integration-sensitive-field-key-with-32-chars";
    await applyMigrations();
    const { AppModule } = await import("../src/app.module");
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    await app.init();
    database = new PrismaClient();
  });

  afterAll(async () => {
    await database?.$disconnect();
    await app?.close();
    await postgres?.stop();
    await rm(databaseDir, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 150,
    });
  });

  it("validates registration input", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.10")
      .send({
        name: "A",
        email: "bozuk",
        password: "kısa",
        organizationName: "X",
      })
      .expect(400);
  });

  it("creates isolated organizations, enforces RBAC and rotates refresh sessions", async () => {
    const ownerA = request.agent(app.getHttpServer());
    const ownerB = request.agent(app.getHttpServer());
    const first = await ownerA
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.11")
      .send({
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        password: "GuvenliParola2026",
        organizationName: "Akdeniz Teknik Servis",
      })
      .expect(201);
    const second = await ownerB
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.12")
      .send({
        name: "Bora Demir",
        email: "bora@example.com",
        password: "GuvenliParola2027",
        organizationName: "Toros Saha Hizmetleri",
      })
      .expect(201);
    const organizationA = first.body.organizations[0].id as string;
    const organizationB = second.body.organizations[0].id as string;

    const workspace = await ownerA
      .get(`/api/v1/organizations/${organizationA}/workspace`)
      .expect(200);
    expect(workspace.body).toMatchObject({
      organization: { id: organizationA },
      plan: { key: "starter", status: "active" },
      metrics: { members: 1, unreadNotifications: 1 },
    });
    expect(workspace.body.onboarding).toHaveLength(6);
    expect(workspace.body.membership.permissions).toEqual(
      expect.arrayContaining([
        "workspace.read",
        "notification.read",
        "onboarding.read",
      ]),
    );

    const notifications = await ownerA
      .get(`/api/v1/organizations/${organizationA}/notifications`)
      .query({ page: 1, pageSize: 10, status: "unread" })
      .expect(200);
    expect(notifications.body.pagination).toMatchObject({ total: 1, page: 1 });
    await ownerA
      .patch(
        `/api/v1/organizations/${organizationA}/notifications/${notifications.body.items[0].id as string}`,
      )
      .send({ read: true })
      .expect(200);
    await database.planEntitlement.update({
      where: {
        planId_featureKey: {
          planId: "plan_starter",
          featureKey: "notifications",
        },
      },
      data: { enabled: false },
    });
    await ownerA
      .get(`/api/v1/organizations/${organizationA}/notifications`)
      .expect(403);
    await database.planEntitlement.update({
      where: {
        planId_featureKey: {
          planId: "plan_starter",
          featureKey: "notifications",
        },
      },
      data: { enabled: true },
    });
    await ownerB
      .get(`/api/v1/organizations/${organizationA}/workspace`)
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.13")
      .send({
        name: "Başka Ayşe",
        email: "ayse@example.com",
        password: "GuvenliParola2028",
        organizationName: "Başka Firma",
      })
      .expect(409);

    await ownerA.get(`/api/v1/organizations/${organizationA}`).expect(200);
    await ownerA.get(`/api/v1/organizations/${organizationB}`).expect(403);

    const roleResponse = await ownerA
      .post(`/api/v1/organizations/${organizationA}/roles`)
      .send({ name: "Gözlemci", permissions: ["organization.read"] })
      .expect(201);
    const roleId = roleResponse.body.id as string;
    await ownerA
      .post(`/api/v1/organizations/${organizationA}/members`)
      .send({ email: "bora@example.com", roleId })
      .expect(201);
    await ownerB.get(`/api/v1/organizations/${organizationA}`).expect(200);
    await ownerB
      .get(`/api/v1/organizations/${organizationA}/members`)
      .expect(403);

    const wrongTenantRole = await database.role.findFirstOrThrow({
      where: { organizationId: organizationB },
    });
    await ownerA
      .patch(
        `/api/v1/organizations/${organizationA}/members/${(await database.organizationMember.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: organizationA, userId: second.body.user.id as string } } })).id}`,
      )
      .send({ roleId: wrongTenantRole.id })
      .expect(404);

    const sessionsBefore = await database.refreshSession.findMany({
      where: { userId: first.body.user.id as string },
      orderBy: { createdAt: "asc" },
    });
    expect(sessionsBefore).toHaveLength(1);
    const originalRawCookie = cookieValue(
      first.headers["set-cookie"],
      "refresh_token",
    );
    await ownerA.post("/api/v1/auth/refresh").expect(201);
    expect(
      await database.refreshSession.count({
        where: { familyId: sessionsBefore[0]!.familyId },
      }),
    ).toBe(2);
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", originalRawCookie)
      .expect(401);
    expect(
      await database.refreshSession.count({
        where: { familyId: sessionsBefore[0]!.familyId, revokedAt: null },
      }),
    ).toBe(0);
    await ownerA.get("/api/v1/auth/me").expect(401);

    await ownerB.post("/api/v1/auth/logout").expect(201);
    await ownerB.get("/api/v1/auth/me").expect(401);

    const auditActions = await database.auditLog.findMany({
      where: { organizationId: organizationA },
      select: { action: true },
    });
    expect(auditActions.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "auth.registered",
        "role.created",
        "member.created",
        "auth.refresh_replay",
      ]),
    );
    expect(
      await database.auditLog.count({
        where: { organizationId: organizationB, action: "auth.logout" },
      }),
    ).toBe(1);
  });

  it("uses a generic login error", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "unknown@example.com", password: "YanlisParola123" })
      .expect(401);
    expect(response.body.message).toBe("E-posta veya parola hatalı");
  });

  it("provides tenant-scoped customer 360 CRUD with optimistic updates", async () => {
    const ownerA = request.agent(app.getHttpServer());
    const ownerB = request.agent(app.getHttpServer());
    const registrationA = await ownerA
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.14")
      .send({
        name: "CRM Sahibi A",
        email: "crm-owner-a@example.com",
        password: "GuvenliParola2030",
        organizationName: "CRM Organizasyonu A",
      })
      .expect(201);
    const registrationB = await ownerB
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.15")
      .send({
        name: "CRM Sahibi B",
        email: "crm-owner-b@example.com",
        password: "GuvenliParola2031",
        organizationName: "CRM Organizasyonu B",
      })
      .expect(201);
    const organizationA = registrationA.body.organizations[0].id as string;
    const organizationB = registrationB.body.organizations[0].id as string;

    const createdA = await ownerA
      .post(`/api/v1/organizations/${organizationA}/customers`)
      .send({
        type: "INDIVIDUAL",
        firstName: "Deniz",
        lastName: "Yılmaz",
        primaryPhone: "+905551112233",
        email: "deniz@example.com",
        nationalId: "10000000146",
        tags: ["VIP"],
      })
      .expect(201);
    const customerA = createdA.body.id as string;
    expect(createdA.body.customerNumber).toBe("MUS-000001");

    const createdB = await ownerB
      .post(`/api/v1/organizations/${organizationB}/customers`)
      .send({
        type: "COMPANY",
        companyName: "Diğer Tenant A.Ş.",
        tags: [],
      })
      .expect(201);
    const customerB = createdB.body.id as string;

    // Web formu boş bırakılan iletişim alanlarını `null` gönderir; create
    // şeması bir dönem yalnızca `undefined` kabul ettiği için bu istek 400
    // dönüyordu ve müşteri oluşturma gerçek API'ye karşı kırıktı.
    const blankContact = await ownerA
      .post(`/api/v1/organizations/${organizationA}/customers`)
      .send({
        type: "INDIVIDUAL",
        firstName: "Boş",
        lastName: "İletişim",
        primaryPhone: null,
        alternatePhone: null,
        email: null,
        tags: [],
      })
      .expect(201);
    expect(blankContact.body).toMatchObject({
      primaryPhone: null,
      email: null,
    });

    const list = await ownerA
      .get(`/api/v1/organizations/${organizationA}/customers`)
      .query({ search: "Deniz", type: "INDIVIDUAL", page: 1, pageSize: 10 })
      .expect(200);
    expect(list.body.pagination.total).toBe(1);
    expect(list.body.items[0].id).toBe(customerA);

    const addressA = await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/addresses`,
      )
      .send({
        label: "Merkez",
        type: "BOTH",
        line1: "Atatürk Caddesi No: 1",
        district: "Muratpaşa",
        city: "Antalya",
      })
      .expect(201);
    const addressB = await ownerB
      .post(
        `/api/v1/organizations/${organizationB}/customers/${customerB}/addresses`,
      )
      .send({
        label: "Diğer adres",
        line1: "Başka Cadde No: 2",
        district: "Konyaaltı",
        city: "Antalya",
      })
      .expect(201);

    const contact = await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/contacts`,
      )
      .send({
        name: "Deniz Yılmaz",
        phone: "+905551112233",
        preferredChannel: "PHONE",
        isPrimary: true,
        marketingConsent: false,
      })
      .expect(201);
    await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/assets`,
      )
      .send({
        addressId: addressA.body.id,
        name: "Salon Kliması",
        category: "Klima",
        brand: "Test Marka",
        serialNumber: "CRM-A-001",
      })
      .expect(201);
    await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/assets`,
      )
      .send({
        addressId: addressB.body.id,
        name: "Yanlış Tenant Cihazı",
        category: "Klima",
      })
      .expect(404);

    const detail = await ownerA
      .get(`/api/v1/organizations/${organizationA}/customers/${customerA}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      nationalIdLastFour: "0146",
      contacts: [{ name: "Deniz Yılmaz" }],
      addresses: [{ label: "Merkez" }],
      assets: [{ name: "Salon Kliması" }],
    });
    expect(detail.body.nationalIdCiphertext).toBeUndefined();

    // Boş bırakılan iletişim alanı `null` olarak gelebilmeli ve mevcut bir
    // değer `null` gönderilerek temizlenebilmeli; şema bir dönem ikisini de
    // reddettiği için bir kişinin telefonunu silmenin yolu yoktu.
    await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/contacts`,
      )
      .send({
        name: "Telefonsuz Kişi",
        phone: null,
        email: "telefonsuz@example.com",
        preferredChannel: "EMAIL",
      })
      .expect(201);
    const cleared = await ownerA
      .patch(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/contacts/${contact.body.id as string}`,
      )
      .send({
        name: "Deniz Yılmaz",
        phone: null,
        email: "deniz@example.com",
        preferredChannel: "EMAIL",
      })
      .expect(200);
    expect(cleared.body.phone).toBeNull();
    // Telefon ve e-postanın ikisi birden boş olamaz kuralı hâlâ geçerli.
    await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/contacts`,
      )
      .send({ name: "Bilgisiz Kişi", phone: null, email: null })
      .expect(400);

    await ownerA
      .patch(`/api/v1/organizations/${organizationA}/customers/${customerA}`)
      .send({ version: 1, notes: "Güncellendi" })
      .expect(200);
    await ownerA
      .patch(`/api/v1/organizations/${organizationA}/customers/${customerA}`)
      .send({ version: 1, notes: "Eski sürüm" })
      .expect(409);
    await ownerB
      .get(`/api/v1/organizations/${organizationA}/customers/${customerA}`)
      .expect(403);
    await ownerA
      .get(`/api/v1/organizations/${organizationB}/customers/${customerA}`)
      .expect(403);

    const job = await ownerA
      .post(`/api/v1/organizations/${organizationA}/jobs`)
      .send({
        customerId: customerA,
        addressId: addressA.body.id,
        category: "Klima",
        title: "Periyodik klima bakımı",
        priority: "HIGH",
        scheduledStart: "2026-09-15T09:00:00.000Z",
        scheduledEnd: "2026-09-15T10:00:00.000Z",
        tags: ["bakım"],
      })
      .expect(201);
    expect(job.body.jobNumber).toBe("WO-2026-000001");
    expect(job.body.status).toBe("SCHEDULED");
    const members = await ownerA
      .get(`/api/v1/organizations/${organizationA}/members`)
      .expect(200);
    await ownerA
      .post(`/api/v1/organizations/${organizationA}/jobs/${job.body.id}/assign`)
      .send({ memberId: members.body[0].id, primary: true })
      .expect(201);
    for (const action of ["en-route", "arrive", "start", "complete"])
      await ownerA
        .post(
          `/api/v1/organizations/${organizationA}/jobs/${job.body.id}/${action}`,
        )
        .send({})
        .expect(201);
    const jobDetail = await ownerA
      .get(`/api/v1/organizations/${organizationA}/jobs/${job.body.id}`)
      .expect(200);
    expect(jobDetail.body.status).toBe("COMPLETED");
    expect(jobDetail.body.statusHistory).toHaveLength(6);
    await ownerB
      .get(`/api/v1/organizations/${organizationA}/jobs/${job.body.id}`)
      .expect(403);

    await ownerA
      .delete(`/api/v1/organizations/${organizationA}/customers/${customerA}`)
      .expect(200);
    await ownerA
      .post(
        `/api/v1/organizations/${organizationA}/customers/${customerA}/restore`,
      )
      .expect(201);

    expect(
      await database.organizationOnboardingStep.findUnique({
        where: {
          organizationId_key: {
            organizationId: organizationA,
            key: "first_customer_created",
          },
        },
      }),
    ).toMatchObject({ completedAt: expect.any(Date) });
    expect(
      await database.auditLog.count({
        where: { organizationId: organizationA, entity: "Customer" },
      }),
    ).toBeGreaterThanOrEqual(4);
  });

  it("generates idempotent job occurrences from a recurring service agreement", async () => {
    const owner = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());
    const registration = await owner
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.16")
      .send({
        name: "Sözleşme Sahibi",
        email: "agreements-owner@example.com",
        password: "GuvenliParola2032",
        organizationName: "Sözleşme Organizasyonu",
      })
      .expect(201);
    const otherRegistration = await other
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.17")
      .send({
        name: "Başka Sahip",
        email: "agreements-other@example.com",
        password: "GuvenliParola2033",
        organizationName: "Başka Sözleşme Organizasyonu",
      })
      .expect(201);
    const organizationId = registration.body.organizations[0].id as string;
    const otherOrganizationId = otherRegistration.body.organizations[0]
      .id as string;

    const customer = await owner
      .post(`/api/v1/organizations/${organizationId}/customers`)
      .send({
        type: "INDIVIDUAL",
        firstName: "Recep",
        lastName: "Aydın",
        primaryPhone: "+905551119900",
        tags: [],
      })
      .expect(201);
    const customerId = customer.body.id as string;

    const created = await owner
      .post(`/api/v1/organizations/${organizationId}/service-agreements`)
      .send({
        customerId,
        title: "Aylık klima bakımı",
        category: "Klima",
        recurrenceIntervalMonths: 1,
        anchorDate: "2026-01-15T09:00:00.000Z",
        startDate: "2026-01-15T00:00:00.000Z",
      })
      .expect(201);
    const agreementId = created.body.id as string;
    expect(created.body.version).toBe(1);
    // Web arayüzü "sonraki üretim dönemi"ni bu alandan okur; hesap backend'de
    // kalsın diye yanıta ekleniyor, istemcide tekrar hesaplanmıyor.
    expect(created.body.nextOccurrence).toEqual(expect.any(String));
    expect(
      new Date(created.body.nextOccurrence as string).getTime(),
    ).toBeGreaterThan(Date.now());

    await other
      .get(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`,
      )
      .expect(403);
    await owner
      .get(
        `/api/v1/organizations/${otherOrganizationId}/service-agreements/${agreementId}`,
      )
      .expect(403);

    const firstGenerate = await owner
      .post(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}/generate`,
      )
      .send({ asOf: "2026-03-01T00:00:00.000Z" })
      .expect(201);
    expect(firstGenerate.body.periods).toHaveLength(2);
    expect(
      firstGenerate.body.periods.every(
        (p: { status: string }) => p.status === "GENERATED",
      ),
    ).toBe(true);
    expect(
      firstGenerate.body.periods.every((p: { created: boolean }) => p.created),
    ).toBe(true);

    // Aynı dönem aralığı için tekrar çağrılsa bile (idempotency) ikinci bir
    // iş emri üretilmemeli; ledger zaten üretilmiş dönemleri döndürmeli.
    const secondGenerate = await owner
      .post(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}/generate`,
      )
      .send({ asOf: "2026-03-01T00:00:00.000Z" })
      .expect(201);
    expect(
      secondGenerate.body.periods.map((p: { jobId: string }) => p.jobId),
    ).toEqual(
      firstGenerate.body.periods.map((p: { jobId: string }) => p.jobId),
    );
    // Aynı dönemler ledger'dan döndüğü için `created` false olmalı; istemci
    // "yeni iş emri oluşturuldu" mesajını buna göre kuruyor.
    expect(
      secondGenerate.body.periods.some((p: { created: boolean }) => p.created),
    ).toBe(false);

    const jobsList = await owner
      .get(`/api/v1/organizations/${organizationId}/jobs`)
      .query({ page: 1, pageSize: 10, status: "ALL", search: "" })
      .expect(200);
    expect(jobsList.body.pagination.total).toBe(2);

    await owner
      .patch(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`,
      )
      .send({ version: 1, title: "Güncellendi" })
      .expect(200);
    await owner
      .patch(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`,
      )
      .send({ version: 1, title: "Eski sürüm" })
      .expect(409);

    const detail = await owner
      .get(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`,
      )
      .expect(200);
    expect(detail.body.title).toBe("Güncellendi");
    expect(detail.body.generationRuns).toHaveLength(2);

    const deactivated = await owner
      .patch(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`,
      )
      .send({ version: 2, active: false })
      .expect(200);
    expect(deactivated.body.active).toBe(false);
    expect(deactivated.body.nextOccurrence).toBeNull();
    await owner
      .post(
        `/api/v1/organizations/${organizationId}/service-agreements/${agreementId}/generate`,
      )
      .send({ asOf: "2026-04-01T00:00:00.000Z" })
      .expect(403);
  });

  it("keeps catalog items tenant-scoped, unique by SKU and safe under concurrent edits", async () => {
    const ownerA = request.agent(app.getHttpServer());
    const ownerB = request.agent(app.getHttpServer());
    const registrationA = await ownerA
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.31")
      .send({
        name: "Katalog Sahibi A",
        email: "catalog-owner-a@example.com",
        password: "GuvenliParola2040",
        organizationName: "Katalog Organizasyonu A",
      })
      .expect(201);
    const registrationB = await ownerB
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.32")
      .send({
        name: "Katalog Sahibi B",
        email: "catalog-owner-b@example.com",
        password: "GuvenliParola2041",
        organizationName: "Katalog Organizasyonu B",
      })
      .expect(201);
    const organizationA = registrationA.body.organizations[0].id as string;
    const organizationB = registrationB.body.organizations[0].id as string;
    const catalogA = `/api/v1/organizations/${organizationA}/catalog-items`;
    const catalogB = `/api/v1/organizations/${organizationB}/catalog-items`;

    // Parasal alanlar BIGINT kuruştur ve API sınırında dizgiye çevrilir;
    // INTEGER tavanının (2.147.483.647) üstündeki bir fiyat kayıpsız dönmeli.
    const created = await ownerA
      .post(catalogA)
      .send({
        sku: "klima-9000",
        name: "Split Klima 9000 BTU",
        kind: "PRODUCT",
        category: "İklimlendirme",
        listPriceMinor: "3000000000",
        costPriceMinor: 1_500_000,
        vatRateBps: 2000,
        reorderPoint: 3,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      sku: "KLIMA-9000",
      listPriceMinor: "3000000000",
      costPriceMinor: "1500000",
      vatRateBps: 2000,
      active: true,
      version: 1,
    });
    const itemId = created.body.id as string;

    // SKU büyük harfe normalize edildiği için farklı yazım aynı kalemdir.
    await ownerA
      .post(catalogA)
      .send({
        sku: "Klima-9000",
        name: "Kopya kalem",
        category: "İklimlendirme",
        listPriceMinor: "1000",
      })
      .expect(409);

    // Aynı SKU başka bir tenant'ta serbesttir.
    await ownerB
      .post(catalogB)
      .send({
        sku: "KLIMA-9000",
        name: "Diğer tenant kalemi",
        category: "İklimlendirme",
        listPriceMinor: "1000",
      })
      .expect(201);

    // Başka tenant'ın kalemine ne okuma ne yazma erişimi olmalı.
    await ownerB.get(`${catalogB}/${itemId}`).expect(404);
    await ownerB
      .patch(`${catalogB}/${itemId}`)
      .send({ version: 1, name: "Ele geçirildi" })
      .expect(404);
    await ownerB.get(catalogA).expect(403);

    const updated = await ownerA
      .patch(`${catalogA}/${itemId}`)
      .send({ version: 1, listPriceMinor: "3500000000", vatRateBps: 1000 })
      .expect(200);
    expect(updated.body).toMatchObject({
      listPriceMinor: "3500000000",
      vatRateBps: 1000,
      version: 2,
    });

    // Eski sürümle ikinci güncelleme çakışmalı.
    await ownerA
      .patch(`${catalogA}/${itemId}`)
      .send({ version: 1, name: "Eski sürüm" })
      .expect(409);

    // Geçersiz KDV oranı ve geçersiz tutar biçimi reddedilmeli.
    await ownerA
      .patch(`${catalogA}/${itemId}`)
      .send({ version: 2, vatRateBps: 10001 })
      .expect(400);
    await ownerA
      .patch(`${catalogA}/${itemId}`)
      .send({ version: 2, listPriceMinor: "12,50" })
      .expect(400);

    const archived = await ownerA.delete(`${catalogA}/${itemId}`).expect(200);
    expect(archived.body.active).toBe(false);
    const activeOnly = await ownerA
      .get(catalogA)
      .query({ status: "ACTIVE" })
      .expect(200);
    expect(
      activeOnly.body.items.some((item: { id: string }) => item.id === itemId),
    ).toBe(false);
    const restored = await ownerA
      .post(`${catalogA}/${itemId}/restore`)
      .expect(201);
    expect(restored.body.active).toBe(true);

    const searched = await ownerA
      .get(catalogA)
      .query({ search: "klima", kind: "PRODUCT", page: 1, pageSize: 10 })
      .expect(200);
    expect(searched.body.items).toHaveLength(1);
    expect(searched.body.pagination).toMatchObject({ page: 1, total: 1 });
  });

  it("shares family lines across tiers while keeping package-specific lines", async () => {
    const owner = request.agent(app.getHttpServer());
    const intruder = request.agent(app.getHttpServer());
    const registration = await owner
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.41")
      .send({
        name: "Paket Sahibi",
        email: "package-owner@example.com",
        password: "GuvenliParola2050",
        organizationName: "Paket Organizasyonu",
      })
      .expect(201);
    const intruderRegistration = await intruder
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.42")
      .send({
        name: "Yabancı Sahip",
        email: "package-intruder@example.com",
        password: "GuvenliParola2051",
        organizationName: "Yabancı Organizasyon",
      })
      .expect(201);
    const organizationId = registration.body.organizations[0].id as string;
    const intruderOrganizationId = intruderRegistration.body.organizations[0]
      .id as string;
    const base = `/api/v1/organizations/${organizationId}`;
    const families = `${base}/service-package-families`;
    const packages = `${base}/service-packages`;

    const filter = await owner
      .post(`${base}/catalog-items`)
      .send({
        sku: "filtre",
        name: "Klima filtresi",
        category: "Yedek parça",
        listPriceMinor: "25000",
      })
      .expect(201);
    const gas = await owner
      .post(`${base}/catalog-items`)
      .send({
        sku: "gaz",
        name: "Gaz dolumu",
        kind: "SERVICE",
        category: "Servis",
        listPriceMinor: "80000",
      })
      .expect(201);

    const family = await owner
      .post(families)
      .send({ key: "klima-bakim", name: "Klima bakımı" })
      .expect(201);
    const familyId = family.body.id as string;
    expect(family.body.key).toBe("KLIMA-BAKIM");

    // Seviye yalnızca aile içinde anlamlıdır; ailesiz seviye reddedilmeli.
    await owner
      .post(packages)
      .send({
        key: "yalniz-premium",
        name: "Ailesiz premium",
        tier: "PREMIUM",
        priceMinor: "10000",
      })
      .expect(409);

    const economy = await owner
      .post(packages)
      .send({
        key: "bakim-ekonomik",
        name: "Ekonomik bakım",
        familyId,
        tier: "ECONOMY",
        priceMinor: "100000",
      })
      .expect(201);
    const economyId = economy.body.id as string;

    // Ortak satır önce tanımlanır; sonradan eklenen paket onu devralmalı.
    const withShared = await owner
      .put(`${families}/${familyId}/shared-items`)
      .send({
        version: 1,
        items: [{ catalogItemId: filter.body.id, quantity: "2", addon: false }],
      })
      .expect(200);
    expect(withShared.body.packages[0].items).toHaveLength(1);
    expect(withShared.body.packages[0].items[0]).toMatchObject({
      catalogItemId: filter.body.id,
      shared: true,
    });

    const premium = await owner
      .post(packages)
      .send({
        key: "bakim-premium",
        name: "Premium bakım",
        familyId,
        tier: "PREMIUM",
        priceMinor: "250000",
      })
      .expect(201);
    expect(premium.body.items).toHaveLength(1);
    expect(premium.body.items[0].shared).toBe(true);

    // Aynı seviye aile içinde ikinci kez kullanılamaz.
    await owner
      .post(packages)
      .send({
        key: "bakim-premium-2",
        name: "İkinci premium",
        familyId,
        tier: "PREMIUM",
        priceMinor: "300000",
      })
      .expect(409);

    // Pakete özel satır eklemek ortak satırı silmemeli.
    const withOwn = await owner
      .put(`${packages}/${premium.body.id}/items`)
      .send({
        version: premium.body.version,
        items: [{ catalogItemId: gas.body.id, quantity: "1", addon: true }],
      })
      .expect(200);
    expect(withOwn.body.items).toHaveLength(2);
    expect(
      withOwn.body.items.find(
        (item: { catalogItemId: string }) =>
          item.catalogItemId === filter.body.id,
      ).shared,
    ).toBe(true);
    expect(
      withOwn.body.items.find(
        (item: { catalogItemId: string }) => item.catalogItemId === gas.body.id,
      ),
    ).toMatchObject({ shared: false, addon: true });

    // Ortak satır listesi değişince ekonomik paket de güncellenmeli, pakete
    // özel satır yerinde kalmalı.
    const detail = await owner.get(`${families}/${familyId}`).expect(200);
    await owner
      .put(`${families}/${familyId}/shared-items`)
      .send({
        version: detail.body.version,
        items: [
          { catalogItemId: filter.body.id, quantity: "3", addon: false },
          { catalogItemId: gas.body.id, quantity: "1", addon: false },
        ],
      })
      .expect(200);
    const afterShared = await owner.get(`${families}/${familyId}`).expect(200);
    const economyAfter = afterShared.body.packages.find(
      (item: { id: string }) => item.id === economyId,
    );
    expect(economyAfter.items).toHaveLength(2);
    expect(
      economyAfter.items.every((item: { shared: boolean }) => item.shared),
    ).toBe(true);

    // Aynı katalog kalemi hem ortak hem pakete özel olamaz.
    const premiumDetail = await owner
      .get(`${packages}/${premium.body.id}`)
      .expect(200);
    await owner
      .put(`${packages}/${premium.body.id}/items`)
      .send({
        version: premiumDetail.body.version,
        items: [{ catalogItemId: filter.body.id, quantity: "1", addon: false }],
      })
      .expect(409);

    // Eski sürümle güncelleme çakışmalı.
    await owner
      .patch(`${packages}/${economyId}`)
      .send({ version: 1, name: "Eski sürüm" })
      .expect(409);

    const archived = await owner.delete(`${packages}/${economyId}`).expect(200);
    expect(archived.body.active).toBe(false);
    const restored = await owner
      .post(`${packages}/${economyId}/restore`)
      .expect(201);
    expect(restored.body.active).toBe(true);

    // Başka tenant ne okuyabilmeli ne yazabilmeli.
    await intruder
      .get(
        `/api/v1/organizations/${intruderOrganizationId}/service-package-families/${familyId}`,
      )
      .expect(404);
    await intruder.get(families).expect(403);
    await intruder
      .put(
        `/api/v1/organizations/${intruderOrganizationId}/service-packages/${economyId}/items`,
      )
      .send({ version: 1, items: [] })
      .expect(404);
  });

  it("computes quote option totals from shared and option lines", async () => {
    const owner = request.agent(app.getHttpServer());
    const intruder = request.agent(app.getHttpServer());
    const registration = await owner
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.51")
      .send({
        name: "Teklif Sahibi",
        email: "quote-owner@example.com",
        password: "GuvenliParola2060",
        organizationName: "Teklif Organizasyonu",
      })
      .expect(201);
    const intruderRegistration = await intruder
      .post("/api/v1/auth/register")
      .set("X-Forwarded-For", "198.51.100.52")
      .send({
        name: "Yabancı Teklifçi",
        email: "quote-intruder@example.com",
        password: "GuvenliParola2061",
        organizationName: "Yabancı Teklif Organizasyonu",
      })
      .expect(201);
    const organizationId = registration.body.organizations[0].id as string;
    const intruderOrganizationId = intruderRegistration.body.organizations[0]
      .id as string;
    const base = `/api/v1/organizations/${organizationId}`;
    const quotes = `${base}/quotes`;

    const customer = await owner
      .post(`${base}/customers`)
      .send({ type: "COMPANY", companyName: "Teklif Müşterisi", tags: [] })
      .expect(201);

    const created = await owner
      .post(quotes)
      .send({
        customerId: customer.body.id,
        title: "Klima bakım teklifi",
        validUntil: "2026-12-31",
      })
      .expect(201);
    const quoteId = created.body.id as string;
    // Numara seri + yıl + sıra biçimindedir ve sayaç yıl bazında sıfırlanır.
    expect(created.body.quoteNumber).toMatch(/^TEK-\d{4}-000001$/);
    expect(created.body.status).toBe("DRAFT");

    const withOptions = await owner
      .put(`${quotes}/${quoteId}/options`)
      .send({
        version: created.body.version,
        options: [
          { tier: "ECONOMY", name: "Ekonomik" },
          { tier: "PREMIUM", name: "Premium" },
        ],
      })
      .expect(200);
    expect(withOptions.body.options).toHaveLength(2);
    const economyId = withOptions.body.options.find(
      (option: { tier: string }) => option.tier === "ECONOMY",
    ).id as string;
    const premiumId = withOptions.body.options.find(
      (option: { tier: string }) => option.tier === "PREMIUM",
    ).id as string;

    // Ortak satır: 2 × 1.250,00 = 2.500,00 (+%20 KDV).
    // Premium satırı: 1 × 800,00 (+%10 KDV).
    const withLines = await owner
      .put(`${quotes}/${quoteId}/lines`)
      .send({
        version: withOptions.body.version,
        lines: [
          {
            name: "Klima bakımı",
            quantity: "2",
            unitPriceMinor: "125000",
            vatRateBps: 2000,
          },
          {
            optionId: premiumId,
            name: "Gaz dolumu",
            quantity: "1",
            unitPriceMinor: "80000",
            vatRateBps: 1000,
          },
        ],
      })
      .expect(200);

    const economy = withLines.body.options.find(
      (option: { id: string }) => option.id === economyId,
    );
    const premium = withLines.body.options.find(
      (option: { id: string }) => option.id === premiumId,
    );
    // Ekonomik yalnızca ortak satırı taşır: 2.500,00 + 500,00 KDV.
    expect(economy).toMatchObject({
      subtotalMinor: "250000",
      vatMinor: "50000",
      totalMinor: "300000",
    });
    // Premium ortak satır + kendi satırı: 3.300,00 ve karışık oranlı KDV.
    expect(premium).toMatchObject({
      subtotalMinor: "330000",
      vatMinor: "58000",
      totalMinor: "388000",
    });
    // Seçim yapılmadan teklif toplamı yalnızca ortak satırlardır.
    expect(withLines.body).toMatchObject({
      subtotalMinor: "250000",
      totalMinor: "300000",
      selectedOptionId: null,
    });

    const selected = await owner
      .post(`${quotes}/${quoteId}/select-option`)
      .send({ version: withLines.body.version, optionId: premiumId })
      .expect(201);
    expect(selected.body).toMatchObject({
      selectedOptionId: premiumId,
      subtotalMinor: "330000",
      vatMinor: "58000",
      totalMinor: "388000",
    });

    // Belge seviyesindeki indirim satırlara dağıtılır ve KDV indirimli
    // matrahtan yeniden hesaplanır; oransal ölçekleme yapılmaz.
    const discounted = await owner
      .patch(`${quotes}/${quoteId}`)
      .send({ version: selected.body.version, discountMinor: "33000" })
      .expect(200);
    expect(discounted.body).toMatchObject({
      subtotalMinor: "330000",
      discountMinor: "33000",
      vatMinor: "52200",
      totalMinor: "349200",
    });

    // İndirim ara toplamı aşamaz.
    const clamped = await owner
      .patch(`${quotes}/${quoteId}`)
      .send({ version: discounted.body.version, discountMinor: "99999999" })
      .expect(200);
    expect(clamped.body).toMatchObject({
      discountMinor: "330000",
      vatMinor: "0",
      totalMinor: "0",
    });

    // Eski sürümle güncelleme çakışmalı.
    await owner
      .patch(`${quotes}/${quoteId}`)
      .send({ version: 1, title: "Eski sürüm" })
      .expect(409);

    // Başka teklifin seçeneği bu teklifin satırına bağlanamaz.
    await owner
      .put(`${quotes}/${quoteId}/lines`)
      .send({
        version: clamped.body.version,
        lines: [
          {
            optionId: customer.body.id,
            name: "Yanlış seçenek",
            quantity: "1",
            unitPriceMinor: "1000",
          },
        ],
      })
      .expect(404);

    // Başka tenant ne okuyabilmeli ne yazabilmeli.
    await intruder
      .get(`/api/v1/organizations/${intruderOrganizationId}/quotes/${quoteId}`)
      .expect(404);
    await intruder.get(quotes).expect(403);

    const list = await owner
      .get(quotes)
      .query({ search: "Klima", status: "DRAFT", page: 1, pageSize: 10 })
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].quoteNumber).toBe(created.body.quoteNumber);
  });
});
