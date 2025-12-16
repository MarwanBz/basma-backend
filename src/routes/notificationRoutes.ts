const express = require("express");
const router = express.Router();
const {
  subscribeTopic,
  sendToTopic,
  registerDevice,
  unregisterDevice,
  getSubscriptions,
  sendAnnouncement,
  sendTestNotification,
  unsubscribeTopic
} = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

// All notification routes require authentication
router.use(requireAuth);

// Device registration
router.post("/token", registerDevice);
router.delete("/token", unregisterDevice);

// Topic subscriptions
router.post("/subscribe-topic", subscribeTopic);
router.post("/unsubscribe-topic", unsubscribeTopic);
router.get("/subscriptions", getSubscriptions);

// Send notifications
router.post("/send-to-topic", sendToTopic);
router.post("/announcement", sendAnnouncement);
router.post("/test", sendTestNotification);

module.exports = router;
