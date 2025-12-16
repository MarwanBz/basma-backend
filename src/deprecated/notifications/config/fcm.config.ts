import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

import { logger } from "@/config/logger";

/**
 * Firebase Cloud Messaging Configuration
 *
 * This module initializes the Firebase Admin SDK for sending push notifications.
 * It uses a service account JSON file for authentication.
 * 
 * @deprecated This configuration has been deprecated and moved to the deprecated folder.
 * All FCM notification functionality has been removed from the active codebase.
 */

interface FirebaseConfig {
  projectId: string;
  serviceAccountPath: string;
  databaseURL?: string;
}

class FirebaseConfigManager {
  private static instance: admin.app.App | null = null;
  private static isInitialized = false;

  /**
   * Initialize Firebase Admin SDK
   * This should be called once at application startup
   */
  static initialize(): admin.app.App {
    if (this.isInitialized && this.instance) {
      return this.instance;
    }

    try {
      const config = this.loadConfig();

      // Validate service account file exists
      if (!fs.existsSync(config.serviceAccountPath)) {
        throw new Error(
          `Firebase service account file not found at: ${config.serviceAccountPath}\n` +
            `Please ensure the file exists in the config directory.`
        );
      }

      // Load service account
      const serviceAccount = require(config.serviceAccountPath);

      // Initialize Firebase Admin
      this.instance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.projectId,
        databaseURL: config.databaseURL,
      });

      this.isInitialized = true;

      logger.info("✅ Firebase Admin SDK initialized successfully", {
        projectId: config.projectId,
      });

      return this.instance;
    } catch (error) {
      logger.error("❌ Failed to initialize Firebase Admin SDK", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load Firebase configuration from environment variables
   */
  private static loadConfig(): FirebaseConfig {
    const projectId = process.env.FIREBASE_PROJECT_ID || "basma-maintenance";

    // Default to config/firebase-service-account.json
    const defaultPath = path.join(
      process.cwd(),
      "config",
      "firebase-service-account.json"
    );

    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultPath;

    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      `https://${projectId}.firebaseio.com`;

    return {
      projectId,
      serviceAccountPath,
      databaseURL,
    };
  }

  /**
   * Get the Firebase Admin app instance
   */
  static getApp(): admin.app.App {
    if (!this.isInitialized || !this.instance) {
      return this.initialize();
    }
    return this.instance;
  }

  /**
   * Get Firebase Messaging instance
   */
  static getMessaging(): admin.messaging.Messaging {
    const app = this.getApp();
    return admin.messaging(app);
  }

  /**
   * Validate Firebase configuration without initializing
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const config = this.loadConfig();

      if (!config.projectId) {
        errors.push("FIREBASE_PROJECT_ID is not set");
      }

      if (!fs.existsSync(config.serviceAccountPath)) {
        errors.push(
          `Firebase service account file not found at: ${config.serviceAccountPath}`
        );
      } else {
        // Validate JSON structure
        try {
          const serviceAccount = require(config.serviceAccountPath);
          const requiredFields = [
            "type",
            "project_id",
            "private_key",
            "client_email",
          ];

          for (const field of requiredFields) {
            if (!serviceAccount[field]) {
              errors.push(`Service account missing required field: ${field}`);
            }
          }
        } catch (err) {
          errors.push("Service account file is not valid JSON");
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Unknown validation error"
      );
      return {
        valid: false,
        errors,
      };
    }
  }
}

// Export the configuration manager
export { FirebaseConfigManager };

// Export Firebase Admin for direct access if needed
export { admin };

