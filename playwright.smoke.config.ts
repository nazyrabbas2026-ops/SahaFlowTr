import { defineConfig } from "@playwright/test";
import { SMOKE_DATABASE_URL } from "./tests/smoke/database";

/**
 * Gerçek stack smoke paketi: `playwright.config.ts`'teki paketin aksine
 * hiçbir `page.route` mock'u kullanmaz, tarayıcıdan gerçek Next.js proxy'si
 * üzerinden gerçek NestJS API'sine ve gerçek PostgreSQL'e gider. Amacı, iki
 * tarafın sözleşmesinin (formun gönderdiği gövde ile Zod şemasının kabul
 * ettiği gövde) uyuştuğunu doğrulamaktır; mock'lu paket bunu yapısal olarak
 * göremez çünkü yanıtı testin kendisi uydurur.
 *
 * Kendi portlarını kullanır (web 3200, API 4100), böylece geliştirme
 * sunucuları (3000/4000) ve mock'lu e2e paketi (3100) ile çakışmaz.
 */
const webPort = 3200;
const apiPort = 4100;
const webOrigin = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "tests/smoke",
  globalSetup: "./tests/smoke/global-setup.ts",
  timeout: 90_000,
  // Gerçek veritabanına yazdığı için paralel çalıştırma yok.
  workers: 1,
  use: {
    baseURL: webOrigin,
    channel: process.env.CI ? undefined : "msedge",
    headless: true,
  },
  reporter: "list",
  webServer: [
    {
      // `next dev` aynı proje dizini için ikinci bir örneğe izin vermiyor, bu
      // yüzden smoke paketi kendi production build'ini ayrı bir çıktı
      // klasörüne alıp onu servis eder: geliştiricinin çalışan `pnpm dev`
      // sunucusu bozulmadan kalır.
      command: `pnpm --filter @sahaflow/web exec next build && pnpm --filter @sahaflow/web exec next start -p ${webPort}`,
      url: webOrigin,
      // Bu portta zaten bir sunucu varsa yeniden kullanmak, testin hangi kodu
      // çalıştırdığını belirsiz hâle getirir; smoke paketi her zaman kendi
      // sunucusunu başlatır.
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`,
        NEXT_DIST_DIR: ".next-smoke",
      },
    },
    {
      command: "pnpm --filter @sahaflow/api dev",
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(apiPort),
        DATABASE_URL: SMOKE_DATABASE_URL,
        WEB_ORIGIN: `${webOrigin},http://localhost:${webPort}`,
        JWT_ACCESS_SECRET: "smoke-access-secret-with-at-least-32-characters",
        REFRESH_TOKEN_PEPPER: "smoke-refresh-pepper-with-at-least-32-chars",
        FIELD_ENCRYPTION_KEY: "smoke-sensitive-field-key-with-32-characters",
      },
    },
  ],
});
