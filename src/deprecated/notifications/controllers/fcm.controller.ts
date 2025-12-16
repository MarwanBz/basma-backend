import { NextFunction, Request, Response } from "express";
import {
  RegisterDeviceInput,
  SendAnnouncementInput,
  SendTestNotificationInput,
  SubscribeToTopicInput,
  UnregisterDeviceInput,
  UnsubscribeFromTopicInput,
} from "../validators/fcm.validator";

import { AppError } from "@/utils/appError";
import { fcmService } from "../services/fcm.service";
import { logger } from "@/config/logger";
import { notificationService } from "../services/notification.service";
import { prisma } from "@/config/database";

/**
 * FCM Controller
 *
 * Handles FCM-related HTTP endpoints
 * 
 * @deprecated This controller has been deprecated and moved to the deprecated folder.
 * All FCM notification functionality has been removed from the active codebase.
 */
export class FcmController {
  /**
   * Register a device for push notifications
   * POST /api/fcm/register
   *
   * @body token - FCM device token
   * @body platform - Device platform (IOS, ANDROID, WEB)
   * @body deviceId - Optional device identifier
   * @body appVersion - Optional app version
   */
  async registerDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const { token, platform, deviceId, appVersion } =
        req.body as RegisterDeviceInput;

      // Register device
      const fcmToken = await fcmService.registerDevice(userId, {
        token,
        platform,
        deviceId,
        appVersion,
      });

      // Get user role for default topic subscriptions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Subscribe to default topics
      await notificationService.subscribeToDefaultTopics(token, user.role);

      logger.info("✅ Device registered successfully", {
        userId,
        platform,
        tokenId: fcmToken.id,
      });

      res.status(201).json({
        success: true,
        message: "Device registered successfully",
        data: {
          id: fcmToken.id,
          platform: fcmToken.platform,
          createdAt: fcmToken.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Subscribe to a specific topic
   * POST /api/fcm/subscribe
   *
   * @body token - FCM device token
   * @body topic - Topic name to subscribe to
   */
  async subscribeToTopic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const { token, topic } = req.body as SubscribeToTopicInput;

      // Verify the token belongs to the user
      const fcmToken = await prisma.fcm_device_tokens.findFirst({
        where: {
          token,
          userId,
          isActive: true,
        },
      });

      if (!fcmToken) {
        throw new AppError(
          "Device token not found or does not belong to user",
          404
        );
      }

      // Subscribe to topic
      const result = await fcmService.subscribeToTopic(token, topic);

      if (!result.success) {
        throw new AppError(result.error || "Failed to subscribe to topic", 500);
      }

      logger.info("✅ User subscribed to topic", {
        userId,
        topic,
      });

      res.status(200).json({
        success: true,
        message: `Successfully subscribed to topic: ${topic}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unsubscribe from a specific topic
   * POST /api/fcm/unsubscribe
   *
   * @body token - FCM device token
   * @body topic - Topic name to unsubscribe from
   */
  async unsubscribeFromTopic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const { token, topic } = req.body as UnsubscribeFromTopicInput;

      // Verify the token belongs to the user
      const fcmToken = await prisma.fcm_device_tokens.findFirst({
        where: {
          token,
          userId,
          isActive: true,
        },
      });

      if (!fcmToken) {
        throw new AppError(
          "Device token not found or does not belong to user",
          404
        );
      }

      // Unsubscribe from topic
      const result = await fcmService.unsubscribeFromTopic(token, topic);

      if (!result.success) {
        throw new AppError(
          result.error || "Failed to unsubscribe from topic",
          500
        );
      }

      logger.info("✅ User unsubscribed from topic", {
        userId,
        topic,
      });

      res.status(200).json({
        success: true,
        message: `Successfully unsubscribed from topic: ${topic}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unregister device (on logout)
   * DELETE /api/fcm/unregister
   *
   * @body token - FCM device token to unregister
   */
  async unregisterDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const { token } = req.body as UnregisterDeviceInput;

      // Verify the token belongs to the user
      const fcmToken = await prisma.fcm_device_tokens.findFirst({
        where: {
          token,
          userId,
        },
      });

      if (!fcmToken) {
        throw new AppError(
          "Device token not found or does not belong to user",
          404
        );
      }

      // Unregister device
      await fcmService.unregisterDevice(token);

      logger.info("✅ Device unregistered successfully", {
        userId,
        tokenId: fcmToken.id,
      });

      res.status(200).json({
        success: true,
        message: "Device unregistered successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's subscriptions
   * GET /api/fcm/subscriptions
   *
   * Returns all active device tokens for the current user
   */
  async getSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const tokens = await prisma.fcm_device_tokens.findMany({
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json({
        success: true,
        data: {
          devices: tokens,
          count: tokens.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send test notification (development only)
   * POST /api/fcm/test/send
   *
   * @body userId - Optional user ID to send to
   * @body topic - Optional topic to send to
   * @body title - Notification title
   * @body body - Notification body
   * @body data - Optional data payload
   */
  async sendTestNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        throw new AppError("Test endpoint not available in production", 403);
      }

      const { userId, topic, title, body, data } =
        req.body as SendTestNotificationInput;

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
      };

      let result;

      if (userId) {
        result = await fcmService.sendToUser(userId, message);
      } else if (topic) {
        result = await fcmService.sendToTopic(topic, message);
      } else {
        throw new AppError("Either userId or topic must be provided", 400);
      }

      res.status(200).json({
        success: true,
        message: "Test notification sent",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send announcement (admin only)
   * POST /api/fcm/announcement
   *
   * @body title - Announcement title
   * @body body - Announcement body
   * @body targetRole - Optional role to target
   * @body announcementId - Optional announcement ID
   */
  async sendAnnouncement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check if user is admin
      if (
        !userRole ||
        !["MAINTENANCE_ADMIN", "BASMA_ADMIN", "SUPER_ADMIN"].includes(userRole)
      ) {
        throw new AppError("Only administrators can send announcements", 403);
      }

      const { title, body, targetRole, announcementId } =
        req.body as SendAnnouncementInput;

      await notificationService.sendAnnouncement(
        title,
        body,
        announcementId,
        targetRole && targetRole !== "ALL" ? targetRole : undefined
      );

      logger.info("✅ Announcement sent", {
        title,
        targetRole: targetRole || "ALL",
        sentBy: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        message: "Announcement sent successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export controller instance
export const fcmController = new FcmController();

