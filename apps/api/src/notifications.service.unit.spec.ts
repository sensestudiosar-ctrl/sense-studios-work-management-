import { BadRequestException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { NotificationChannel, NotificationDeliveryState } from "./generated/prisma/client.js";
import { NotificationsService } from "./notifications.service.js";

function harness() {
  const prisma = {
    notification: {
      findFirst: jest.fn(async () => ({ id: "n-1" })),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      updateMany: jest.fn(async () => ({ count: 1 })),
      createMany: jest.fn(async () => ({ count: 1 })),
    },
    notificationPreference: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
    },
    notificationQuietHours: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  return { service: new NotificationsService({ prisma } as never), prisma };
}

describe("NotificationsService recipient boundaries", () => {
  it("limits inbox cursors and rows to the signed-in account", async () => {
    const { service, prisma } = harness();
    await expect(service.listInbox("account-current", "foreign-cursor")).resolves.toMatchObject({ items: [] });
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: {
      id: "foreign-cursor", recipientAccountId: "account-current", channel: NotificationChannel.IN_APP
    }, select: { id: true } });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { recipientAccountId: "account-current", channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.DELIVERED }
    }));
  });

  it("denies foreign cursors and notification IDs without revealing their owners", async () => {
    const { service, prisma } = harness();
    prisma.notification.findFirst.mockResolvedValueOnce(null);
    await expect(service.listInbox("account-current", "foreign-cursor")).rejects.toBeInstanceOf(BadRequestException);
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.notification.findFirst.mockResolvedValueOnce(null);
    await expect(service.markRead("account-current", "foreign-notice")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ recipientAccountId: "account-current" }) }));
  });

  it("saves only the signed-in account's own preferences and validates IANA quiet hours", async () => {
    const { service, prisma } = harness();
    await service.setPreference("account-current", "projects", NotificationChannel.EMAIL, false);
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { accountId_category_channel: { accountId: "account-current", category: "projects", channel: NotificationChannel.EMAIL } },
      create: { accountId: "account-current", category: "projects", channel: NotificationChannel.EMAIL, enabled: false },
      update: { enabled: false }
    });
    await expect(service.setQuietHours("account-current", { startLocal: "22:00", endLocal: "07:00", timeZone: "Invalid/Zone" }))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.setQuietHours("account-current", { startLocal: "22:00", endLocal: "07:00", timeZone: "Asia/Kolkata" });
    expect(prisma.notificationQuietHours.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: "account-current" } }));
  });

  it("honors optional preferences but creates mandatory in-app notices despite opt-out", async () => {
    const { service } = harness();
    const tx = {
      outboxDelivery: { findUnique: jest.fn(async () => ({ id: "outbox-1" })) },
      notificationPreference: { findUnique: jest.fn(async () => ({ enabled: false })) },
      notification: { createMany: jest.fn(async () => ({ count: 1 })) }
    };
    await expect(service.createForEvent(tx as never, {
      eventId: "event-id", recipientAccountId: "account-current", channel: NotificationChannel.IN_APP,
      category: "projects", title: "Update", body: "Safe summary", internalRoute: "/projects/p-1"
    })).resolves.toEqual({ created: false, reason: "preference_disabled" });
    expect(tx.notification.createMany).not.toHaveBeenCalled();
    await service.createForEvent(tx as never, {
      eventId: "event-id", recipientAccountId: "account-current", channel: NotificationChannel.IN_APP,
      category: "projects", title: "Required update", body: "Safe summary", internalRoute: "/projects/p-1", mandatory: true
    });
    expect(tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({
      channel: NotificationChannel.IN_APP, deliveryState: NotificationDeliveryState.PENDING, mandatory: true
    })], skipDuplicates: true }));
  });

  it("rejects external routes and malformed categories before writing", async () => {
    const { service } = harness();
    const tx = { outboxDelivery: { findUnique: jest.fn(async () => ({ id: "outbox-1" })) }, notificationPreference: { findUnique: jest.fn(async () => null) }, notification: { createMany: jest.fn() } };
    await expect(service.createForEvent(tx as never, {
      eventId: "event-id", recipientAccountId: "account-current", channel: NotificationChannel.EMAIL,
      category: "projects", title: "Update", body: "Safe summary", internalRoute: "//attacker.example"
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createForEvent(tx as never, {
      eventId: "event-id", recipientAccountId: "account-current", channel: NotificationChannel.EMAIL,
      category: "projects", title: "Update", body: "Safe summary", internalRoute: "/\\attacker.example"
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createForEvent(tx as never, {
      eventId: "event-id", recipientAccountId: "account-current", channel: NotificationChannel.EMAIL,
      category: "projects", title: "Update", body: "Bearer credential-value", internalRoute: "/projects/p-1"
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it("scopes unread to the caller's delivered in-app notices with readAt unset, matching listInbox", async () => {
    const { service, prisma } = harness();
    const base = {
      recipientAccountId: "account-current",
      channel: NotificationChannel.IN_APP,
      deliveryState: NotificationDeliveryState.DELIVERED,
      readAt: null
    };
    await service.unreadSummary("account-current");
    expect(prisma.notification.count).toHaveBeenCalledTimes(2);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: base });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { ...base, critical: true } });
    // The where clause is identical to listInbox's, plus readAt — so badge and inbox cannot disagree
    const baseWithoutReadAt = { ...base };
    delete (baseWithoutReadAt as Record<string, unknown>).readAt;
    expect(prisma.notification.count).not.toHaveBeenCalledWith({ where: baseWithoutReadAt });
  });

  it("keeps critical separate from unread so the total is never inflated", async () => {
    const { service, prisma } = harness();
    // Promise.all resolves both counts; mockResolvedValueOnce queues in call order.
    prisma.notification.count.mockResolvedValueOnce(7); // unread total
    prisma.notification.count.mockResolvedValueOnce(4); // critical subset
    const summary = await service.unreadSummary("account-current");
    expect(summary).toEqual({ unread: 7, critical: 4 });
    // Critical is reported alongside unread, never folded into it
    expect(summary.critical).toBeLessThan(summary.unread);
  });

  it("returns zero without querying beyond the account boundary", async () => {
    const { service, prisma } = harness();
    prisma.notification.count.mockResolvedValue(0);
    const summary = await service.unreadSummary("account-current");
    expect(summary).toEqual({ unread: 0, critical: 0 });
    // Exactly two counts: one for unread total, one for critical. No paging, no foreign reads.
    expect(prisma.notification.count).toHaveBeenCalledTimes(2);
  });
});
