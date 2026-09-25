import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./database.service.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  const database = app.get(DatabaseService);
  await database.check();
  console.info("S01 worker process ready; no background jobs are enabled.");

  const interval = setInterval(() => {
    void database.check().catch(() => console.error("Worker database readiness failed."));
  }, 30_000);

  const shutdown = async (): Promise<void> => {
    clearInterval(interval);
    await app.close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

void bootstrap();
