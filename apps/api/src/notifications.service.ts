import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationDeliveryState, OutboxConsumer, type Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { validateQuietHours, type QuietHours } from "./notification-time.js";

const pageSize = 50;
const categoryPattern = /^[a-z0-9][a-z0-9._-]{0,99}$/;

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

function hasSensitiveContent(value: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\bBearer\s+\S+/i.test(value)
    || /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(value)
    || /(?:[A-Za-z]:\\|\\\\[^\\]+\\|\/(?:mnt|nas|srv|volume|shares?)\/)/i.test(value);
}

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.prisma; }

  async createForEvent(tx: Prisma.TransactionClient, input: {
    eventId: string; recipientAccountId: string; channel: NotificationChannel; category: string;
    title: string; body: string; internalRoute: string; critical?: boolean; mandatory?: boolean;
  }) {
    if (!categoryPattern.test(input.category) || !input.title.trim() || input.title.length > 180 || input.body.length > 1000
      || hasSensitiveContent(input.title) || hasSensitiveContent(input.body) || hasSensitiveContent(input.internalRoute)
      || !input.internalRoute.startsWith("/") || input.internalRoute.startsWith("//") || input.internalRoute.includes("\\") || hasControlCharacter(input.internalRoute)) {
      throw new BadRequestException("Invalid notification content");
    }
    const outbox = await tx.outboxDelivery.findUnique({ where: {
      eventId_consumer: { eventId: input.eventId, consumer: OutboxConsumer.NTF }
    }, select: { id: true } });
    if (!outbox) throw new BadRequestException("Notification event has no transactional outbox delivery");
    const mandatory = input.mandatory ?? false;
    if (!mandatory) {
      const preference = await tx.notificationPreference.findUnique({ where: {
        accountId_category_channel: { accountId: input.recipientAccountId, category: input.category, channel: input.channel }
      }, select: { enabled: true } });
      if (preference && !preference.enabled) return { created: false, reason: "preference_disabled" };
    }
    await tx.notification.createMany({
      data: [{
        eventId: input.eventId, recipientAccountId: input.recipientAccountId, channel: input.channel,
        category: input.category, title: input.title, body: input.body, internalRoute: input.internalRoute,
        critical: input.critical ?? false, mandatory,
        deliveryState: NotificationDeliveryState.PENDING
      }],
      skipDuplicates: true
    });
    return { created: true };
  }

  async listInbox(accountId: string, cursor?: string) {
    if (cursor) {
      const cursorRow = await this.db.notification.findFirst({ where: { id: cursor, recipientAccountId: accountId, channel: NotificationChannel.IN_APP }, select: { id: true } });
      if (!cursorRow) throw new BadRequestException("Invalid notification cursor");
    }
    const rows = await this.db.notification.findMany({
      where: { recipientAccountId: accountId, channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.DELIVERED },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: pageSize + 1,
      select: { id: true, category: true, title: true, body: true, internalRoute: true, critical: true, mandatory: true, createdAt: true, readAt: true }
    });
    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize);
    return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  async markRead(accountId: string, notificationId: string) {
    const updated = await this.db.notification.updateMany({
      where: { id: notificationId, recipientAccountId: accountId, channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.DELIVERED, readAt: null },
      data: { readAt: new Date() }
    });
    if (updated.count === 0) {
      const own = await this.db.notification.findFirst({ where: { id: notificationId, recipientAccountId: accountId, channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.DELIVERED }, select: { id: true } });
      if (!own) throw new NotFoundException("Notification not found");
    }
    return { read: true };
  }

  async getPreferences(accountId: string) {
    const [preferences, quietHours] = await Promise.all([
      this.db.notificationPreference.findMany({ where: { accountId }, orderBy: [{ category: "asc" }, { channel: "asc" }], select: { category: true, channel: true, enabled: true } }),
      this.db.notificationQuietHours.findUnique({ where: { accountId }, select: { startLocal: true, endLocal: true, timeZone: true } })
    ]);
    return { preferences, quietHours };
  }

  async getEmailDeliveryStatus(accountId: string) {
    return this.db.notification.findMany({
      where: { recipientAccountId: accountId, channel: NotificationChannel.EMAIL },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, title: true, deliveryState: true, attempts: true, failureCode: true, createdAt: true, deliveredAt: true }
    });
  }

  async setPreference(accountId: string, category: string, channel: NotificationChannel, enabled: boolean) {
    if (!categoryPattern.test(category)) throw new BadRequestException("Invalid notification category");
    await this.db.notificationPreference.upsert({
      where: { accountId_category_channel: { accountId, category, channel } },
      create: { accountId, category, channel, enabled },
      update: { enabled }
    });
    return { category, channel, enabled };
  }

  async setQuietHours(accountId: string, value: QuietHours) {
    try { validateQuietHours(value); }
    catch { throw new BadRequestException("Invalid quiet-hours configuration"); }
    const data: Prisma.NotificationQuietHoursUncheckedCreateInput = {
      accountId, startLocal: value.startLocal, endLocal: value.endLocal, timeZone: value.timeZone
    };
    await this.db.notificationQuietHours.upsert({ where: { accountId }, create: data, update: data });
    return value;
  }

  async clearQuietHours(accountId: string) {
    await this.db.notificationQuietHours.deleteMany({ where: { accountId } });
    return { cleared: true };
  }
}
