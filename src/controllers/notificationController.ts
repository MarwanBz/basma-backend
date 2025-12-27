import { Request, Response } from "express";
import getFirebaseAdmin from "./firebase/firebase-admin";
import { PrismaClient } from "@prisma/client";
import { messages } from "@/config/messages.ar";

const prisma = new PrismaClient();

// Device registration
export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { token, platform, deviceId, appVersion } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: messages.errors.userNotAuthenticated });
    }

    // Save token to database
    const device = await prisma.fcm_device_tokens.upsert({
      where: { token },
      update: {
        lastUsedAt: new Date(),
        isActive: true,
        deviceId: deviceId || undefined,
        appVersion: appVersion || undefined,
        updatedAt: new Date(),
      },
      create: {
        id: require("crypto").randomUUID(),
        token,
        platform,
        userId,
        isActive: true,
        lastUsedAt: new Date(),
        deviceId: deviceId || null,
        appVersion: appVersion || null,
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: device.id,
        platform: device.platform,
        deviceId: device.deviceId,
        appVersion: device.appVersion,
        createdAt: device.createdAt,
        lastUsedAt: device.lastUsedAt,
      },
    });
  } catch (error) {
    console.error("Error in registerDevice API:", error);
    return res.status(500).json({ error: messages.errors.internalServerError });
  }
};

export const unregisterDevice = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: messages.errors.userNotAuthenticated });
    }

    // Delete token from database
    await prisma.fcm_device_tokens.deleteMany({
      where: {
        token,
        userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: messages.success.deviceUnregistered,
    });
  } catch (error) {
    console.error("Error in unregisterDevice API:", error);
    return res.status(500).json({ error: messages.errors.internalServerError });
  }
};

export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: messages.errors.userNotAuthenticated });
    }

    // Get all devices for user
    const devices = await prisma.fcm_device_tokens.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceId: true,
        appVersion: true,
        createdAt: true,
        lastUsedAt: true,
        fcm_topic_subscriptions: {
          select: {
            topic: true,
          },
        },
      },
    });

    const subscriptions = devices.map((device) => ({
      ...device,
      topics: device.fcm_topic_subscriptions.map((sub) => sub.topic),
    }));

    return res.status(200).json({
      success: true,
      data: {
        devices: subscriptions,
        count: devices.length,
      },
    });
  } catch (error) {
    console.error("Error in getSubscriptions API:", error);
    return res.status(500).json({ error: messages.errors.internalServerError });
  }
};

export const unsubscribeTopic = async (req: Request, res: Response) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: messages.errors.userNotAuthenticated });
    }

    const messaging = getFirebaseAdmin();

    // Unsubscribe from topic using Firebase Admin SDK
    const response = await messaging.unsubscribeFromTopic([token], topic);

    // Find the device token
    const deviceToken = await prisma.fcm_device_tokens.findFirst({
      where: { token, userId },
    });

    if (deviceToken) {
      // Delete topic subscription from database
      await prisma.fcm_topic_subscriptions.deleteMany({
        where: {
          tokenId: deviceToken.id,
          topic,
        },
      });
    }

    console.log(
      `Successfully unsubscribed ${response.successCount} tokens from topic: ${topic}`,
    );
    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("Error in unsubscribe-topic API:", error);
    return res.status(500).json({ error: messages.errors.internalServerError });
  }
};

export const sendAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, body, targetRole, announcementId } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    const messaging = getFirebaseAdmin();

    // Determine topic based on target role
    let topic = "all-users";
    if (targetRole && targetRole !== "ALL") {
      topic = `role-${targetRole.toLowerCase()}`;
    }

    const message = {
      notification: {
        title,
        body,
      },
      topic,
      data: {
        type: "announcement",
        announcementId: announcementId || "",
        targetRole: targetRole || "ALL",
      },
    };

    const response = await messaging.send(message);

    console.log(`Successfully sent announcement to topic: ${topic}`, response);

    return res.status(200).json({
      success: true,
      message: messages.success.announcementSent,
    });
  } catch (error: any) {
    console.error("Error sending announcement:", error);
    return res.status(500).json({
      error: messages.errors.internalServerError,
      details: error.message,
    });
  }
};

export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const { token, userId, topic, title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    const messaging = getFirebaseAdmin();

    let message;
    if (token) {
      // Send to specific device
      message = {
        notification: {
          title,
          body,
        },
        token,
        data: data || {},
      };
    } else if (topic) {
      // Send to topic
      message = {
        notification: {
          title,
          body,
        },
        topic,
        data: data || {},
      };
    } else {
      return res
        .status(400)
        .json({ error: messages.errors.userIdOrTopicRequired });
    }

    const response = await messaging.send(message);

    console.log(`Successfully sent test notification:`, response);

    return res.status(200).json({
      success: true,
      message: messages.success.testNotificationSent,
      data: {
        success: true,
        messageId: response,
        successCount: 1,
        failureCount: 0,
      },
    });
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    return res.status(500).json({
      error: messages.errors.internalServerError,
      details: error.message,
    });
  }
};

export const subscribeTopic = async (req: Request, res: Response) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({ error: messages.errors.missingRequiredFields });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: messages.errors.userNotAuthenticated });
    }

    const messaging = getFirebaseAdmin();

    // Subscribe to topic using Firebase Admin SDK
    const response = await messaging.subscribeToTopic([token], topic);

    if (response.successCount === 0) {
      console.error(
        "Failed to subscribe to topic:",
        response.failureCount,
        "failures",
      );
      return res.status(400).json({ error: messages.errors.failedToSubscribeToTopic });
    }

    // Save token to database if it doesn't exist
    const deviceToken = await prisma.fcm_device_tokens.upsert({
      where: { token },
      update: {
        lastUsedAt: new Date(),
        isActive: true,
      },
      create: {
        id: require("crypto").randomUUID(),
        token,
        platform: "WEB",
        userId,
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Save topic subscription to database
    await prisma.fcm_topic_subscriptions.upsert({
      where: {
        tokenId_topic: {
          tokenId: deviceToken.id,
          topic,
        },
      },
      update: {},
      create: {
        id: require("crypto").randomUUID(),
        tokenId: deviceToken.id,
        topic,
      },
    });

    console.log(
      `Successfully subscribed ${response.successCount} tokens to topic: ${topic}`,
    );
    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("Error in subscribe-topic API:", error);
    return res.status(500).json({ error: messages.errors.internalServerError });
  }
};

export const sendToTopic = async (req: Request, res: Response) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({
        error: messages.errors.missingRequiredFields,
      });
    }

    const messaging = getFirebaseAdmin();

    const message: any = {
      notification: {
        title,
        body,
      },
      topic: topic,
    };

    // Add optional data payload
    if (data) {
      message.data = data;
    }

    const response = await messaging.send(message);

    console.log(`Successfully sent notification to topic: ${topic}`, response);

    return res.status(200).json({
      success: true,
      messageId: response,
    });
  } catch (error: any) {
    console.error("Error sending notification to topic:", error);
    return res.status(500).json({
      error: messages.errors.internalServerError,
      details: error.message,
    });
  }
};
