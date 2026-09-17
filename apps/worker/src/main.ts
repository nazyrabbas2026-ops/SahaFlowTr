import { Worker } from "bullmq";
const url = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const worker = new Worker(
  "system",
  async (job) => {
    if (job.name !== "health.ping") throw new Error("Unsupported system job");
    return { status: "ok" };
  },
  {
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    },
    concurrency: 2,
  },
);
worker.on("error", (error) =>
  console.error(
    JSON.stringify({ event: "worker.error", message: error.message }),
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    void worker.close().then(() => process.exit(0));
  });
