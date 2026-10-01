import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AccountKind, AccountState, EmployeeState, NotificationChannel, NotificationDeliveryState, OutboxDeliveryState, type Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { ForbiddenException } from "@nestjs/common";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";
import { BrevoEmailAdapter, SafeEmailDeliveryError } from "./brevo-email.js";
import { isWithinQuietHours } from "./notification-time.js";
import { TaskService } from "./task.service.js";
import { lockTaskNotificationScope } from "./notification-task-locks.js";

export interface VerifiedAddressPredicate {
  isVerified(accountId: string, normalizedEmail: string): Promise<boolean>;
}
export const VERIFIED_ADDRESS_PREDICATE = Symbol("VERIFIED_ADDRESS_PREDICATE");

export interface CurrentRecipientAuthorizationPredicate {
  isAuthorized(eventId: string, accountId: string, tx?: Prisma.TransactionClient): Promise<boolean>;
}
export const CURRENT_RECIPIENT_AUTHORIZATION_PREDICATE = Symbol("CURRENT_RECIPIENT_AUTHORIZATION_PREDICATE");

/** Fail-closed until the product establishes an internal mailbox-verification policy. */
@Injectable()
export class UnverifiedAddressPredicate implements VerifiedAddressPredicate {
  async isVerified(): Promise<boolean> { return false; }
}

@Injectable()
export class PersistedVerifiedAddressPredicate implements VerifiedAddressPredicate {
  constructor(private readonly database: DatabaseService) {}
  async isVerified(accountId: string, normalizedEmail: string): Promise<boolean> {
    return (await this.db.account.findFirst({
      where: { id: accountId, normalizedEmail, state: AccountState.ACTIVE, emailVerifiedAt: { not: null } },
      select: { id: true }
    })) !== null;
  }
  private get db() { return this.database.prisma; }
}

/** Fail-closed because a generic event subject does not establish a recipient's current business scope. */
@Injectable()
export class UnauthorizedRecipientPredicate implements CurrentRecipientAuthorizationPredicate {
  async isAuthorized(): Promise<boolean> { return false; }
}

/** S09 authorizes only current Owner and assigned project contributors for exit alerts. */
@Injectable()
export class OperationalRecipientPredicate implements CurrentRecipientAuthorizationPredicate {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly tasks: TaskService = new TaskService(database, authorization)) {}
  async isAuthorized(eventId: string, accountId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    if (tx) {
      // TaskService's transaction wrapper must reuse the delivery transaction;
      // a nested independent transaction would release the scope locks early.
      const prisma = new Proxy(tx, { get(target, key) {
        if (key === "$transaction") return async (run: (client: Prisma.TransactionClient) => Promise<unknown>) => run(tx);
        return Reflect.get(target, key);
      } });
      const database = { prisma } as unknown as DatabaseService;
      const authorization = new AuthorizationService(database);
      return new OperationalRecipientPredicate(database, authorization, new TaskService(database, authorization)).isAuthorized(eventId, accountId);
    }
    const event = await this.database.prisma.domainEvent.findUnique({ where: { id: eventId } });
    if (event?.eventName === "review.escalated") {
      const payload = event.payload;
      const auditEventId = payload && typeof payload === "object" && !Array.isArray(payload) ? payload.auditEventId : undefined;
      if (typeof auditEventId !== "string" || event.subjectType !== "review" || !event.subjectId || !event.organizationId || !event.actorId) return false;
      const audit = await this.database.prisma.auditEvent.findUnique({ where: { id: auditEventId } });
      const after = audit?.after;
      if (!audit || audit.organizationId !== event.organizationId || audit.eventKey !== event.eventName || audit.subjectType !== event.subjectType || audit.subjectId !== event.subjectId || audit.actorId !== event.actorId || audit.correlationId !== event.correlationId || !audit.reason || !after || typeof after !== "object" || Array.isArray(after)) return false;
      if (typeof after.escalationId !== "string" || typeof after.projectId !== "string" || typeof after.taskId !== "string" || after.roundId !== event.subjectId || after.recipientAccountId !== accountId) return false;
      const escalation = await this.database.prisma.reviewEscalation.findUnique({ where: { id: after.escalationId } });
      if (!escalation || escalation.organizationId !== event.organizationId || escalation.projectId !== after.projectId || escalation.roundId !== event.subjectId || escalation.actorId !== event.actorId || escalation.recipientAccountId !== accountId || escalation.reason !== audit.reason) return false;
      const round = await this.database.prisma.reviewRound.findUnique({ where: { id: event.subjectId } });
      if (!round || round.organizationId !== event.organizationId || round.projectId !== escalation.projectId || round.taskId !== after.taskId) return false;
      const project = await this.database.prisma.project.findUnique({ where: { id: escalation.projectId } });
      if (!project || project.organizationId !== event.organizationId || project.status !== "ACTIVE") return false;
      const account = await this.database.prisma.account.findUnique({ where: { id: accountId }, include: { employee: true } });
      if (!account || account.state !== AccountState.ACTIVE) return false;
      if (account.kind === AccountKind.OWNER) return true;
      const employee = account.employee;
      if (account.kind !== AccountKind.STAFF || !employee || employee.state !== EmployeeState.ACTIVE || employee.organizationId !== event.organizationId || employee.id !== project.currentLeadEmployeeId || accountId === escalation.actorId) return false;
      const assignment = await this.database.prisma.projectAssignment.findFirst({ where: { organizationId: event.organizationId, projectId: project.id, employeeId: employee.id, revokedAt: null } });
      if (!assignment || employee.homeBranchId !== project.branchId && !assignment.crossBranchAuthorized) return false;
      try {
        await this.authorization.assertPermission(accountId, "project.view", { kind: "BRANCH", organizationId: event.organizationId, branchId: project.branchId });
        return true;
      } catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
    }
    if (event?.eventName === "task.waiting") return this.tasks.waitingAlertAuthorized(eventId, accountId);
    if (event?.eventName === "task.dependency_completed") {
      const payload = event.payload;
      const auditEventId = payload && typeof payload === "object" && !Array.isArray(payload) ? payload.auditEventId : undefined;
      if (typeof auditEventId !== "string") return false;
      const audit = await this.database.prisma.auditEvent.findUnique({ where: { id: auditEventId } });
      const after = audit?.after;
      const dependentTaskId = event.subjectId;
      const organizationId = event.organizationId;
      if (typeof dependentTaskId !== "string" || typeof organizationId !== "string" || audit?.eventKey !== event.eventName || audit.subjectId !== dependentTaskId || !after || typeof after !== "object" || Array.isArray(after)) return false;
      const predecessorTaskId = after.predecessorTaskId;
      if (typeof predecessorTaskId !== "string" || after.dependentTaskId !== dependentTaskId) return false;
      const dependent = await this.database.prisma.task.findFirst({ where: { id: dependentTaskId, organizationId }, include: { project: true, primaryOwner: { include: { account: true } } } });
      if (!dependent || dependent.status !== "WAITING" || dependent.requiresReassignment || !dependent.waitingDelayCause ||
        !dependent.project || dependent.project.status !== "ACTIVE" || dependent.primaryOwner.state !== EmployeeState.ACTIVE ||
        dependent.primaryOwner.account.state !== AccountState.ACTIVE || dependent.primaryOwner.accountId !== accountId) return false;
      const edge = await this.database.prisma.taskDependency.findFirst({ where: { dependentTaskId: dependent.id, predecessorTaskId, removedAt: null, predecessorTask: { status: "COMPLETED" } } });
      if (!edge) return false;
      const assignment = await this.database.prisma.projectAssignment.findFirst({ where: { projectId: dependent.project.id, employeeId: dependent.primaryOwnerEmployeeId, revokedAt: null } });
      if (!assignment || dependent.primaryOwner.homeBranchId !== dependent.project.branchId && !assignment.crossBranchAuthorized) return false;
      try {
        await this.authorization.assertPermission(accountId, "project.view", { kind: "BRANCH", organizationId, branchId: dependent.project.branchId });
        return true;
      } catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
    }
    if (event?.eventName !== "organization.employee.exited" && event?.eventName !== "project.on_hold") return false;
    const account = await this.database.prisma.account.findUnique({ where: { id: accountId }, include: { employee: true } });
    if (!account || account.state !== AccountState.ACTIVE) return false;
    if (account.kind === AccountKind.OWNER) return true;
    if (event.eventName === "organization.employee.exited") return false;
    if (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== event.organizationId) return false;
    const payload = event.payload;
    const auditEventId = payload && typeof payload === "object" && !Array.isArray(payload) ? payload.auditEventId : undefined;
    if (typeof auditEventId !== "string") return false;
    const audit = await this.database.prisma.auditEvent.findUnique({ where: { id: auditEventId } });
    const after = audit?.after;
    if (audit?.reason !== "Current Project Lead exited; Owner replacement required" || !after || typeof after !== "object" || Array.isArray(after) || after.status !== "ON_HOLD") return false;
    const assignments = await this.database.prisma.projectAssignment.findMany({ where: { organizationId: event.organizationId, employeeId: account.employee.id, projectId: event.subjectId, revokedAt: null }, include: { project: true } });
    for (const assignment of assignments) {
      if (account.employee.homeBranchId !== assignment.project.branchId && !assignment.crossBranchAuthorized) continue;
      try {
        await this.authorization.assertPermission(accountId, "project.view", { kind: "BRANCH", organizationId: event.organizationId, branchId: assignment.project.branchId });
        return true;
      } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    return false;
  }
}

interface ClaimedDelivery { id: string; eventId: string; attempts: number; leaseToken: string }
const maxAttempts = 5;
const leaseDurationMs = 2 * 60_000;
const leaseRenewalIntervalMs = 30_000;

@Injectable()
export class NotificationWorker {
  constructor(
    private readonly database: DatabaseService,
    private readonly email: BrevoEmailAdapter,
    @Inject(VERIFIED_ADDRESS_PREDICATE) private readonly verifiedAddress: VerifiedAddressPredicate,
    @Inject(CURRENT_RECIPIENT_AUTHORIZATION_PREDICATE) private readonly recipientAuthorization: CurrentRecipientAuthorizationPredicate,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private get db() { return this.database.prisma; }

  async runBatch(): Promise<number> {
    const delivery = await this.claim();
    if (delivery) await this.process(delivery);
    return delivery ? 1 : 0;
  }

  private async claim(): Promise<ClaimedDelivery | null> {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; eventId: string; attempts: number }>>`
        SELECT "id", "eventId", "attempts" FROM "outbox_deliveries"
        WHERE ("state" = 'PENDING' AND "availableAt" <= CURRENT_TIMESTAMP)
           OR ("state" = 'LEASED' AND "leaseExpiresAt" <= CURRENT_TIMESTAMP)
        ORDER BY "availableAt", "id"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      const row = rows[0];
      if (!row) return null;
      const leaseToken = randomUUID();
      await tx.outboxDelivery.update({ where: { id: row.id }, data: {
        state: OutboxDeliveryState.LEASED,
        attempts: { increment: 1 },
        leaseToken,
        leaseExpiresAt: new Date(Date.now() + leaseDurationMs)
      } });
      return { id: row.id, eventId: row.eventId, attempts: row.attempts + 1, leaseToken };
    });
  }

  private async process(delivery: ClaimedDelivery): Promise<void> {
    let leaseLost = false;
    let renewal: Promise<void> | null = null;
    const timer = setInterval(() => {
      if (renewal || leaseLost) return;
      renewal = this.db.outboxDelivery.updateMany({
        where: { id: delivery.id, state: OutboxDeliveryState.LEASED, leaseToken: delivery.leaseToken },
        data: { leaseExpiresAt: new Date(Date.now() + leaseDurationMs) }
      }).then((result) => { if (result.count !== 1) leaseLost = true; }).catch(() => { leaseLost = true; }).finally(() => { renewal = null; });
    }, leaseRenewalIntervalMs);
    try {
      await this.processOwned(delivery, () => leaseLost);
    } finally {
      clearInterval(timer);
      await renewal;
    }
  }

  private async processOwned(delivery: ClaimedDelivery, hasLostLease: () => boolean): Promise<void> {
    try {
      const pending = await this.db.notification.findMany({ where: {
        eventId: delivery.eventId,
        deliveryState: NotificationDeliveryState.PENDING
      }, select: {
        id: true, recipientAccountId: true, channel: true, category: true, title: true, body: true, internalRoute: true,
        critical: true, mandatory: true, attempts: true
      }, orderBy: { id: "asc" } });

      let deferUntil: Date | undefined;
      let retryAt: Date | undefined;
      for (const notification of pending) {
        if (hasLostLease()) return;
        if (notification.channel === NotificationChannel.IN_APP && ["task.waiting", "task.dependency_completed", "review.escalated"].includes(notification.category)) {
          await this.deliverTaskNotice(delivery, notification.id, notification.recipientAccountId);
          continue;
        }
        if (!await this.recipientAuthorization.isAuthorized(delivery.eventId, notification.recipientAccountId)) {
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: NotificationDeliveryState.DEAD, failureCode: "recipient_not_authorized"
          } });
          continue;
        }
        const account = await this.db.account.findFirst({ where: { id: notification.recipientAccountId, state: AccountState.ACTIVE }, select: { id: true, normalizedEmail: true } });
        if (!account || (notification.channel === NotificationChannel.EMAIL && !await this.verifiedAddress.isVerified(account.id, account.normalizedEmail))) {
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: NotificationDeliveryState.DEAD, failureCode: "recipient_unverified"
          } });
          continue;
        }

        const preference = notification.mandatory ? null : await this.db.notificationPreference.findUnique({ where: {
          accountId_category_channel: { accountId: account.id, category: notification.category, channel: notification.channel }
        }, select: { enabled: true } });
        if (preference && !preference.enabled) {
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: NotificationDeliveryState.DEAD, failureCode: "preference_disabled"
          } });
          continue;
        }

        if (notification.channel === NotificationChannel.IN_APP) {
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: NotificationDeliveryState.DELIVERED, deliveredAt: new Date(), failureCode: null
          } });
          continue;
        }

        if (!notification.mandatory && !notification.critical) {
          const quietHours = await this.db.notificationQuietHours.findUnique({ where: { accountId: account.id } });
          if (quietHours && isWithinQuietHours(new Date(), quietHours)) {
            const next = nextOutsideQuietHours(new Date(), quietHours);
            if (!deferUntil || next < deferUntil) deferUntil = next;
            continue;
          }
        }

        try {
          const url = new URL(notification.internalRoute, this.config.webOrigin);
          await this.email.send(account.normalizedEmail, {
            subject: notification.title,
            textContent: `${notification.body}\n\n${url.toString()}`
          });
          if (hasLostLease()) return;
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: NotificationDeliveryState.DELIVERED, deliveredAt: new Date(), attempts: { increment: 1 }, failureCode: null
          } });
        } catch (error) {
          if (hasLostLease()) return;
          const failureCode = error instanceof SafeEmailDeliveryError ? error.failureCode : "email_delivery_failed";
          const attempts = notification.attempts + 1;
          const dead = attempts >= maxAttempts;
          const availableAt = new Date(Date.now() + Math.min(60 * 60_000, 15_000 * 2 ** Math.max(0, attempts - 1)));
          await this.db.notification.updateMany({ where: { id: notification.id, deliveryState: NotificationDeliveryState.PENDING }, data: {
            deliveryState: dead ? NotificationDeliveryState.DEAD : NotificationDeliveryState.PENDING,
            attempts, failureCode
          } });
          if (!dead && (!retryAt || availableAt > retryAt)) retryAt = availableAt;
        }
      }

      if (hasLostLease()) return;
      if (deferUntil || retryAt) {
        const availableAt = deferUntil && retryAt ? (deferUntil > retryAt ? deferUntil : retryAt) : deferUntil ?? retryAt!;
        await this.release(delivery, OutboxDeliveryState.PENDING, availableAt, retryAt ? "email_retry_scheduled" : null);
      } else {
        await this.db.outboxDelivery.updateMany({ where: { id: delivery.id, state: OutboxDeliveryState.LEASED, leaseToken: delivery.leaseToken }, data: {
          state: OutboxDeliveryState.DELIVERED, deliveredAt: new Date(), leaseToken: null, leaseExpiresAt: null, failureCode: null
        } });
      }
    } catch {
      // claim() already increments the durable attempt counter before work starts.
      const attempts = delivery.attempts;
      await this.release(delivery, attempts >= maxAttempts ? OutboxDeliveryState.DEAD : OutboxDeliveryState.PENDING,
        new Date(Date.now() + Math.min(60 * 60_000, 15_000 * 2 ** Math.max(0, attempts - 1))), "notification_processing_failed", attempts);
    }
  }

  private async deliverTaskNotice(delivery: ClaimedDelivery, notificationId: string, recipientAccountId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const lease = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "outbox_deliveries"
        WHERE "id"=${delivery.id}::uuid AND "state"='LEASED' AND "leaseToken"=${delivery.leaseToken}::uuid
          AND "leaseExpiresAt">CURRENT_TIMESTAMP FOR SHARE`;
      if (!lease[0]) return;
      await tx.$queryRaw`SELECT "id" FROM "notifications" WHERE "id"=${notificationId}::uuid FOR UPDATE`;
      const notice = await tx.notification.findFirst({ where: { id: notificationId, eventId: delivery.eventId, recipientAccountId, channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.PENDING } });
      if (!notice) return;
      const scopeLocked = notice.category === "review.escalated"
        ? await this.lockReviewEscalationScope(tx, delivery.eventId, recipientAccountId)
        : await lockTaskNotificationScope(tx, delivery.eventId, recipientAccountId);
      const authorized = scopeLocked && await this.recipientAuthorization.isAuthorized(delivery.eventId, recipientAccountId, tx);
      const account = authorized ? await tx.account.findFirst({ where: { id: recipientAccountId, state: AccountState.ACTIVE } }) : null;
      let failureCode: string | null = !authorized ? "recipient_not_authorized" : !account ? "recipient_unverified" : null;
      if (!failureCode && !notice.mandatory) {
        const preference = await tx.notificationPreference.findUnique({ where: { accountId_category_channel: { accountId: recipientAccountId, category: notice.category, channel: notice.channel } } });
        if (preference && !preference.enabled) failureCode = "preference_disabled";
      }
      await tx.notification.updateMany({ where: { id: notice.id, deliveryState: NotificationDeliveryState.PENDING }, data: failureCode
        ? { deliveryState: NotificationDeliveryState.DEAD, failureCode }
        : { deliveryState: NotificationDeliveryState.DELIVERED, deliveredAt: new Date(), failureCode: null } });
    }, { timeout: 30_000 });
  }

  private async lockReviewEscalationScope(tx: Prisma.TransactionClient, eventId: string, recipientAccountId: string): Promise<boolean> {
    const event = await tx.domainEvent.findUnique({ where: { id: eventId } });
    if (!event || event.eventName !== "review.escalated" || event.subjectType !== "review" || !event.organizationId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.subjectId)) return false;
    const round = await tx.reviewRound.findUnique({ where: { id: event.subjectId } });
    if (!round || round.organizationId !== event.organizationId) return false;
    // Keep the Lead, active project, assignment and recipient permissions stable
    // through the current-recipient check and the DELIVERED write.
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${round.projectId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "project_assignments" WHERE "projectId"=${round.projectId}::uuid ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${recipientAccountId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "teams" WHERE "id" IN (SELECT "homeTeamId" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "branches" WHERE "id" IN (SELECT "homeBranchId" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "employee_job_role_assignments" WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "job_roles" WHERE "id" IN (SELECT "jobRoleId" FROM "employee_job_role_assignments" WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid)) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "role_permissions" WHERE "roleId" IN (SELECT "jobRoleId" FROM "employee_job_role_assignments" WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid)) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "employee_permission_overrides" WHERE "employeeId" IN (SELECT "id" FROM "employees" WHERE "accountId"=${recipientAccountId}::uuid) ORDER BY "id" FOR SHARE`;
    return true;
  }

  private async release(delivery: ClaimedDelivery, state: OutboxDeliveryState, availableAt: Date, failureCode: string | null, attempts?: number): Promise<void> {
    await this.db.outboxDelivery.updateMany({ where: { id: delivery.id, state: OutboxDeliveryState.LEASED, leaseToken: delivery.leaseToken }, data: {
      state, ...(attempts === undefined ? {} : { attempts }),
      availableAt, leaseToken: null, leaseExpiresAt: null, failureCode
    } });
  }
}

function nextOutsideQuietHours(now: Date, quietHours: { startLocal: string; endLocal: string; timeZone: string }): Date {
  const next = new Date(Math.ceil(now.getTime() / 60_000) * 60_000);
  for (let minute = 0; minute <= 36 * 60; minute += 1) {
    if (!isWithinQuietHours(next, quietHours)) return next;
    next.setTime(next.getTime() + 60_000);
  }
  return new Date(now.getTime() + 36 * 60 * 60_000);
}
