import {
  DeviceRegistrationRequest,
  FcmMessage,
  FcmServiceResponse,
} from "../types/fcm.types";

import { FirebaseConfigManager } from "../config/fcm.config";
import { fcm_device_tokens_platform } from "@prisma/client";
import { logger } from "@/config/logger";
import { prisma } from "@/config/database";

/**
 * Firebase Cloud Messaging Service
 *
 * Handles all FCM operations including:
 * - Sending notifications to topics
 * - Sending notifications to specific devices
 * - Managing device tokens
 * - Topic subscriptions
 * 
 * @deprecated This service has been deprecated and moved to the deprecated folder.
 * All FCM notification functionality has been removed from the active codebase.
 */
export class FcmService {
  private static instance: FcmService;

  private constructor() {
    // Initialize Firebase on service creation
    FirebaseConfigManager.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FcmService {
    if (!FcmService.instance) {
      FcmService.instance = new FcmService();
    }
    return FcmService.instance;
  }

  /**
   * Send notification to a topic
   *
   * @param topic - Topic name (e.g., 'maintenance-updates', 'user-123')
   * @param message - FCM message payload
   * @returns Promise with service response
   *
   * @example
   * ```typescript
   * await fcmService.sendToTopic('maintenance-updates', {
   *   notification: {
   *     title: 'Request Updated',
   *     body: 'Your request is now in progress'
   *   },
   *   data: {
   *     requestId: '123',
   *     type: 'status_change'
   *   }
   * });
   * ```
   */
  async sendToTopic(
    topic: string,
    message: FcmMessage
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      const response = await messaging.send({
        ...message,
        topic,
      });

      logger.info("✅ FCM notification sent to topic", {
        topic,
        messageId: response,
      });

      return {
        success: true,
        messageId: response,
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      logger.error("❌ Failed to send FCM notification to topic", {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Send notification to a specific device token
   *
   * @param token - Device FCM token
   * @param message - FCM message payload
   * @returns Promise with service response
   */
  async sendToDevice(
    token: string,
    message: FcmMessage
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      const response = await messaging.send({
        ...message,
        token,
      });

      logger.info("✅ FCM notification sent to device", {
        messageId: response,
      });

      return {
        success: true,
        messageId: response,
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      logger.error("❌ Failed to send FCM notification to device", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Send notification to multiple device tokens
   *
   * @param tokens - Array of device FCM tokens
   * @param message - FCM message payload
   * @returns Promise with service response including success/failure counts
   */
  async sendToDevices(
    tokens: string[],
    message: FcmMessage
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      const messages = tokens.map((token) => ({
        ...message,
        token,
      }));

      const response = await messaging.sendEach(messages);

      logger.info("✅ FCM batch notification sent", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error("❌ Failed to send FCM batch notification", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: tokens.length,
      };
    }
  }

  /**
   * Send notification to a user (all their devices)
   *
   * @param userId - User ID
   * @param message - FCM message payload
   * @returns Promise with service response
   */
  async sendToUser(
    userId: string,
    message: FcmMessage
  ): Promise<FcmServiceResponse> {
    try {
      // Get all active tokens for the user
      const tokens = await prisma.fcm_device_tokens.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          token: true,
        },
      });

      if (tokens.length === 0) {
        logger.warn("⚠️ No active FCM tokens found for user", { userId });
        return {
          success: false,
          error: "No active tokens found for user",
          successCount: 0,
          failureCount: 0,
        };
      }

      const tokenStrings = tokens.map((t: { token: string }) => t.token);
      return await this.sendToDevices(tokenStrings, message);
    } catch (error) {
      logger.error("❌ Failed to send notification to user", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Send notification with topic condition
   *
   * @param condition - Topic condition (e.g., "'news' in topics && 'updates' in topics")
   * @param message - FCM message payload
   * @returns Promise with service response
   *
   * @example
   * ```typescript
   * // Send to users subscribed to both topics
   * await fcmService.sendToCondition(
   *   "'maintenance-updates' in topics && 'building-a' in topics",
   *   message
   * );
   * ```
   */
  async sendToCondition(
    condition: string,
    message: FcmMessage
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      const response = await messaging.send({
        ...message,
        condition,
      });

      logger.info("✅ FCM notification sent with condition", {
        condition,
        messageId: response,
      });

      return {
        success: true,
        messageId: response,
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      logger.error("❌ Failed to send FCM notification with condition", {
        condition,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Subscribe device token to a topic
   *
   * @param token - Device FCM token
   * @param topic - Topic name
   * @returns Promise with service response
   */
  async subscribeToTopic(
    token: string,
    topic: string
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      await messaging.subscribeToTopic(token, topic);

      logger.info("✅ Device subscribed to topic", {
        topic,
      });

      return {
        success: true,
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      logger.error("❌ Failed to subscribe device to topic", {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Subscribe multiple devices to a topic
   *
   * @param tokens - Array of device FCM tokens
   * @param topic - Topic name
   * @returns Promise with service response
   */
  async subscribeDevicesToTopic(
    tokens: string[],
    topic: string
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      const response = await messaging.subscribeToTopic(tokens, topic);

      logger.info("✅ Devices subscribed to topic", {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error("❌ Failed to subscribe devices to topic", {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: tokens.length,
      };
    }
  }

  /**
   * Unsubscribe device token from a topic
   *
   * @param token - Device FCM token
   * @param topic - Topic name
   * @returns Promise with service response
   */
  async unsubscribeFromTopic(
    token: string,
    topic: string
  ): Promise<FcmServiceResponse> {
    try {
      const messaging = FirebaseConfigManager.getMessaging();

      await messaging.unsubscribeFromTopic(token, topic);

      logger.info("✅ Device unsubscribed from topic", {
        topic,
      });

      return {
        success: true,
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      logger.error("❌ Failed to unsubscribe device from topic", {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successCount: 0,
        failureCount: 1,
      };
    }
  }

  /**
   * Register a new device token
   *
   * @param userId - User ID
   * @param registration - Device registration data
   * @returns Promise with created token record
   */
  async registerDevice(
    userId: string,
    registration: DeviceRegistrationRequest
  ) {
    try {
      // Check if token already exists
      const existingToken = await prisma.fcm_device_tokens.findUnique({
        where: { token: registration.token },
      });

      if (existingToken) {
        // Update existing token
        return await prisma.fcm_device_tokens.update({
          where: { token: registration.token },
          data: {
            userId,
            platform: registration.platform,
            deviceId: registration.deviceId,
            appVersion: registration.appVersion,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });
      }

      // Create new token
      return await prisma.fcm_device_tokens.create({
        data: {
          userId,
          token: registration.token,
          platform: registration.platform,
          deviceId: registration.deviceId,
          appVersion: registration.appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        } as any,
      });
    } catch (error) {
      logger.error("❌ Failed to register device token", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unregister a device token (on logout)
   *
   * @param token - Device FCM token
   * @returns Promise with deleted token record
   */
  async unregisterDevice(token: string) {
    try {
      return await prisma.fcm_device_tokens.update({
        where: { token },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error("❌ Failed to unregister device token", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clean up inactive tokens (tokens not used in 30+ days)
   */
  async cleanupInactiveTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.fcm_device_tokens.deleteMany({
        where: {
          OR: [
            { isActive: false },
            {
              lastUsedAt: {
                lt: thirtyDaysAgo,
              },
            },
          ],
        },
      });

      logger.info("✅ Cleaned up inactive FCM tokens", {
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error("❌ Failed to cleanup inactive tokens", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}

// Export singleton instance
export const fcmService = FcmService.getInstance();

