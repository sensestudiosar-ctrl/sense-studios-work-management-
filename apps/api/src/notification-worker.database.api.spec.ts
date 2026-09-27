import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, NotificationChannel, OutboxConsumer } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { PersistedVerifiedAddressPredicate, NotificationWorker, type CurrentRecipientAuthorizationPredicate } from "./notification-worker.js";
import type { RuntimeConfig } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
const workerDescribe = databaseUrl ? describe : describe.skip;
const config: RuntimeConfig = {
  nodeEnv: "test", port: 4000,
  databaseUrl: databaseUrl ?? "postgresql://sense_app_runtime@127.0.0.1:5432/sense_s04_test",
  webOrigin: "http://localhost:5173", ownerBootstrapEmail: undefined, ownerBootstrapSecret: undefined
};

workerDescribe("notification worker concurrency with PostgreSQL", () => {
  let database: DatabaseService;
  let secondDatabase: DatabaseService;
  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must point to a dedicated test database");
    database = new DatabaseService(config);
    secondDatabase = new DatabaseService(config);
    const rows = await database.prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
    if (!/_test(?:db)?$/i.test(rows[0]?.databaseName ?? "")) {
      await database.onModuleDestroy();
      throw new Error("Notification worker integration tests require a dedicated _test database");
    }
    const zones = await database.prisma.$queryRaw<Array<{ timeZone: string }>>`SELECT current_setting('TimeZone') AS "timeZone"`;
    expect(zones[0]?.timeZone).toBe("UTC");
  });
  afterAll(async () => { await database?.onModuleDestroy(); await secondDatabase?.onModuleDestroy(); });

  it("claims one outbox item across concurrent workers and rechecks persisted mailbox verification", async () => {
    const account = await database.prisma.account.create({ data: {
      normalizedEmail: `worker-${randomUUID()}@example.test`, kind: AccountKind.STAFF,
      state: AccountState.ACTIVE, emailVerifiedAt: new Date()
    } });
    const correlationId = randomUUID();
    const event = await database.prisma.domainEvent.create({ data: {
      eventName: "project.created", schemaVersion: 1, subjectType: "project", subjectId: randomUUID(),
      correlationId, payload: { test: true }
    } });
    const delivery = await database.prisma.outboxDelivery.create({ data: { eventId: event.id, consumer: OutboxConsumer.NTF } });
    const notification = await database.prisma.notification.create({ data: {
      eventId: event.id, recipientAccountId: account.id, channel: NotificationChannel.EMAIL,
      category: "test", title: "Test update", body: "Safe summary", internalRoute: "/test",
      deliveryState: "PENDING"
    } });

    let finishSend: (() => void) | undefined;
    let sendStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { sendStarted = resolve; });
    const holdSend = new Promise<void>((resolve) => { finishSend = resolve; });
    let sends = 0;
    const email = { send: async () => { sends += 1; sendStarted?.(); await holdSend; } };
    const recipients: CurrentRecipientAuthorizationPredicate = { isAuthorized: async () => true };
    const worker = new NotificationWorker(database, email as never, new PersistedVerifiedAddressPredicate(database), recipients, config);
    const concurrentWorker = new NotificationWorker(secondDatabase, email as never, new PersistedVerifiedAddressPredicate(secondDatabase), recipients, config);

    try {
      const first = worker.runBatch();
      await started;
      await expect(concurrentWorker.runBatch()).resolves.toBe(0);
      expect(sends).toBe(1);
      finishSend?.();
      await expect(first).resolves.toBe(1);
      expect((await database.prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).deliveryState).toBe("DELIVERED");
      expect((await database.prisma.outboxDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).state).toBe("DELIVERED");
    } finally {
      finishSend?.();
      await database.prisma.notification.deleteMany({ where: { id: notification.id } });
      await database.prisma.account.deleteMany({ where: { id: account.id } });
    }
  });
});
