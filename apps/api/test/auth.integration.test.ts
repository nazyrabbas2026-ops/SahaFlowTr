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

    await ownerA
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
    expect(new Date(created.body.nextOccurrence as string).getTime()).toBeGreaterThan(
      Date.now(),
    );

    await other
      .get(`/api/v1/organizations/${organizationId}/service-agreements/${agreementId}`)
      .expect(403);
    await owner
      .get(`/api/v1/organizations/${otherOrganizationId}/service-agreements/${agreementId}`)
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
      secondGenerate.body.periods.map(
        (p: { jobId: string }) => p.jobId,
      ),
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
});
