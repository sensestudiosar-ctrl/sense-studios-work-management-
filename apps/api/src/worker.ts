import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./database.service.js";
import { IdentityService } from "./identity.service.js";
import { NotificationWorker } from "./notification-worker.js";
import { AuditRetentionService } from "./audit-retention.service.js";
import { TaskRecurrenceService } from "./task-recurrence.service.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  const database = app.get(DatabaseService);
  const identity = app.get(IdentityService);
  const notificationWorker = app.get(NotificationWorker);
  const auditRetention = app.get(AuditRetentionService);
  const recurrence = app.get(TaskRecurrenceService);
  await database.check();
  console.info("Workspace worker process ready.");

  const interval = setInterval(() => {
    void database.check().catch(() => console.error("Worker database readiness failed."));
  }, 30_000);
  const identityCleanup = setInterval(() => {
    void identity.cleanupExpired().catch(() => console.error("Identity cleanup failed."));
  }, 60 * 60_000);
  const notificationDelivery = setInterval(() => {
    void notificationWorker.runBatch().catch(() => console.error("Notification processing failed."));
  }, 5_000);
  const runAuditRetention = async (): Promise<void> => {
    try {
      await auditRetention.scheduleDueNotices();
      await auditRetention.purgeEligibleEvents();
    } catch {
      console.error("Audit retention processing failed.");
    }
  };
  void runAuditRetention();
  const auditRetentionProcessing = setInterval(() => void runAuditRetention(), 60 * 60_000);
  let recurrenceRunning = false;
  const runRecurrence = async (): Promise<void> => {
    if (recurrenceRunning) return;
    recurrenceRunning = true;
    try { await recurrence.runBatch(); }
    catch { console.error("Task recurrence processing failed."); }
    finally { recurrenceRunning = false; }
  };
  void runRecurrence();
  const recurrenceProcessing = setInterval(() => void runRecurrence(), 60_000);

  const shutdown = async (): Promise<void> => {
    clearInterval(interval);
    clearInterval(identityCleanup);
    clearInterval(notificationDelivery);
    clearInterval(auditRetentionProcessing);
    clearInterval(recurrenceProcessing);
    await app.close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

void bootstrap();
