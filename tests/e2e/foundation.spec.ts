import { expect, test, type Page } from "@playwright/test";

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
            "customer.create",
            "customer.update",
            "customer.archive",
            "job.read",
            "job.create",
            "job.assign",
            "job.update",
            "job.complete",
            "job.cancel",
          ],
        },
        plan: {
          key: "starter",
          name: "Başlangıç",
          status: "active",
          entitlements: [
            {
              featureKey: "workspace.shell",
              enabled: true,
              limitValue: null,
            },
            {
              featureKey: "crm.customers",
              enabled: true,
              limitValue: 1000,
            },
            { featureKey: "operations.jobs", enabled: true, limitValue: 1000 },
          ],
        },
        onboarding: [
          {
            key: "organization_created",
            completedAt: "2026-09-14T08:00:00Z",
          },
          {
            key: "owner_account_created",
            completedAt: "2026-09-14T08:00:00Z",
          },
          { key: "team_invited", completedAt: null },
        ],
        metrics: { members: 1, customers: 0, unreadNotifications: 1 },
      }),
    }),
  );
}

test("workspace navigation, theme, command menu and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockWorkspace(page);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Merhaba, Ayşe" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Koyu tema" }).click();
  await expect(page.locator(".shell")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Açık tema" }).click();

  await page.keyboard.press("Control+K");
  await expect(
    page.getByRole("dialog", { name: "Komut menüsü" }),
  ).toBeVisible();
  await page.getByLabel("Komut ara").fill("geliştirme");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Geliştirme Planı/ })
    .click();
  await expect(page.locator(".phase")).toHaveCount(16);

  await page
    .getByRole("button", { name: "Sistem Durumu", exact: true })
    .click();
  await page.route("**/api/health", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        status: "not_ready",
        checks: { database: "up", redis: "down", storage: "down" },
      }),
    }),
  );
  await page.getByRole("button", { name: "Bağlantıları kontrol et" }).click();
  await expect(page.getByText("PostgreSQL")).toBeVisible();
  await expect(page.getByText("Hazır")).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .getByRole("button", { name: "Geliştirme Planı", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Geliştirme Planı", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("creates a customer and opens the customer 360 record", async ({
  page,
}) => {
  await mockWorkspace(page);
  let submitted: Record<string, unknown> | undefined;
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
    tags: ["VIP"],
    version: 1,
    createdAt: "2026-09-14T09:00:00Z",
    contacts: [],
    addresses: [],
    assets: [],
    _count: { contacts: 0, addresses: 0, assets: 0 },
  };
  await page.route(
    "**/api/v1/organizations/org-1/customers**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "POST" && url.pathname.endsWith("/customers")) {
        submitted = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(customer),
        });
        return;
      }
      if (url.pathname.endsWith("/customers/customer-1")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(customer),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          pagination: { total: 0, page: 1, pageSize: 10, pages: 1 },
        }),
      });
    },
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Müşteriler", exact: true }).click();
  await expect(
    page.getByText("Filtrelerle eşleşen müşteri bulunamadı."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yeni müşteri" }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Deniz");
  await page.getByLabel("Soyad").fill("Yılmaz");
  await page.getByLabel("Telefon", { exact: true }).fill("+905551112233");
  await page.getByLabel("E-posta").fill("deniz@example.com");
  await page.getByLabel("Etiketler").fill("VIP");
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(
    page.getByRole("heading", { name: "Deniz Yılmaz" }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    type: "INDIVIDUAL",
    firstName: "Deniz",
    lastName: "Yılmaz",
    primaryPhone: "+905551112233",
    tags: ["VIP"],
  });
});

test("creates a job and opens its workflow history", async ({ page }) => {
  await mockWorkspace(page);
  const job = {
    id: "job-1",
    jobNumber: "WO-2026-000001",
    title: "Klima bakımı",
    category: "Klima",
    status: "SCHEDULED",
    priority: "HIGH",
    version: 1,
    scheduledStart: "2026-09-15T09:00:00.000Z",
    customer: { id: "customer-1", displayName: "Deniz Yılmaz" },
    assignments: [],
    statusHistory: [
      {
        id: "history-1",
        fromStatus: null,
        toStatus: "SCHEDULED",
        reason: null,
        createdAt: "2026-09-14T09:00:00Z",
        changedBy: { name: "Ayşe Kaya" },
      },
    ],
  };
  await page.route("**/api/v1/organizations/org-1/jobs**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/jobs"))
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    if (path.endsWith("/jobs/job-1"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        pagination: { page: 1, pageSize: 10, total: 0, pages: 1 },
      }),
    });
  });
  await page.route("**/api/v1/organizations/org-1/customers?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "customer-1",
            displayName: "Deniz Yılmaz",
            customerNumber: "MUS-000001",
          },
        ],
        pagination: { pages: 1 },
      }),
    }),
  );
  await page.route("**/api/v1/organizations/org-1/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "İş Emirleri", exact: true }).click();
  await expect(page.getByText("İş emri bulunmuyor.")).toBeVisible();
  await page.getByRole("button", { name: "Yeni iş emri" }).click();
  await page.getByLabel("Müşteri").selectOption("customer-1");
  await page.getByLabel("Başlık").fill("Klima bakımı");
  await page.getByLabel("Kategori").fill("Klima");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(
    page.getByRole("heading", { name: "Klima bakımı" }),
  ).toBeVisible();
  await expect(
    page.getByText("Planlandı", { exact: true }).first(),
  ).toBeVisible();
});

test("notification panel loads and marks an unread notification", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.route("**/api/v1/organizations/org-1/notifications?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "notification-1",
            type: "welcome",
            title: "Çalışma alanınız hazır",
            body: "Şirket hesabınız oluşturuldu.",
            href: "/",
            readAt: null,
            createdAt: "2026-09-14T08:00:00Z",
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1, pages: 1 },
      }),
    }),
  );
  await page.route(
    "**/api/v1/organizations/org-1/notifications/notification-1",
    async (route) => {
      expect(route.request().postDataJSON()).toEqual({ read: true });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "notification-1",
          readAt: "2026-09-14T08:01:00Z",
        }),
      });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Bildirimler" }).click();
  await page.getByRole("button", { name: /Çalışma alanınız hazır/ }).click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
});

test("API liveness and dependency failure remain separate", async ({
  request,
}) => {
  const live = await request.get("http://127.0.0.1:4000/api/v1/health");
  expect(live.status()).toBe(200);
  expect(await live.json()).toMatchObject({ status: "ok" });
  const ready = await request.get("http://127.0.0.1:4000/api/v1/health/ready");
  expect(ready.status()).toBe(503);
  expect(await ready.json()).toMatchObject({ status: "not_ready" });
});
