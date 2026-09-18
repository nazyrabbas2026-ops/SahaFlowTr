import { readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

/**
 * Smoke paketi gerçek bir PostgreSQL'e ihtiyaç duyar ama geliştiricinin
 * `.local/postgres` verisine dokunmamalıdır: her çalıştırma kendi geçici
 * veritabanını kurar, migration'ları uygular ve sonunda siler.
 */
export const SMOKE_DATABASE_PORT = 55_433;
const SMOKE_DATABASE_NAME = "sahaflow_smoke";
const SMOKE_DATABASE_USER = "postgres";
const SMOKE_DATABASE_PASSWORD = "smoke-test-password";

export const SMOKE_DATABASE_URL = `postgresql://${SMOKE_DATABASE_USER}:${SMOKE_DATABASE_PASSWORD}@127.0.0.1:${SMOKE_DATABASE_PORT}/${SMOKE_DATABASE_NAME}?schema=public`;

/** Migration dosyalarını diskten sırayla okur. Sabit bir liste tutulsaydı
 * yeni bir migration eklendiğinde sessizce geride kalırdı — bu, entegrasyon
 * testinde daha önce yaşanmış bir hatadır. */
async function applyMigrations(postgres: EmbeddedPostgres) {
  const migrationsDir = resolve("packages/database/prisma/migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrations = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const client = postgres.getPgClient(SMOKE_DATABASE_NAME);
  await client.connect();
  try {
    for (const migration of migrations) {
      const sql = await readFile(
        resolve(migrationsDir, migration, "migration.sql"),
        "utf8",
      );
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
  return migrations;
}

/** Geçici veritabanını başlatır ve onu kapatan fonksiyonu döner. */
export async function startSmokeDatabase() {
  const databaseDir = resolve(tmpdir(), `sahaflow-smoke-${Date.now()}`);
  const postgres = new EmbeddedPostgres({
    databaseDir,
    port: SMOKE_DATABASE_PORT,
    user: SMOKE_DATABASE_USER,
    password: SMOKE_DATABASE_PASSWORD,
    persistent: true,
    initdbFlags: ["--no-locale", "--encoding=UTF8"],
    onLog: () => undefined,
    onError: () => undefined,
  });
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase(SMOKE_DATABASE_NAME);
  const migrations = await applyMigrations(postgres);

  return {
    migrations,
    stop: async () => {
      await postgres.stop();
      await rm(databaseDir, {
        recursive: true,
        force: true,
        maxRetries: 8,
        retryDelay: 150,
      });
    },
  };
}
