import { expect, test, type Page } from "@playwright/test";

const customer = {
  id: "customer-1",
  customerNumber: "MUS-000001",
  type: "INDIVIDUAL",
  status: "ACTIVE",
  displayName: "Deniz Yılmaz",
  firstName: "Deniz",
  lastName: "Yılmaz",
  companyName: null,
  primaryPhone: "+905551112233",
  alternatePhone: null,
  email: "deniz@example.com",
  nationalIdLastFour: null,
  taxNumber: null,
  taxOffice: null,
  notes: null,
  tags: [],
  version: 1,
  createdAt: "2026-09-14T09:00:00Z",
  contacts: [],
  addresses: [],
  assets: [
    {
      id: "asset-1",
      addressId: null,
      name: "Salon Kliması",
      category: "Klima",
      brand: null,
      model: null,
      serialNumber: null,
      installationDate: null,
      warrantyEndsAt: null,
      maintenanceIntervalDays: null,
      notes: null,
      active: true,
      address: null,
    },
  ],
  _count: { contacts: 0, addresses: 0, assets: 1 },
};

const agreement = {
  id: "agreement-1",
  assetId: "asset-1",
  title: "Aylık klima bakımı",
  category: "Klima",
  priority: "NORMAL",
  problemDescription: null,
  estimatedDurationMinutes: 60,
  recurrenceIntervalMonths: 3,
  anchorDate: "2026-01-15T09:00:00.000Z",
  startDate: "2026-01-15T00:00:00.000Z",
  endDate: null,
  active: true,
  version: 1,
  nextOccurrence: "2026-10-15T09:00:00.000Z",
  asset: { id: "asset-1", name: "Salon Kliması" },
};

const generationRuns = [
  {
    id: "run-1",
    periodKey: "2026-07-15",
    status: "GENERATED",
    failureReason: null,
    createdAt: "2026-07-15T06:00:00.000Z",
    job: {
      id: "job-1",
      jobNumber: "WO-2026-000001",
      title: "Aylık klima bakımı",
    },
  },
];

async function mockWorkspace(page: Page) {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        memberships: [
          {
            organization: {
              id: "org-1",
              name: "Akdeniz Teknik Servis",
              slug: "akdeniz-teknik-servis",
              timezone: "Europe/Istanbul",
              currency: "TRY",
            },
            role: { id: "role-1", name: "Şirket Sahibi" },
          },
        ],
      }),
    }),
  );
  await page.route("**/api/v1/organizations/org-1/workspace", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        organization: {
          id: "org-1",
          name: "Akdeniz Teknik Servis",
          slug: "akdeniz-teknik-servis",
          timezone: "Europe/Istanbul",
          currency: "TRY",
        },
        membership: {
          id: "member-1",
          role: { id: "role-1", name: "Şirket Sahibi" },
          permissions: [
            "workspace.read",
            "organization.read",
            "member.read",
            "notification.read",
            "customer.read",
            "customer.update",
            "job.read",
            "service-agreement.read",
            "service-agreement.manage",
            "service-agreement.generate",
          ],
        },
        plan: {
          key: "starter",
          name: "Başlangıç",
          status: "active",
          entitlements: [
            { featureKey: "workspace.shell", enabled: true, limitValue: null },
            { featureKey: "crm.customers", enabled: true, limitValue: 1000 },
            { featureKey: "operations.jobs", enabled: true, limitValue: 1000 },
            {
              featureKey: "operations.service-agreements",
              enabled: true,
              limitValue: 100,
            },
          ],
        },
        onboarding: [
          { key: "organization_created", completedAt: "2026-09-14T08:00:00Z" },
        ],
        metrics: { members: 1, customers: 1, unreadNotifications: 0 },
      }),
    }),
  );
  await page.route(
    "**/api/v1/organizations/org-1/customers**",
    async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/customers/customer-1"))
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(customer),
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [customer],
          pagination: { total: 1, page: 1, pageSize: 10, pages: 1 },
        }),
      });
    },
  );
}

async function openCustomerDetail(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Müşteriler", exact: true }).click();
  await page.getByRole("button", { name: /Detay/ }).click();
  await expect(page.getByRole("heading", { name: "Deniz Yılmaz" })).toBeVisible();
}

test("lists a customer's service agreements with recurrence and next period", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.route(
    "**/api/v1/organizations/org-1/service-agreements**",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [agreement],
          pagination: { total: 1, page: 1, pageSize: 50, pages: 1 },
        }),
      }),
  );

  await openCustomerDetail(page);
  await expect(
    page.getByRole("heading", { name: "Servis Sözleşmeleri" }),
  ).toBeVisible();
  await expect(page.getByText("Aylık klima bakımı")).toBeVisible();
  await expect(page.getByText("Her 3 ayda bir")).toBeVisible();
  await expect(page.getByText("Sonraki dönem: 15.10.2026")).toBeVisible();
  await expect(
    page.locator(".service-agreement-row").getByText("Aktif", { exact: true }),
  ).toBeVisible();
});

test("creates a service agreement from the customer record", async ({
  page,
}) => {
  await mockWorkspace(page);
  let submitted: Record<string, unknown> | undefined;
  let created = false;
  await page.route(
    "**/api/v1/organizations/org-1/service-agreements**",
    async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        submitted = request.postDataJSON() as Record<string, unknown>;
        created = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...agreement, generationRuns: [] }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: created ? [agreement] : [],
          pagination: {
            total: created ? 1 : 0,
            page: 1,
            pageSize: 50,
            pages: 1,
          },
        }),
      });
    },
  );

  await openCustomerDetail(page);
  await expect(page.getByText("Kayıtlı servis sözleşmesi yok.")).toBeVisible();
  await page.getByRole("button", { name: "Yeni sözleşme" }).click();
  await page.getByLabel("Başlık").fill("Aylık klima bakımı");
  await page.getByLabel("Kategori").fill("Klima");
  await page.getByLabel("Cihaz (opsiyonel)").selectOption("asset-1");
  await page.getByLabel("Tekrar aralığı (ay)").fill("3");
  await page.getByLabel("İlk tekrar tarihi").fill("2026-01-15T09:00");
  await page.getByLabel("Başlangıç tarihi").fill("2026-01-15T00:00");
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(page.getByText("Aylık klima bakımı")).toBeVisible();
  expect(submitted).toMatchObject({
    customerId: "customer-1",
    assetId: "asset-1",
    title: "Aylık klima bakımı",
    category: "Klima",
    recurrenceIntervalMonths: 3,
  });
});

test("generates jobs on demand and shows the generation ledger", async ({
  page,
}) => {
  await mockWorkspace(page);
  let generateCalls = 0;
  await page.route(
    "**/api/v1/organizations/org-1/service-agreements**",
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path.endsWith("/generate")) {
        generateCalls += 1;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            periods: [
              {
                periodKey: "2026-07-15",
                status: "GENERATED",
                jobId: "job-1",
                created: true,
              },
            ],
          }),
        });
      }
      if (path.endsWith("/service-agreements/agreement-1"))
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...agreement, generationRuns }),
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [agreement],
          pagination: { total: 1, page: 1, pageSize: 50, pages: 1 },
        }),
      });
    },
  );

  await openCustomerDetail(page);
  await page.getByRole("button", { name: "Şimdi Üret" }).click();
  await expect(
    page.getByText("1 dönem işlendi: 1 yeni iş emri oluşturuldu."),
  ).toBeVisible();
  expect(generateCalls).toBe(1);

  await page.getByRole("button", { name: /Geçmiş/ }).click();
  await expect(page.getByText("2026-07-15 · Üretildi")).toBeVisible();
  await expect(
    page.getByText(/WO-2026-000001 — Aylık klima bakımı/),
  ).toBeVisible();
});
