import { fcm_device_tokens_platform, user_role } from "@prisma/client";

import { AppError } from "@/utils/appError";
import { Message } from "firebase-admin/messaging";
import { getMessagingClient } from "@/config/firebaseAdmin";
import { logger } from "@/config/logger";
import { prisma } from "@/config/database";
import { randomUUID } from "crypto";

const TOPICS = {
  allUsers: process.env.FCM_TOPIC_ALL_USERS || "all-users",
  admins: process.env.FCM_TOPIC_ADMINS || "admins",
  maintenanceAdmins:
    process.env.FCM_TOPIC_MAINTENANCE_ADMINS || "maintenance-admins",
  technicians: process.env.FCM_TOPIC_TECHNICIANS || "technicians",
  customers: process.env.FCM_TOPIC_CUSTOMERS || "customers",
};

const DEPRECATED_TOPICS = new Set([
  "job-hunting",
  "job_updates",
  "job-updates",
]);

const ADMIN_ROLES: user_role[] = [
  "SUPER_ADMIN",
  "MAINTENANCE_ADMIN",
  "BASMA_ADMIN",
  "ADMIN",
];

const topicsForRole = (role?: user_role | null): string[] => {
  const base = [TOPICS.allUsers];
  if (!role) return base;
  if (role === "TECHNICIAN") return [...base, TOPICS.technicians];
  if (role === "CUSTOMER") return [...base, TOPICS.customers];
  if (role === "MAINTENANCE_ADMIN")
    return [...base, TOPICS.admins, TOPICS.maintenanceAdmins];
  if (role === "SUPER_ADMIN" || role === "BASMA_ADMIN" || role === "ADMIN")
    return [...base, TOPICS.admins];
  return base;
};

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
    return TOPICS.admins;
  },

  getTopicsForRole(role?: user_role | null) {
    return topicsForRole(role);
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

    if (DEPRECATED_TOPICS.has(topic)) {
      throw new AppError(`Topic '${topic}' is deprecated`, 400);
    }

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

  async subscribeTokenToTopics(
    tokenId: string,
    token: string,
    topics: string[]
  ) {
    const messaging = getMessagingClient();
    const uniqueTopics = Array.from(new Set(topics));
    const now = new Date();

    const filteredTopics = uniqueTopics.filter((t) => {
      if (DEPRECATED_TOPICS.has(t)) {
        logger.warn("Skipping deprecated topic subscription", { topic: t });
        return false;
      }
      return true;
    });

    if (!filteredTopics.length) return;

    // Persist subscriptions
    await prisma.$transaction(
      filteredTopics.map((topic) =>
        prisma.fcm_topic_subscriptions.upsert({
          where: { tokenId_topic: { tokenId, topic } },
          update: {},
          create: {
            id: randomUUID(),
            topic,
            tokenId,
            createdAt: now,
          },
        })
      )
    );

    // Subscribe in FCM
    for (const topic of filteredTopics) {
      const response = await messaging.subscribeToTopic([token], topic);
      logger.info("Subscribed token to topic", {
        topic,
        tokenId,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    }
  },

async registerDevice(input: RegisterDeviceInput) {
    const { token, userId } = input;
    if (!token) throw new AppError("Token is required", 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const targetTopics = topicsForRole(user.role);

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

    await this.subscribeTokenToTopics(record.id, record.token, targetTopics);

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

    if (DEPRECATED_TOPICS.has(topic)) {
      throw new AppError(`Topic '${topic}' is deprecated`, 400);
    }

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
      topic: TOPICS.admins,
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
        topic: TOPICS.admins,
        messageId,
        adminCount: adminIds.length,
      });
      return { pushSent: true, adminCount: adminIds.length, messageId };
    } catch (error) {
      logger.error("Failed to send admin notification topic", {
        topic: TOPICS.admins,
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
