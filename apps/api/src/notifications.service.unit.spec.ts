import { BadRequestException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { NotificationChannel, NotificationDeliveryState } from "./generated/prisma/client.js";
import { NotificationsService } from "./notifications.service.js";

function harness() {
  const prisma = {
    notification: {
      findFirst: jest.fn(async () => ({ id: "n-1" })),
      findMany: jest.fn(async () => []),
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
});
