import { expect, test } from "@playwright/test";

test("registration form validates and submits real API shape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kayit");
  await page.screenshot({
    path: "test-results/auth-register-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Şirket hesabını oluştur" }).click();
  await expect(
    page.getByText("Ad soyad en az 2 karakter olmalıdır"),
  ).toBeVisible();
  await expect(page.getByText("Geçerli bir e-posta girin")).toBeVisible();

  await page.route("**/api/v1/auth/register", async (route) => {
    const input = route.request().postDataJSON() as Record<string, string>;
    expect(input).toEqual({
      name: "Ayşe Kaya",
      organizationName: "Akdeniz Teknik Servis",
      email: "ayse@example.com",
      password: "GuvenliParola2026",
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user: { name: input.name } }),
    });
  });
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        memberships: [],
      }),
    }),
  );
  await page.getByLabel("Ad soyad").fill("Ayşe Kaya");
  await page.getByLabel("Şirket adı").fill("Akdeniz Teknik Servis");
  await page.getByLabel("E-posta").fill("ayse@example.com");
  await page.locator('input[name="password"]').fill("GuvenliParola2026");
  await page.getByRole("button", { name: "Şirket hesabını oluştur" }).click();
  await expect(page).toHaveURL("/");
});

test("login surfaces API errors without losing input", async ({ page }) => {
  await page.goto("/giris");
  await page.screenshot({
    path: "test-results/auth-login-desktop.png",
    fullPage: true,
  });
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "E-posta veya parola hatalı" }),
    }),
  );
  await page.getByLabel("E-posta").fill("ayse@example.com");
  await page.locator('input[name="password"]').fill("YanlisParola123");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.locator(".auth-error")).toHaveText(
    "E-posta veya parola hatalı",
  );
  await expect(page.getByLabel("E-posta")).toHaveValue("ayse@example.com");
});

test("registration turns a non-JSON upstream failure into a useful message", async ({
  page,
}) => {
  await page.goto("/kayit");
  await page.route("**/api/v1/auth/register", (route) =>
    route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "Internal Server Error",
    }),
  );
  await page.getByLabel("Ad soyad").fill("Nazyr Abbas");
  await page.getByLabel("Şirket adı").fill("AİA Travel");
  await page.getByLabel("E-posta").fill("nazyr@example.com");
  await page.locator('input[name="password"]').fill("GuvenliParola2026");
  await page.getByRole("button", { name: "Şirket hesabını oluştur" }).click();
  await expect(page.locator(".auth-error")).toHaveText(
    "Sunucuya şu anda ulaşılamıyor. Lütfen kısa bir süre sonra tekrar deneyin.",
  );
});
