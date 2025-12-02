import { fcm_device_tokens_platform } from "@prisma/client";
import { z } from "zod";

/**
 * FCM Validation Schemas
 *
 * Validates incoming requests for FCM endpoints
 * 
 * @deprecated These validators have been deprecated and moved to the deprecated folder.
 * All FCM notification functionality has been removed from the active codebase.
 */

/**
 * Device registration schema
 */
export const registerDeviceSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, "FCM token is required")
      .max(500, "FCM token is too long"),
    platform: z.nativeEnum(fcm_device_tokens_platform, {
      errorMap: () => ({ message: "Platform must be IOS, ANDROID, or WEB" }),
    }),
    deviceId: z.string().max(100).optional(),
    appVersion: z.string().max(20).optional(),
  }),
});

/**
 * Topic subscription schema
 */
export const subscribeToTopicSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, "FCM token is required")
      .max(500, "FCM token is too long"),
    topic: z
      .string()
      .min(1, "Topic name is required")
      .max(100, "Topic name is too long")
      .regex(
        /^[a-zA-Z0-9-_.~%]+$/,
        "Topic name can only contain letters, numbers, and -_.~%"
      ),
  }),
});

/**
 * Topic unsubscription schema (same as subscription)
 */
export const unsubscribeFromTopicSchema = subscribeToTopicSchema;

/**
 * Device unregistration schema
 */
export const unregisterDeviceSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, "FCM token is required")
      .max(500, "FCM token is too long"),
  }),
});

/**
 * Send test notification schema (for development/testing)
 */
export const sendTestNotificationSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Invalid user ID").optional(),
    topic: z.string().min(1).max(100).optional(),
    title: z.string().min(1, "Title is required").max(100),
    body: z.string().min(1, "Body is required").max(500),
    data: z.record(z.string()).optional(),
  }),
});

/**
 * Send announcement schema (for admin users)
 */
export const sendAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(100),
    body: z.string().min(1, "Body is required").max(1000),
    targetRole: z
      .enum([
        "CUSTOMER",
        "TECHNICIAN",
        "MAINTENANCE_ADMIN",
        "BASMA_ADMIN",
        "ALL",
      ])
      .optional(),
    announcementId: z.string().uuid().optional(),
  }),
});

// Export types for use in controllers
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>["body"];
export type SubscribeToTopicInput = z.infer<
  typeof subscribeToTopicSchema
>["body"];
export type UnsubscribeFromTopicInput = z.infer<
  typeof unsubscribeFromTopicSchema
>["body"];
export type UnregisterDeviceInput = z.infer<
  typeof unregisterDeviceSchema
>["body"];
export type SendTestNotificationInput = z.infer<
  typeof sendTestNotificationSchema
>["body"];
export type SendAnnouncementInput = z.infer<
  typeof sendAnnouncementSchema
>["body"];

