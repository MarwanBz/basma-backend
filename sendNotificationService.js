// import { getFirebaseAdmin } from "@/lib/firebase-admin";

const getFirebaseAdmin = require("../firebase/firebase-admin");

module.exports = async (notificationData) => {
  try {
    const topic = "all-users";

    const messaging = getFirebaseAdmin();

    // Send notification to topic
    const message = {
      topic: topic,
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
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

    const response = await messaging.send(message);

    console.log(`Successfully sent notification to topic: ${topic}`);
    return response;
  } catch (error) {
    console.error("Error in send-notification API:", error);
    return error;
  }
};
