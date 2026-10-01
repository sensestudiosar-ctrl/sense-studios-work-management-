import { jest } from "@jest/globals";
import { NotificationChannel, NotificationDeliveryState } from "./generated/prisma/client.js";
import { NotificationWorker } from "./notification-worker.js";

const ids = {
  event: "23ed69a9-cff6-4812-8c46-3b445124f9e2", notice: "1eaf4272-5ed8-4d64-b792-676971dbf3a4",
  delivery: "084f047c-2f17-42dc-bd47-857302914bb6", task: "0378a7a6-35f9-45e2-a54e-cc44d963c818",
  organization: "bcbb278e-fdbc-469f-8882-951196ac6580", employee: "a16f7527-6f87-4005-947f-b272049ce2e4",
  account: "638bd1e2-6d91-4f45-8945-e3ddb9dd1d85", team: "09c02e64-acbf-44a0-a980-10fed66c8784"
};

function harness(authorized: boolean, leaseOwned = true, category = "task.waiting") {
  const notice = { id: ids.notice, eventId: ids.event, recipientAccountId: ids.account, channel: NotificationChannel.IN_APP,
    category, title: "Task is waiting", body: "Review the task", internalRoute: `/?taskId=${ids.task}`, mandatory: false, critical: false, attempts: 0 };
  const tx = {
    $queryRaw: jest.fn(async (sql: TemplateStringsArray) => sql.join("").includes("leaseToken") && !leaseOwned ? [] : [{ id: ids.employee }]),
    outboxDelivery: { update: jest.fn(async () => ({})) },
    domainEvent: { findUnique: jest.fn(async () => ({ id: ids.event, eventName: category, subjectType: category === "review.escalated" ? "review" : "task", subjectId: ids.task, organizationId: ids.organization })) },
    reviewRound: { findUnique: jest.fn(async () => ({ id: ids.task, organizationId: ids.organization, projectId: ids.task })) },
    task: { findFirst: jest.fn(async () => ({ id: ids.task, organizationId: ids.organization, primaryOwnerEmployeeId: ids.employee, projectId: null })) },
    employee: { findUnique: jest.fn(async () => ({ id: ids.employee, accountId: ids.account, homeTeamId: ids.team })) },
    account: { findFirst: jest.fn(async () => ({ id: ids.account })) },
    notification: { findFirst: jest.fn(async () => notice), updateMany: jest.fn(async () => ({ count: 1 })) },
    notificationPreference: { findUnique: jest.fn(async () => null) }
  };
  const prisma = {
    $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    notification: { findMany: jest.fn(async () => [notice]), updateMany: jest.fn(async () => ({ count: 1 })) },
    outboxDelivery: { updateMany: jest.fn(async () => ({ count: 1 })) }
  };
  let claim = true;
  tx.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => {
    if (claim) { claim = false; return [{ id: ids.delivery, eventId: ids.event, attempts: 0 }]; }
    return sql.join("").includes("leaseToken") && !leaseOwned ? [] : [{ id: ids.employee }];
  });
  // A pre-transaction check would still allow this account. The locked check
  // sees its current state, which may have changed since the event was queued.
  const predicate = { isAuthorized: jest.fn(async (_event: string, _account: string, client?: unknown) => client ? authorized : true) };
  const email = { send: jest.fn(async () => undefined) };
  const worker = new NotificationWorker({ prisma } as never, email as never, { isVerified: async () => true }, predicate, { webOrigin: "https://app.example.test" } as never);
  return { worker, tx, prisma, predicate, email };
}

describe("atomic S10 in-app delivery", () => {
  it("suppresses a notice whose current recipient authorization has been revoked", async () => {
    const { worker, tx, prisma, predicate, email } = harness(false);
    await worker.runBatch();
    expect(predicate.isAuthorized).toHaveBeenCalledWith(ids.event, ids.account, tx);
    expect(tx.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      deliveryState: NotificationDeliveryState.DEAD, failureCode: "recipient_not_authorized"
    } }));
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("checks scope and marks an authorized notice inside the same transaction", async () => {
    const { worker, tx, prisma, predicate } = harness(true);
    await worker.runBatch();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(predicate.isAuthorized).toHaveBeenCalledWith(ids.event, ids.account, tx);
    expect(tx.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      deliveryState: NotificationDeliveryState.DELIVERED, deliveredAt: expect.any(Date), failureCode: null
    } }));
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it("does not check or deliver when the worker no longer owns the durable lease", async () => {
    const { worker, tx, predicate } = harness(true, false);
    await worker.runBatch();
    expect(predicate.isAuthorized).not.toHaveBeenCalled();
    expect(tx.notification.updateMany).not.toHaveBeenCalled();
  });
});

describe("atomic S13 escalation delivery", () => {
  it("fences Lead and permission changes before checking authorization in the delivery transaction", async () => {
    const { worker, tx, prisma, predicate } = harness(false, true, "review.escalated");
    await worker.runBatch();
    expect(predicate.isAuthorized).toHaveBeenCalledTimes(1);
    expect(predicate.isAuthorized).toHaveBeenCalledWith(ids.event, ids.account, tx);
    const locks = tx.$queryRaw.mock.calls.map(([sql]) => sql.join(""));
    expect(locks.some((sql) => sql.includes('FROM "projects"') && sql.includes("FOR SHARE"))).toBe(true);
    expect(locks.some((sql) => sql.includes('FROM "employees"') && sql.includes("FOR UPDATE"))).toBe(true);
    expect(locks.some((sql) => sql.includes('FROM "employee_permission_overrides"') && sql.includes("FOR SHARE"))).toBe(true);
    expect(tx.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      deliveryState: NotificationDeliveryState.DEAD, failureCode: "recipient_not_authorized"
    } }));
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it("marks an authorized escalation delivered under the same lease and transaction", async () => {
    const { worker, tx, predicate } = harness(true, true, "review.escalated");
    await worker.runBatch();
    expect(predicate.isAuthorized).toHaveBeenCalledWith(ids.event, ids.account, tx);
    expect(tx.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
      deliveryState: NotificationDeliveryState.DELIVERED, deliveredAt: expect.any(Date), failureCode: null
    } }));
  });

  it("does not deliver an escalation after losing the durable lease", async () => {
    const { worker, tx, predicate } = harness(true, false, "review.escalated");
    await worker.runBatch();
    expect(predicate.isAuthorized).not.toHaveBeenCalled();
    expect(tx.notification.updateMany).not.toHaveBeenCalled();
  });
});
