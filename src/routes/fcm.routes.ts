import {
  registerDeviceSchema,
  sendAnnouncementSchema,
  sendTestNotificationSchema,
  subscribeToTopicSchema,
  unregisterDeviceSchema,
  unsubscribeFromTopicSchema,
} from "@/validators/fcm.validator";

import { Router } from "express";
import { fcmController } from "@/controllers/fcm.controller";
import { requireAuth } from "@/middleware/authMiddleware";
import { validateRequest } from "@/middleware/validateRequest";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: FCM
 *   description: Firebase Cloud Messaging endpoints for push notifications
 */

/**
 * @swagger
 * /api/fcm/register:
 *   post:
 *     summary: Register device for push notifications
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               platform:
 *                 type: string
 *                 enum: [IOS, ANDROID, WEB]
 *                 description: Device platform
 *               deviceId:
 *                 type: string
 *                 description: Optional device identifier
 *               appVersion:
 *                 type: string
 *                 description: Optional app version
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */
router.post(
  "/register",
  requireAuth,
  validateRequest(registerDeviceSchema),
  fcmController.registerDevice.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/subscribe:
 *   post:
 *     summary: Subscribe to a notification topic
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - topic
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               topic:
 *                 type: string
 *                 description: Topic name to subscribe to
 *     responses:
 *       200:
 *         description: Successfully subscribed to topic
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device token not found
 */
router.post(
  "/subscribe",
  requireAuth,
  validateRequest(subscribeToTopicSchema),
  fcmController.subscribeToTopic.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/unsubscribe:
 *   post:
 *     summary: Unsubscribe from a notification topic
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - topic
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               topic:
 *                 type: string
 *                 description: Topic name to unsubscribe from
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from topic
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device token not found
 */
router.post(
  "/unsubscribe",
  requireAuth,
  validateRequest(unsubscribeFromTopicSchema),
  fcmController.unsubscribeFromTopic.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/unregister:
 *   delete:
 *     summary: Unregister device (on logout)
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token to unregister
 *     responses:
 *       200:
 *         description: Device unregistered successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device token not found
 */
router.delete(
  "/unregister",
  requireAuth,
  validateRequest(unregisterDeviceSchema),
  fcmController.unregisterDevice.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/subscriptions:
 *   get:
 *     summary: Get user's active device subscriptions
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active devices
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/subscriptions",
  requireAuth,
  fcmController.getSubscriptions.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/test/send:
 *   post:
 *     summary: Send test notification (development only)
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional user ID to send to
 *               topic:
 *                 type: string
 *                 description: Optional topic to send to
 *               title:
 *                 type: string
 *                 description: Notification title
 *               body:
 *                 type: string
 *                 description: Notification body
 *               data:
 *                 type: object
 *                 description: Optional data payload
 *     responses:
 *       200:
 *         description: Test notification sent
 *       403:
 *         description: Not available in production
 */
router.post(
  "/test/send",
  requireAuth,
  validateRequest(sendTestNotificationSchema),
  fcmController.sendTestNotification.bind(fcmController)
);

/**
 * @swagger
 * /api/fcm/announcement:
 *   post:
 *     summary: Send system-wide announcement (admin only)
 *     tags: [FCM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 description: Announcement title
 *               body:
 *                 type: string
 *                 description: Announcement body
 *               targetRole:
 *                 type: string
 *                 enum: [CUSTOMER, TECHNICIAN, MAINTENANCE_ADMIN, BASMA_ADMIN, ALL]
 *                 description: Optional role to target (defaults to ALL)
 *               announcementId:
 *                 type: string
 *                 description: Optional announcement ID for tracking
 *     responses:
 *       200:
 *         description: Announcement sent successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/announcement",
  requireAuth,
  validateRequest(sendAnnouncementSchema),
  fcmController.sendAnnouncement.bind(fcmController)
);

export default router;
