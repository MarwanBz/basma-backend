import { fcm_device_tokens_platform } from "@prisma/client";

/**
 * FCM Notification payload
 * This appears in the system tray when app is in background/closed
 * 
 * @deprecated These types have been deprecated and moved to the deprecated folder.
 * All FCM notification functionality has been removed from the active codebase.
 */
export interface FcmNotification {
  title: string;
  body: string;
  imageUrl?: string;
}

/**
 * FCM Data payload
 * Custom data sent with notification for app logic
 */
export interface FcmData {
  [key: string]: string; // FCM only supports string values in data
}

/**
 * Complete FCM message structure
 */
export interface FcmMessage {
  notification?: FcmNotification;
  data?: FcmData;
  android?: {
    priority?: "high" | "normal";
    ttl?: number;
    notification?: {
      sound?: string;
      color?: string;
      icon?: string;
      channelId?: string;
    };
  };
  apns?: {
    payload?: {
      aps: {
        sound?: string;
        badge?: number;
        contentAvailable?: boolean;
        category?: string;
      };
    };
  };
  webpush?: {
    notification?: {
      icon?: string;
      badge?: string;
    };
  };
}

/**
 * Topic subscription/unsubscription request
 */
export interface TopicSubscriptionRequest {
  token: string;
  topic: string;
}

/**
 * Device registration request from mobile app
 */
export interface DeviceRegistrationRequest {
  token: string;
  platform: fcm_device_tokens_platform;
  deviceId?: string;
  appVersion?: string;
}

/**
 * FCM service response
 */
export interface FcmServiceResponse {
  success: boolean;
  messageId?: string;
  failureCount?: number;
  successCount?: number;
  error?: string;
}

/**
 * Notification types for app routing
 */
export enum NotificationType {
  REQUEST_STATUS_CHANGE = "request_status_change",
  REQUEST_ASSIGNED = "request_assigned",
  REQUEST_COMMENT = "request_comment",
  CHAT_MESSAGE = "chat_message",
  ANNOUNCEMENT = "announcement",
  SYSTEM_UPDATE = "system_update",
}

/**
 * Topic naming conventions
 */
export class FcmTopics {
  // Global topics
  static readonly ALL_USERS = "all-users";

  // Role-based topics
  static roletopic(role: string): string {
    return `role-${role.toLowerCase()}`;
  }

  // User-specific topics
  static userTopic(userId: string): string {
    return `user-${userId}`;
  }

  // Feature-based topics
  static readonly MAINTENANCE_UPDATES = "maintenance-updates";
  static readonly CHAT_MESSAGES = "chat-messages";
  static readonly ANNOUNCEMENTS = "announcements";

  // Dynamic entity topics
  static requestTopic(requestId: string): string {
    return `request-${requestId}`;
  }

  static buildingTopic(buildingId: string): string {
    return `building-${buildingId}`;
  }

  static chatRoomTopic(roomId: string): string {
    return `chat-${roomId}`;
  }

  static technicianTopic(technicianId: string): string {
    return `technician-${technicianId}`;
  }
}

/**
 * Helper to create notification data payload
 */
export interface NotificationDataPayload {
  type: NotificationType;
  entityId?: string; // ID of request, comment, etc.
  entityType?: string; // 'request', 'comment', 'chat', etc.
  action?: string; // Deep link action
  [key: string]: string | undefined;
}

/**
 * Pre-built notification templates
 */
export class NotificationTemplates {
  static requestStatusChange(
    requestId: string,
    requestTitle: string,
    newStatus: string
  ): FcmMessage {
    return {
      notification: {
        title: "Request Updated",
        body: `Your maintenance request "${requestTitle}" is now ${newStatus}`,
      },
      data: {
        type: NotificationType.REQUEST_STATUS_CHANGE,
        entityId: requestId,
        entityType: "request",
        newStatus,
        action: `basma://request/${requestId}`,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "maintenance_updates",
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
  }

  static requestAssigned(
    requestId: string,
    requestTitle: string,
    technicianName: string
  ): FcmMessage {
    return {
      notification: {
        title: "Request Assigned",
        body: `Your request "${requestTitle}" has been assigned to ${technicianName}`,
      },
      data: {
        type: NotificationType.REQUEST_ASSIGNED,
        entityId: requestId,
        entityType: "request",
        technicianName,
        action: `basma://request/${requestId}`,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "maintenance_updates",
        },
      },
    };
  }

  static newComment(
    requestId: string,
    requestTitle: string,
    commenterName: string,
    commentText: string
  ): FcmMessage {
    return {
      notification: {
        title: `New comment on "${requestTitle}"`,
        body: `${commenterName}: ${commentText.substring(0, 100)}${commentText.length > 100 ? "..." : ""}`,
      },
      data: {
        type: NotificationType.REQUEST_COMMENT,
        entityId: requestId,
        entityType: "comment",
        commenterName,
        action: `basma://request/${requestId}/comments`,
      },
      android: {
        priority: "normal",
        notification: {
          sound: "default",
          channelId: "comments",
        },
      },
    };
  }

  static chatMessage(
    chatRoomId: string,
    senderName: string,
    messageText: string
  ): FcmMessage {
    return {
      notification: {
        title: senderName,
        body:
          messageText.substring(0, 100) +
          (messageText.length > 100 ? "..." : ""),
      },
      data: {
        type: NotificationType.CHAT_MESSAGE,
        entityId: chatRoomId,
        entityType: "chat",
        senderName,
        action: `basma://chat/${chatRoomId}`,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "chat",
        },
      },
    };
  }

  static announcement(
    title: string,
    body: string,
    announcementId?: string
  ): FcmMessage {
    return {
      notification: {
        title,
        body,
      },
      data: {
        type: NotificationType.ANNOUNCEMENT,
        entityId: announcementId || "",
        entityType: "announcement",
        action: "basma://announcements",
      },
      android: {
        priority: "normal",
        notification: {
          sound: "default",
          channelId: "announcements",
        },
      },
    };
  }
}

