import { access, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import EmbeddedPostgres from "embedded-postgres";

const root = process.cwd();
const databaseDir = resolve(root, ".local", "postgres");
const port = Number(process.env.LOCAL_POSTGRES_PORT ?? 5432);
const user = process.env.LOCAL_POSTGRES_USER ?? "sahaflow";
const password =
  process.env.LOCAL_POSTGRES_PASSWORD ?? "local-development-only";
const databaseName = process.env.LOCAL_POSTGRES_DB ?? "sahaflow";
const databaseUrl = `postgresql://${user}:${encodeURIComponent(password)}@127.0.0.1:${port}/${databaseName}?schema=public`;

await mkdir(resolve(root, ".local"), { recursive: true });
const postgres = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  persistent: true,
  initdbFlags: ["--no-locale", "--encoding=UTF8"],
  onLog: (message) => process.stdout.write(String(message)),
  onError: (error) => process.stderr.write(`${String(error)}\n`),
});

try {
  await access(resolve(databaseDir, "PG_VERSION"));
} catch {
  await postgres.initialise();
}

await postgres.start();
const admin = postgres.getPgClient();
await admin.connect();
const existing = await admin.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [databaseName],
);
await admin.end();
if (existing.rowCount === 0) await postgres.createDatabase(databaseName);

const migrationCommand =
  process.platform === "win32"
    ? {
        command: process.env.ComSpec ?? "cmd.exe",
        args: ["/d", "/s", "/c", "pnpm db:migrate"],
      }
    : { command: "pnpm", args: ["db:migrate"] };
const migration = spawnSync(migrationCommand.command, migrationCommand.args, {
  cwd: root,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  encoding: "utf8",
});
process.stdout.write(migration.stdout ?? "");
process.stderr.write(migration.stderr ?? "");
if (migration.error) process.stderr.write(`${String(migration.error)}\n`);
if (migration.status !== 0) {
  await postgres.stop();
  process.exit(migration.status ?? 1);
}

process.stdout.write(
  `Local PostgreSQL hazır: 127.0.0.1:${port}/${databaseName}\n`,
);
await new Promise(() => undefined);
