import { expect, test } from "@playwright/test";

/**
 * Bu dosyada bilerek hiçbir `page.route` mock'u yok. Tarayıcının gerçekten
 * gönderdiği gövde, gerçek Zod şemasına ve gerçek veritabanına gider.
 *
 * Senaryo telefon ve e-postayı **boş bırakır**: form bu alanları `null`
 * gönderir ve `createCustomerSchema` bir dönem `null` kabul etmediği için
 * müşteri oluşturma gerçek API'ye karşı 400 dönüyordu. Mock'lu paket bunu
 * göremiyordu çünkü POST yanıtını testin kendisi üretiyordu.
 */
const stamp = Date.now();
const owner = {
  name: "Smoke Test Kullanıcısı",
  email: `smoke-${stamp}@example.com`,
  password: "GuvenliParola2099",
  organizationName: `Smoke Test Servis ${stamp}`,
};

test("registers, creates a customer with blank contact fields, then a job", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/v1/") && response.status() >= 400)
      failures.push(`${response.status()} ${url}`);
  });

  await page.goto("/kayit");
  await page.getByLabel("Ad soyad").fill(owner.name);
  await page.getByLabel("E-posta").fill(owner.email);
  await page.getByRole("textbox", { name: "Parola" }).fill(owner.password);
  await page.getByLabel("Şirket adı").fill(owner.organizationName);
  await page.getByRole("button", { name: /Şirket hesabını oluştur/ }).click();
  await expect(page.getByRole("heading", { name: /Merhaba/ })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Müşteriler", exact: true }).click();
  await expect(
    page.getByText("Filtrelerle eşleşen müşteri bulunamadı."),
  ).toBeVisible();

  // Sadece zorunlu alanlar: telefon, alternatif telefon ve e-posta boş.
  await page.getByRole("button", { name: "Yeni müşteri" }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Boş");
  await page.getByLabel("Soyad").fill("İletişim");
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(
    page.getByRole("heading", { name: "Boş İletişim" }),
  ).toBeVisible();
  // Kaydedilen müşteri gerçekten okunabiliyor ve boş alanlar boş görünüyor.
  await expect(page.getByText("MUS-000001")).toBeVisible();

  await page.getByRole("button", { name: "İş Emirleri", exact: true }).click();
  await expect(page.getByText("İş emri bulunmuyor.")).toBeVisible();
  await page.getByRole("button", { name: "Yeni iş emri" }).click();
  // 0. seçenek "Seçin" placeholder'ı; tek müşteri olduğu için 1. seçenek o.
  await page.getByLabel("Müşteri").selectOption({ index: 1 });
  await page.getByLabel("Başlık").fill("Yıllık bakım");
  await page.getByLabel("Kategori").fill("Klima");
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(page.getByRole("heading", { name: "Yıllık bakım" })).toBeVisible();

  // Liste görünümünde de kalıcı olmalı (detay ekranındaki yerel state değil).
  await page.getByRole("button", { name: "İş emirlerine dön" }).click();
  // İş emri numarası içinde bulunulan yılı taşır, bu yüzden yıl sabitlenmez.
  await expect(page.getByText(/WO-\d{4}-000001/)).toBeVisible();
  await expect(page.getByText("Boş İletişim")).toBeVisible();

  expect(failures, `başarısız API çağrıları: ${failures.join(", ")}`).toEqual(
    [],
  );
});
