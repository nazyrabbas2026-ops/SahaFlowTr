import { startSmokeDatabase } from "./database";

export default async function globalSetup() {
  const { migrations, stop } = await startSmokeDatabase();
  process.stdout.write(
    `[smoke] geçici PostgreSQL hazır, ${migrations.length} migration uygulandı\n`,
  );
  return stop;
}
