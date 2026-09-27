import { jest } from "@jest/globals";
import { NotificationChannel, NotificationDeliveryState, OutboxDeliveryState } from "./generated/prisma/client.js";
import { NotificationWorker, type CurrentRecipientAuthorizationPredicate, type VerifiedAddressPredicate } from "./notification-worker.js";

const eventId = "23ed69a9-cff6-4812-8c46-3b445124f9e2";
const noticeId = "1eaf4272-5ed8-4d64-b792-676971dbf3a4";
const deliveryId = "084f047c-2f17-42dc-bd47-857302914bb6";

function harness(options: { pending?: object[]; rows?: Array<{ id: string; eventId: string; attempts: number }>; authorized?: boolean; verified?: boolean; send?: () => Promise<void>; renewalCount?: number } = {}) {
  const rows = options.rows ?? [{ id: deliveryId, eventId, attempts: 0 }];
  const tx = {
    $queryRaw: jest.fn(async () => rows),
    outboxDelivery: { update: jest.fn(async () => ({})) }
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)),
    notification: { findMany: jest.fn(async () => options.pending ?? []), updateMany: jest.fn(async () => ({ count: 1 })) },
    account: { findFirst: jest.fn(async () => ({ id: "account-id", normalizedEmail: "person@example.test" })) },
    notificationPreference: { findUnique: jest.fn(async () => null) },
    notificationQuietHours: { findUnique: jest.fn(async () => null) },
    outboxDelivery: { updateMany: jest.fn(async () => ({ count: options.renewalCount ?? 1 })) }
  };
  const authorization: CurrentRecipientAuthorizationPredicate = { isAuthorized: jest.fn(async () => options.authorized ?? false) };
  const verified: VerifiedAddressPredicate = { isVerified: jest.fn(async () => options.verified ?? false) };
  const email = { send: jest.fn(options.send ?? (async () => undefined)) };
  const config = { webOrigin: "https://app.example.test" };
  const worker = new NotificationWorker({ prisma } as never, email as never, verified, authorization, config as never);
  return { worker, prisma, tx, email, authorization, verified };
}

describe("notification outbox worker", () => {
  it("claims and processes only one delivery per runBatch", async () => {
    const secondId = "9c0ac000-0887-4c55-86a4-a29f8ea83cb4";
    const { worker, prisma, tx } = harness({ rows: [
      { id: deliveryId, eventId, attempts: 0 }, { id: secondId, eventId, attempts: 0 }
    ] });
    await expect(worker.runBatch()).resolves.toBe(1);
    expect(tx.outboxDelivery.update).toHaveBeenCalledTimes(1);
    expect(prisma.notification.findMany).toHaveBeenCalledTimes(1);
  });

  it("renews with the fencing token and stops finalization after lease ownership is lost", async () => {
    jest.useFakeTimers();
    let finishSend!: () => void;
    const send = () => new Promise<void>((resolve) => { finishSend = resolve; });
    const pending = [{ id: noticeId, recipientAccountId: "account-id", channel: NotificationChannel.EMAIL, category: "projects", title: "Project update", body: "A safe summary", internalRoute: "/projects/p-1", critical: false, mandatory: false, attempts: 0 }];
    const { worker, prisma, email } = harness({ pending, authorized: true, verified: true, send, renewalCount: 0 });
    try {
      const run = worker.runBatch();
      await jest.advanceTimersByTimeAsync(30_000);
      expect(prisma.outboxDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: deliveryId, state: OutboxDeliveryState.LEASED, leaseToken: expect.any(String) },
        data: { leaseExpiresAt: expect.any(Date) }
      }));
      finishSend();
      await run;
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
      expect(prisma.outboxDelivery.updateMany).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not mutate notification retry state when an in-flight send rejects after lease loss", async () => {
    jest.useFakeTimers();
    let failSend!: (reason: Error) => void;
    const send = () => new Promise<void>((_resolve, reject) => { failSend = reject; });
    const pending = [{ id: noticeId, recipientAccountId: "account-id", channel: NotificationChannel.EMAIL, category: "projects", title: "Project update", body: "A safe summary", internalRoute: "/projects/p-1", critical: false, mandatory: false, attempts: 0 }];
    const { worker, prisma, email } = harness({ pending, authorized: true, verified: true, send, renewalCount: 0 });
    try {
      const run = worker.runBatch();
      await jest.advanceTimersByTimeAsync(30_000);
      failSend(new Error("provider unavailable"));
      await run;
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
      expect(prisma.outboxDelivery.updateMany).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("claims under SKIP LOCKED and drains notification-neutral events without inventing notices", async () => {
    const { worker, prisma, tx, email } = harness();
    await expect(worker.runBatch()).resolves.toBe(1);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      eventId, deliveryState: NotificationDeliveryState.PENDING
    } }));
    expect(email.send).not.toHaveBeenCalled();
    expect(prisma.outboxDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: OutboxDeliveryState.DELIVERED }) }));
  });

  it("fails closed on recipient authorization and verified mailbox checks", async () => {
    const pending = [{ id: noticeId, recipientAccountId: "account-id", channel: NotificationChannel.EMAIL, category: "projects", title: "Safe title", body: "Safe summary", internalRoute: "/projects/p-1", critical: false, mandatory: false, attempts: 0 }];
    const { worker, prisma, email, verified, authorization } = harness({ pending });
    await worker.runBatch();
    expect(authorization.isAuthorized).toHaveBeenCalledWith(eventId, "account-id");
    expect(verified.isVerified).not.toHaveBeenCalled();
    expect(prisma.account.findFirst).not.toHaveBeenCalled();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deliveryState: NotificationDeliveryState.DEAD, failureCode: "recipient_not_authorized" }) }));
    expect(email.send).not.toHaveBeenCalled();

    const verifiedCase = harness({ pending, authorized: true, verified: false });
    await verifiedCase.worker.runBatch();
    expect(verifiedCase.verified.isVerified).toHaveBeenCalledWith("account-id", "person@example.test");
    expect(verifiedCase.prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ failureCode: "recipient_unverified" }) }));
    expect(verifiedCase.email.send).not.toHaveBeenCalled();
  });

  it("sends only safe email fields and records a successful delivery", async () => {
    const pending = [{ id: noticeId, recipientAccountId: "account-id", channel: NotificationChannel.EMAIL, category: "projects", title: "Project update", body: "A safe summary", internalRoute: "/projects/p-1", critical: false, mandatory: false, attempts: 0 }];
    const { worker, email, prisma } = harness({ pending, authorized: true, verified: true });
    await worker.runBatch();
    expect(email.send).toHaveBeenCalledWith("person@example.test", {
      subject: "Project update", textContent: expect.stringMatching(/^A safe summary\n\nhttps:\/\/app\.example\.test\/projects\/p-1$/)
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: noticeId, deliveryState: NotificationDeliveryState.PENDING }, data: expect.objectContaining({ deliveryState: NotificationDeliveryState.DELIVERED }) }));
  });

  it("persists only sanitized failure codes and schedules bounded retries", async () => {
    const pending = [{ id: noticeId, recipientAccountId: "account-id", channel: NotificationChannel.EMAIL, category: "projects", title: "Project update", body: "A safe summary", internalRoute: "/projects/p-1", critical: false, mandatory: false, attempts: 1 }];
    const failure = Object.assign(new Error("secret provider response"), { failureCode: "email_provider_unavailable" });
    const { worker, email, prisma } = harness({ pending, authorized: true, verified: true, send: async () => { throw failure; } });
    await worker.runBatch();
    expect(email.send).toHaveBeenCalled();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      deliveryState: NotificationDeliveryState.PENDING, attempts: 2, failureCode: "email_delivery_failed"
    }) }));
    expect(prisma.outboxDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      state: OutboxDeliveryState.PENDING, failureCode: "email_retry_scheduled", availableAt: expect.any(Date)
    }) }));
  });
});
