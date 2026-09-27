import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AccountState, NotificationChannel, NotificationDeliveryState, OutboxDeliveryState } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { Inject } from "@nestjs/common";
import { BrevoEmailAdapter, SafeEmailDeliveryError } from "./brevo-email.js";
import { isWithinQuietHours } from "./notification-time.js";

export interface VerifiedAddressPredicate {
  isVerified(accountId: string, normalizedEmail: string): Promise<boolean>;
}
export const VERIFIED_ADDRESS_PREDICATE = Symbol("VERIFIED_ADDRESS_PREDICATE");

export interface CurrentRecipientAuthorizationPredicate {
  isAuthorized(eventId: string, accountId: string): Promise<boolean>;
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
