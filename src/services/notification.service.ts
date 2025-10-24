import { FcmTopics, NotificationTemplates } from "@/@types/fcm.types";

import { fcmService } from "./fcm.service";
import { logger } from "@/config/logger";
import { request_status } from "@prisma/client";

/**
 * Centralized Notification Service
 *
 * High-level notification methods that handle both FCM push notifications
 * and in-app notifications (future).
 *
 * This service abstracts away the complexity of choosing notification channels
 * and provides simple methods for common notification scenarios.
 */
export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Notify when request status changes
   *
   * Sends notification to:
   * - Request creator (customer)
   * - Assigned technician (if any)
   * - All subscribers to the specific request topic
   *
   * @param requestId - Request ID
   * @param requestTitle - Request title
   * @param newStatus - New status
   * @param customerId - Customer user ID
   * @param technicianId - Technician user ID (optional)
   */
  async notifyRequestStatusChange(
    requestId: string,
    requestTitle: string,
    newStatus: request_status,
    customerId: string,
    technicianId?: string
  ): Promise<void> {
    try {
      const message = NotificationTemplates.requestStatusChange(
        requestId,
        requestTitle,
        newStatus
      );

      // Send to request-specific topic (anyone following this request)
      const requestTopic = FcmTopics.requestTopic(requestId);
      await fcmService.sendToTopic(requestTopic, message);

      // Also send directly to customer
      await fcmService.sendToUser(customerId, message);

      // If technician is assigned, notify them too
      if (technicianId) {
        await fcmService.sendToUser(technicianId, message);
      }

      logger.info("✅ Request status change notification sent", {
        requestId,
        newStatus,
        customerId,
        technicianId,
      });
    } catch (error) {
      logger.error("❌ Failed to send request status change notification", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify when technician is assigned to request
   *
   * Sends notification to:
   * - Request creator (customer)
   * - Newly assigned technician
   *
   * @param requestId - Request ID
   * @param requestTitle - Request title
   * @param technicianId - Assigned technician ID
   * @param technicianName - Technician name
   * @param customerId - Customer user ID
   */
  async notifyTechnicianAssigned(
    requestId: string,
    requestTitle: string,
    technicianId: string,
    technicianName: string,
    customerId: string
  ): Promise<void> {
    try {
      // Message for customer
      const customerMessage = NotificationTemplates.requestAssigned(
        requestId,
        requestTitle,
        technicianName
      );

      // Message for technician
      const technicianMessage = {
        notification: {
          title: "New Assignment",
          body: `You've been assigned to: "${requestTitle}"`,
        },
        data: {
          type: "request_assigned",
          entityId: requestId,
          entityType: "request",
          action: `basma://request/${requestId}`,
        },
      };

      // Send to customer
      await fcmService.sendToUser(customerId, customerMessage);

      // Send to technician
      await fcmService.sendToUser(technicianId, technicianMessage);

      // Also broadcast to request topic
      const requestTopic = FcmTopics.requestTopic(requestId);
      await fcmService.sendToTopic(requestTopic, customerMessage);

      logger.info("✅ Technician assignment notification sent", {
        requestId,
        technicianId,
        customerId,
      });
    } catch (error) {
      logger.error("❌ Failed to send technician assignment notification", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify when a new comment is added to a request
   *
   * @param requestId - Request ID
   * @param requestTitle - Request title
   * @param commenterName - Name of person who commented
   * @param commentText - Comment text
   * @param customerId - Customer user ID
   * @param technicianId - Technician user ID (optional)
   * @param commenterUserId - User ID of commenter (to avoid sending notification to themselves)
   */
  async notifyNewComment(
    requestId: string,
    requestTitle: string,
    commenterName: string,
    commentText: string,
    customerId: string,
    technicianId?: string,
    commenterUserId?: string
  ): Promise<void> {
    try {
      const message = NotificationTemplates.newComment(
        requestId,
        requestTitle,
        commenterName,
        commentText
      );

      // Send to request topic (but the commenter will be filtered by mobile app)
      const requestTopic = FcmTopics.requestTopic(requestId);
      await fcmService.sendToTopic(requestTopic, message);

      // Send directly to customer (if they're not the commenter)
      if (customerId !== commenterUserId) {
        await fcmService.sendToUser(customerId, message);
      }

      // Send to technician (if assigned and they're not the commenter)
      if (technicianId && technicianId !== commenterUserId) {
        await fcmService.sendToUser(technicianId, message);
      }

      logger.info("✅ New comment notification sent", {
        requestId,
        commenterUserId,
      });
    } catch (error) {
      logger.error("❌ Failed to send new comment notification", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify about a chat message
   *
   * @param chatRoomId - Chat room ID
   * @param senderId - Sender user ID
   * @param senderName - Sender name
   * @param messageText - Message text
   * @param recipientIds - Array of recipient user IDs
   */
  async notifyChatMessage(
    chatRoomId: string,
    senderId: string,
    senderName: string,
    messageText: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const message = NotificationTemplates.chatMessage(
        chatRoomId,
        senderName,
        messageText
      );

      // Send to chat room topic
      const chatTopic = FcmTopics.chatRoomTopic(chatRoomId);
      await fcmService.sendToTopic(chatTopic, message);

      // Also send directly to each recipient (excluding sender)
      const recipients = recipientIds.filter((id) => id !== senderId);
      for (const recipientId of recipients) {
        await fcmService.sendToUser(recipientId, message);
      }

      logger.info("✅ Chat message notification sent", {
        chatRoomId,
        senderId,
        recipientCount: recipients.length,
      });
    } catch (error) {
      logger.error("❌ Failed to send chat message notification", {
        chatRoomId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send system-wide announcement
   *
   * @param title - Announcement title
   * @param body - Announcement body
   * @param announcementId - Optional announcement ID for tracking
   * @param targetRole - Optional role to target (CUSTOMER, TECHNICIAN, etc.)
   */
  async sendAnnouncement(
    title: string,
    body: string,
    announcementId?: string,
    targetRole?: string
  ): Promise<void> {
    try {
      const message = NotificationTemplates.announcement(
        title,
        body,
        announcementId
      );

      if (targetRole) {
        // Send to specific role
        const roleTopic = FcmTopics.roletopic(targetRole);
        await fcmService.sendToTopic(roleTopic, message);

        logger.info("✅ Role-specific announcement sent", {
          targetRole,
          announcementId,
        });
      } else {
        // Send to all users
        await fcmService.sendToTopic(FcmTopics.ALL_USERS, message);

        logger.info("✅ System-wide announcement sent", {
          announcementId,
        });
      }
    } catch (error) {
      logger.error("❌ Failed to send announcement", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify when a new request is created
   * Useful for maintenance admins to get notified of new requests
   *
   * @param requestId - Request ID
   * @param requestTitle - Request title
   * @param priority - Request priority
   * @param building - Building name
   */
  async notifyNewRequest(
    requestId: string,
    requestTitle: string,
    priority: string,
    building?: string
  ): Promise<void> {
    try {
      const message = {
        notification: {
          title: `New ${priority} Priority Request`,
          body: requestTitle,
        },
        data: {
          type: "new_request",
          entityId: requestId,
          entityType: "request",
          priority,
          building: building || "",
          action: `basma://request/${requestId}`,
        },
        android: {
          priority:
            priority === "URGENT" || priority === "HIGH" ? "high" : "normal",
        },
      };

      // Notify all maintenance admins
      await fcmService.sendToTopic(
        FcmTopics.roletopic("MAINTENANCE_ADMIN"),
        message
      );

      // If building specified, also notify building-specific topic
      if (building) {
        const buildingTopic = FcmTopics.buildingTopic(building);
        await fcmService.sendToTopic(buildingTopic, message);
      }

      logger.info("✅ New request notification sent", {
        requestId,
        priority,
        building,
      });
    } catch (error) {
      logger.error("❌ Failed to send new request notification", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Subscribe user to default topics based on their role
   * This should be called when a user registers a device
   *
   * @param token - Device FCM token
   * @param userRole - User role
   */
  async subscribeToDefaultTopics(
    token: string,
    userRole: string
  ): Promise<void> {
    try {
      const topics: string[] = [
        FcmTopics.ALL_USERS, // Everyone gets general announcements
        FcmTopics.roletopic(userRole), // Role-specific notifications
      ];

      // Add role-specific default topics
      if (userRole === "CUSTOMER") {
        topics.push(FcmTopics.MAINTENANCE_UPDATES);
      } else if (userRole === "TECHNICIAN") {
        topics.push(FcmTopics.MAINTENANCE_UPDATES);
      } else if (
        userRole === "MAINTENANCE_ADMIN" ||
        userRole === "BASMA_ADMIN"
      ) {
        topics.push(FcmTopics.MAINTENANCE_UPDATES);
        topics.push(FcmTopics.ANNOUNCEMENTS);
      }

      // Subscribe to all default topics
      for (const topic of topics) {
        await fcmService.subscribeToTopic(token, topic);
      }

      logger.info("✅ User subscribed to default topics", {
        userRole,
        topics,
      });
    } catch (error) {
      logger.error("❌ Failed to subscribe to default topics", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
