import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./database.service.js";
import { IdentityService } from "./identity.service.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  const database = app.get(DatabaseService);
  const identity = app.get(IdentityService);
  await database.check();
  console.info("Identity worker process ready.");

  const interval = setInterval(() => {
    void database.check().catch(() => console.error("Worker database readiness failed."));
  }, 30_000);
  const identityCleanup = setInterval(() => {
    void identity.cleanupExpired().catch(() => console.error("Identity cleanup failed."));
  }, 60 * 60_000);

  const shutdown = async (): Promise<void> => {
    clearInterval(interval);
    clearInterval(identityCleanup);
    await app.close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

void bootstrap();
