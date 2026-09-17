import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import Redis from "ioredis";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis = new Redis(
    process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_500,
      retryStrategy: () => null,
    },
  );
  private readonly storage = new S3Client({
    region: "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {
    this.redis.on("error", () => undefined);
  }
  async check() {
    const results = await Promise.allSettled([
      this.database.$queryRaw`SELECT 1`,
      (async () => {
        if (this.redis.status === "wait" || this.redis.status === "end")
          await this.redis.connect();
        return this.redis.ping();
      })(),
      this.storage.send(
        new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }),
        { abortSignal: AbortSignal.timeout(2_500) },
      ),
    ]);
    const checks = Object.fromEntries(
      ["database", "redis", "storage"].map((name, index) => [
        name,
        results[index]?.status === "fulfilled" ? "up" : "down",
      ]),
    );
    if (results.some((result) => result.status === "rejected"))
      throw new ServiceUnavailableException({ status: "not_ready", checks });
    return { status: "ready", checks };
  }
  async onModuleDestroy() {
    this.redis.disconnect();
    this.storage.destroy();
  }
}
