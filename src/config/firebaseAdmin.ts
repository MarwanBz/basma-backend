import * as admin from "firebase-admin";

import fs from "fs";
import { logger } from "./logger";
import path from "path";

let messagingInstance: admin.messaging.Messaging | null = null;

const resolveServiceAccount = () => {
  const defaultPath = path.join(
    process.cwd(),
    "config",
    "firebase-service-account.json"
  );
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultPath;

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase service account file not found at: ${serviceAccountPath}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require(serviceAccountPath);

  return {
    serviceAccount,
    serviceAccountPath,
  };
};

const ensureApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const { serviceAccount, serviceAccountPath } = resolveServiceAccount();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    serviceAccount.project_id ||
    "basma-maintenance";

  logger.info("Initializing Firebase Admin SDK", {
    projectId,
    serviceAccountPath,
  });

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      `https://${projectId}.firebaseio.com`,
  });
};

export const getMessagingClient = (): admin.messaging.Messaging => {
  if (messagingInstance) return messagingInstance;

  const app = ensureApp();
  messagingInstance = admin.messaging(app);
  return messagingInstance;
};
