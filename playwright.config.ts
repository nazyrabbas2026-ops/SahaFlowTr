import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: process.env.CI ? undefined : "msedge",
    headless: true,
  },
  reporter: "list",
  webServer: [
    {
      command: "pnpm --filter @sahaflow/web exec next dev -p 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @sahaflow/api dev",
      url: "http://127.0.0.1:4000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        JWT_ACCESS_SECRET: "e2e-access-secret-with-at-least-32-characters",
        REFRESH_TOKEN_PEPPER: "e2e-refresh-pepper-with-at-least-32-characters",
      },
    },
  ],
});
