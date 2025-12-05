import { randomUUID } from "crypto";

import { getMessagingClient } from "@/config/firebaseAdmin";
import { logger } from "@/config/logger";
import { prisma } from "@/config/database";
import { AppError } from "@/utils/appError";
import { fcm_device_tokens_platform } from "@prisma/client";

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

const toPlatform = (
  platform?: string | null
): fcm_device_tokens_platform => {
  if (!platform) return "WEB";
  const upper = platform.toUpperCase();
  if (upper === "ANDROID" || upper === "IOS" || upper === "WEB") {
    return upper as fcm_device_tokens_platform;
  }
  return "WEB";
};

export const notificationService = {
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

    const message = {
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

    return { messageId };
  },
};

