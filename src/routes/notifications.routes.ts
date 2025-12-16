import { Router } from "express";

import { notificationsController } from "@/controllers/notifications.controller";
import { requireAuth } from "@/middleware/authMiddleware";
import { validateRequest } from "@/middleware/validateRequest";
import {
  registerDeviceSchema,
  sendTopicSchema,
  subscribeTopicSchema,
  listHistorySchema,
  markReadSchema,
  unregisterDeviceSchema,
  unsubscribeTopicSchema,
} from "@/validators/notifications.validator";

const router = Router();

router.post(
  "/token",
  requireAuth,
  validateRequest(registerDeviceSchema),
  notificationsController.registerDevice.bind(notificationsController)
);

router.delete(
  "/token",
  requireAuth,
  validateRequest(unregisterDeviceSchema),
  notificationsController.unregisterDevice.bind(notificationsController)
);

router.post(
  "/subscribe-topic",
  requireAuth,
  validateRequest(subscribeTopicSchema),
  notificationsController.subscribeToTopic.bind(notificationsController)
);

router.post(
  "/unsubscribe-topic",
  requireAuth,
  validateRequest(unsubscribeTopicSchema),
  notificationsController.unsubscribeFromTopic.bind(notificationsController)
);

router.get(
  "/subscriptions",
  requireAuth,
  notificationsController.listSubscriptions.bind(notificationsController)
);

router.get(
  "/history",
  requireAuth,
  validateRequest(listHistorySchema, "query"),
  notificationsController.listHistory.bind(notificationsController)
);

router.post(
  "/mark-read",
  requireAuth,
  validateRequest(markReadSchema),
  notificationsController.markRead.bind(notificationsController)
);

router.post(
  "/send-to-topic",
  requireAuth,
  validateRequest(sendTopicSchema),
  notificationsController.sendToTopic.bind(notificationsController)
);

export default router;

