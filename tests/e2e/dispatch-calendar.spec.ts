import { expect, test, type Page } from "@playwright/test";
import {
  addDays,
  startOfWeek,
} from "../../apps/web/components/dispatch-calendar.helpers";

/**
 * Dispatch takvimi `startOfWeek(new Date())` üzerinden çalıştığı için bu
 * dosyadaki mock veriler, testin çalıştırıldığı gerçek "bugün"e göre
 * hesaplanır — sabit bir takvim tarihi (ör. "2026-09-14") hardcode edilmez,
 * aksi hâlde test yalnızca o hafta çalışır. Aynı yerel-saat tutarlı
 * helper'lar takvim bileşeninin kendisi tarafından da kullanılıyor, bu
 * yüzden burada da onlardan içe aktarılıyor.
 */
const weekStart = startOfWeek(new Date());
function weekday(index: number) {
  return addDays(weekStart, index);
}
function isoAt(date: Date, hour: number, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function mockDispatchWorkspace(page: Page) {
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
            "job.read",
            "job.assign",
            "job.update",
            "employee.read",
            "employee.manage",
            "dispatch.read",
            "dispatch.assign",
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
              featureKey: "operations.employees",
              enabled: true,
              limitValue: null,
            },
            {
              featureKey: "operations.dispatch",
              enabled: true,
              limitValue: null,
            },
          ],
        },
        onboarding: [
          { key: "organization_created", completedAt: "2026-09-14T08:00:00Z" },
          { key: "owner_account_created", completedAt: "2026-09-14T08:00:00Z" },
        ],
        metrics: { members: 1, customers: 0, unreadNotifications: 0 },
      }),
    }),
  );
  await page.route(
    "**/api/v1/organizations/org-1/notifications**",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          pagination: { page: 1, pageSize: 10, total: 0, pages: 1 },
        }),
      }),
  );
}

const employees = [
  {
    id: "emp-a",
    employeeNumber: "PER-0001",
    title: "Klima Teknisyeni",
    phone: null,
    homeCity: null,
    homeDistrict: null,
    memberId: "member-a",
    member: { id: "member-a", user: { name: "Ayşe Yılmaz", email: "a@x.com" } },
    skills: [],
  },
  {
    id: "emp-b",
    employeeNumber: "PER-0002",
    title: "Klima Teknisyeni",
    phone: null,
    homeCity: null,
    homeDistrict: null,
    memberId: "member-b",
    member: { id: "member-b", user: { name: "Deniz Kaya", email: "b@x.com" } },
    skills: [],
  },
];

async function openDispatchTab(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Dispatch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Haftalık Takvim" })).toBeVisible();
}

/** dnd-kit'in PointerSensor'ı yalnızca gerçek pointerdown/pointermove/
 * pointerup event'lerini dinler (bkz. @dnd-kit/core kaynağı:
 * `PointerSensor.activators = [{ eventName: 'onPointerDown', ... }]`,
 * event listesi `pointermove`/`pointerup`). Playwright'ın `page.mouse.*`
 * API'si Chromium'da bunları native olarak üretir; native HTML5
 * dragstart/drop veya dblclick bu kütüphane için hiçbir şey tetiklemez. */
async function dragTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // activationConstraint: { distance: 4 } — aktivasyonu tetiklemek için
  // önce küçük bir hareket yapılmalı.
  await page.mouse.move(from.x + 10, from.y + 5, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
}

test("dragging a job to a different technician on the same day persists after reload", async ({
  page,
}) => {
  await mockDispatchWorkspace(page);
  let job = {
    id: "job-1",
    jobNumber: "WO-2026-000001",
    title: "Klima Bakımı",
    priority: "NORMAL" as const,
    scheduledStart: isoAt(weekday(0), 9, 0),
    estimatedDurationMinutes: 60,
    version: 1,
    customer: { displayName: "Deniz Yılmaz" },
    assignments: [{ memberId: "member-a", primary: true }],
  };

  await page.route("**/api/v1/organizations/org-1/employees", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(employees),
    }),
  );
  await page.route("**/api/v1/organizations/org-1/employees/skills", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/jobs**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/assign")) {
      const body = request.postDataJSON() as { memberId: string };
      job = { ...job, assignments: [{ memberId: body.memberId, primary: true }] };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    }
    if (request.method() === "PATCH" && /\/jobs\/[^/]+$/.test(url.pathname)) {
      const body = request.postDataJSON() as {
        scheduledStart: string;
        scheduledEnd: string;
      };
      job = {
        ...job,
        scheduledStart: body.scheduledStart,
        version: job.version + 1,
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [job],
        pagination: { page: 1, pageSize: 100, total: 1, pages: 1 },
      }),
    });
  });

  await openDispatchTab(page);

  // Başlangıçta: Ayşe Yılmaz satırı, Pazartesi hücresi (0. hücre).
  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Klima Bakımı"),
  ).toBeVisible();

  const chipBox = await page
    .locator(".job-chip", { hasText: "Klima Bakımı" })
    .boundingBox();
  const denizRowBox = await page
    .locator(".week-calendar-lane-label", { hasText: "Deniz Kaya" })
    .boundingBox();
  const mondayHeaderBox = await page
    .locator(".week-calendar-day-head")
    .nth(0)
    .boundingBox();
  if (!chipBox || !denizRowBox || !mondayHeaderBox)
    throw new Error("Sürükleme için gerekli eleman konumu bulunamadı");

  await dragTo(
    page,
    { x: chipBox.x + chipBox.width / 2, y: chipBox.y + chipBox.height / 2 },
    {
      x: mondayHeaderBox.x + mondayHeaderBox.width / 2,
      y: denizRowBox.y + denizRowBox.height / 2,
    },
  );

  // Deniz Kaya satırı Pazartesi hücresi = 7. hücre (Ayşe'nin 7 günü: 0-6).
  await expect(
    page.locator(".week-calendar-cell").nth(7).getByText("Klima Bakımı"),
  ).toBeVisible();
  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Klima Bakımı"),
  ).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Dispatch", exact: true }).click();
  await expect(
    page.locator(".week-calendar-cell").nth(7).getByText("Klima Bakımı"),
  ).toBeVisible();
  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Klima Bakımı"),
  ).toHaveCount(0);
});

test("dragging a job to a different day keeps the same technician and persists after reload", async ({
  page,
}) => {
  await mockDispatchWorkspace(page);
  let job = {
    id: "job-1",
    jobNumber: "WO-2026-000001",
    title: "Pano Kontrolü",
    priority: "NORMAL" as const,
    scheduledStart: isoAt(weekday(0), 9, 0),
    estimatedDurationMinutes: 60,
    version: 1,
    customer: { displayName: "Deniz Yılmaz" },
    assignments: [{ memberId: "member-a", primary: true }],
  };

  await page.route("**/api/v1/organizations/org-1/employees", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(employees),
    }),
  );
  await page.route("**/api/v1/organizations/org-1/employees/skills", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/jobs**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/assign")) {
      const body = request.postDataJSON() as { memberId: string };
      job = { ...job, assignments: [{ memberId: body.memberId, primary: true }] };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    }
    if (request.method() === "PATCH" && /\/jobs\/[^/]+$/.test(url.pathname)) {
      const body = request.postDataJSON() as {
        scheduledStart: string;
        scheduledEnd: string;
      };
      job = {
        ...job,
        scheduledStart: body.scheduledStart,
        version: job.version + 1,
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(job),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [job],
        pagination: { page: 1, pageSize: 100, total: 1, pages: 1 },
      }),
    });
  });

  await openDispatchTab(page);

  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Pano Kontrolü"),
  ).toBeVisible();

  const chipBox = await page
    .locator(".job-chip", { hasText: "Pano Kontrolü" })
    .boundingBox();
  const wednesdayHeaderBox = await page
    .locator(".week-calendar-day-head")
    .nth(2)
    .boundingBox();
  const ayseRowBox = await page
    .locator(".week-calendar-lane-label", { hasText: "Ayşe Yılmaz" })
    .boundingBox();
  if (!chipBox || !wednesdayHeaderBox || !ayseRowBox)
    throw new Error("Sürükleme için gerekli eleman konumu bulunamadı");

  await dragTo(
    page,
    { x: chipBox.x + chipBox.width / 2, y: chipBox.y + chipBox.height / 2 },
    {
      x: wednesdayHeaderBox.x + wednesdayHeaderBox.width / 2,
      y: ayseRowBox.y + ayseRowBox.height / 2,
    },
  );

  // Ayşe Yılmaz satırı Çarşamba hücresi = 2. hücre (Pazartesi=0, Salı=1).
  await expect(
    page.locator(".week-calendar-cell").nth(2).getByText("Pano Kontrolü"),
  ).toBeVisible();
  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Pano Kontrolü"),
  ).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Dispatch", exact: true }).click();
  await expect(
    page.locator(".week-calendar-cell").nth(2).getByText("Pano Kontrolü"),
  ).toBeVisible();
  await expect(
    page.locator(".week-calendar-cell").nth(0).getByText("Pano Kontrolü"),
  ).toHaveCount(0);
});

test("week/month toggle switches the visible calendar grid", async ({
  page,
}) => {
  await mockDispatchWorkspace(page);
  await page.route("**/api/v1/organizations/org-1/employees", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(employees),
    }),
  );
  await page.route("**/api/v1/organizations/org-1/employees/skills", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/organizations/org-1/jobs**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        pagination: { page: 1, pageSize: 100, total: 0, pages: 1 },
      }),
    }),
  );

  await openDispatchTab(page);
  await expect(page.locator(".week-calendar-day-head")).toHaveCount(7);

  await page.getByRole("button", { name: "Ay", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aylık Takvim" }),
  ).toBeVisible();
  const monthDayCount = await page.locator(".week-calendar-day-head").count();
  expect(monthDayCount).toBeGreaterThan(7);
  expect(monthDayCount % 7).toBe(0);

  await page.getByRole("button", { name: "Hafta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Haftalık Takvim" }),
  ).toBeVisible();
  await expect(page.locator(".week-calendar-day-head")).toHaveCount(7);
});
