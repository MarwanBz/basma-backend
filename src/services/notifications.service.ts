import { AppError } from "@/utils/appError";
import { Message } from "firebase-admin/messaging";
import { fcm_device_tokens_platform, user_role } from "@prisma/client";
import { getMessagingClient } from "@/config/firebaseAdmin";
import { logger } from "@/config/logger";
import { prisma } from "@/config/database";
import { randomUUID } from "crypto";

const ADMIN_TOPIC = process.env.FCM_ADMIN_TOPIC || "admin-updates";
const ADMIN_ROLES: user_role[] = [
  "SUPER_ADMIN",
  "MAINTENANCE_ADMIN",
  "BASMA_ADMIN",
  "ADMIN",
];

type SaveTokenInput = {
  token: string;
  topic: string;
  userId: string;
  platform?: fcm_device_tokens_platform | null;
  deviceId?: string | null;
  appVersion?: string | null;
};

type SendTopicInput = {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type RegisterDeviceInput = {
  token: string;
  userId: string;
  platform?: fcm_device_tokens_platform | null;
  deviceId?: string | null;
  appVersion?: string | null;
};

type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  type?: string | null;
  data?: Record<string, string> | null;
};

const toPlatform = (platform?: string | null): fcm_device_tokens_platform => {
  if (!platform) return "WEB";
  const upper = platform.toUpperCase();
  if (upper === "ANDROID" || upper === "IOS" || upper === "WEB") {
    return upper as fcm_device_tokens_platform;
  }
  return "WEB";
};

export const notificationService = {
  getAdminTopic() {
    return ADMIN_TOPIC;
  },

  async getAdminUserIds(): Promise<string[]> {
    const admins = await prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  },

  async subscribeAndStore(input: SaveTokenInput) {
    const { token, topic, userId } = input;

    if (!token || !topic) {
      throw new AppError("Token and topic are required", 400);
    }

    const platform = toPlatform(input.platform);

    const now = new Date();

    const tokenRecord = await prisma.fcm_device_tokens.upsert({
      where: { token },
      update: {
        platform,
        deviceId: input.deviceId || undefined,
        appVersion: input.appVersion || undefined,
        isActive: true,
        lastUsedAt: now,
        updatedAt: now,
        userId,
      },
      create: {
        id: randomUUID(),
        token,
        platform,
        deviceId: input.deviceId || undefined,
        appVersion: input.appVersion || undefined,
        isActive: true,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
        userId,
      },
    });

    await prisma.fcm_topic_subscriptions.upsert({
      where: { tokenId_topic: { tokenId: tokenRecord.id, topic } },
      update: {},
      create: {
        id: randomUUID(),
        topic,
        tokenId: tokenRecord.id,
        createdAt: now,
      },
    });

    const messaging = getMessagingClient();
    const response = await messaging.subscribeToTopic([token], topic);

    logger.info("Subscribed token to topic", {
      topic,
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    if (response.failureCount > 0) {
      throw new AppError("Failed to subscribe token to topic", 400);
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  },

  async registerDevice(input: RegisterDeviceInput) {
    const { token, userId } = input;
    if (!token) throw new AppError("Token is required", 400);

    const platform = toPlatform(input.platform);
    const now = new Date();

    const record = await prisma.fcm_device_tokens.upsert({
      where: { token },
      update: {
        platform,
        deviceId: input.deviceId || undefined,
        appVersion: input.appVersion || undefined,
        isActive: true,
        lastUsedAt: now,
        updatedAt: now,
        userId,
      },
      create: {
        id: randomUUID(),
        token,
        platform,
        deviceId: input.deviceId || undefined,
        appVersion: input.appVersion || undefined,
        isActive: true,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
        userId,
      },
    });

    return record;
  },

  async unregisterDevice(token: string, userId: string) {
    const existing = await prisma.fcm_device_tokens.findFirst({
      where: { token, userId },
    });

    if (!existing) {
      throw new AppError("Device token not found", 404);
    }

    await prisma.$transaction([
      prisma.fcm_topic_subscriptions.deleteMany({
        where: { tokenId: existing.id },
      }),
      prisma.fcm_device_tokens.update({
        where: { token },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      }),
    ]);

    return true;
  },

  async getUserDevices(userId: string) {
    return prisma.fcm_device_tokens.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        platform: true,
        deviceId: true,
        appVersion: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  },

  async unsubscribeFromTopic(token: string, topic: string, userId: string) {
    const tokenRecord = await prisma.fcm_device_tokens.findFirst({
      where: { token, userId, isActive: true },
    });

    if (!tokenRecord) {
      throw new AppError("Device token not found or inactive", 404);
    }

    await prisma.fcm_topic_subscriptions.deleteMany({
      where: { tokenId: tokenRecord.id, topic },
    });

    const messaging = getMessagingClient();
    await messaging.unsubscribeFromTopic([token], topic);
  },

  async sendToTopic(input: SendTopicInput) {
    const { topic, title, body, data } = input;
    const messaging = getMessagingClient();

    const message: Message = {
      topic,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        notification: {
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const messageId = await messaging.send(message);

    logger.info("Notification sent to topic", {
      topic,
      messageId,
    });

    // Fan-out to subscribed users
    const subscribers = await prisma.fcm_topic_subscriptions.findMany({
      where: { topic },
      select: {
        fcm_device_tokens: {
          select: {
            userId: true,
          },
        },
      },
    });

    const uniqueUserIds = Array.from(
      new Set(
        subscribers
          .map((s) => s.fcm_device_tokens?.userId)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (uniqueUserIds.length) {
      await prisma.notifications.createMany({
        data: uniqueUserIds.map((userId) => ({
          id: randomUUID(),
          userId,
          title,
          body,
          type: "topic",
          data: data
            ? JSON.stringify({ ...data, topic })
            : JSON.stringify({ topic }),
          createdAt: new Date(),
          isRead: false,
        })),
      });
    }

    return { messageId, fanoutCount: uniqueUserIds.length };
  },

  async notifyAdmins(input: {
    title: string;
    body: string;
    type?: string | null;
    data?: Record<string, string>;
    skipPush?: boolean;
  }) {
    const { title, body, data, type, skipPush } = input;
    const adminIds = await this.getAdminUserIds();

    if (adminIds.length) {
      await prisma.notifications.createMany({
        data: adminIds.map((userId) => ({
          id: randomUUID(),
          userId,
          title,
          body,
          type: type || "admin",
          data: data ? JSON.stringify(data) : null,
          createdAt: new Date(),
          isRead: false,
        })),
      });
    }

    if (skipPush) {
      return { pushSent: false, adminCount: adminIds.length };
    }

    const messaging = getMessagingClient();
    const message: Message = {
      topic: ADMIN_TOPIC,
      notification: { title, body },
      data: data || {},
      android: {
        notification: {
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    try {
      const messageId = await messaging.send(message);
      logger.info("Admin notification dispatched", {
        topic: ADMIN_TOPIC,
        messageId,
        adminCount: adminIds.length,
      });
      return { pushSent: true, adminCount: adminIds.length, messageId };
    } catch (error) {
      logger.error("Failed to send admin notification topic", {
        topic: ADMIN_TOPIC,
        error,
      });
      return { pushSent: false, adminCount: adminIds.length };
    }
  },

  async listNotifications(userId: string, limit = 50) {
    return prisma.notifications.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
    });
  },

  async markNotificationsRead(userId: string, ids: string[]) {
    if (!ids.length) {
      throw new AppError("No notification ids provided", 400);
    }

    await prisma.notifications.updateMany({
      where: {
        userId,
        id: { in: ids },
      },
      data: {
        isRead: true,
      },
    });
  },

  async createNotification(input: CreateNotificationInput) {
    const { userId, title, body, type, data } = input;
    await prisma.notifications.create({
      data: {
        id: randomUUID(),
        userId,
        title,
        body,
        type: type || null,
        data: data ? JSON.stringify(data) : null,
      },
    });
  },
};
