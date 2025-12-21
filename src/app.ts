import { ErrorRequestHandler, NextFunction, Request, Response } from "express";

import { ENV } from "@/config/env";
import { ErrorMonitoringService } from "@/services/errorMonitoring.service";
import { apiLimiter } from "@/middleware/rateLimiter";
import { authLimiter } from "@/middleware/rateLimiter";
import authRoutes from "@/routes/auth.routes";
import buildingConfigRoutes from "@/routes/buildingConfig.routes";
import { cache } from "@/middleware/cacheMiddleware";
import categoryRoutes from "@/routes/category.routes";
import { compressionMiddleware } from "@/middleware/performanceMiddleware";
import cors from "cors";
import { errorHandler } from "@/middleware/errorHandler";
import express from "express";
// DEPRECATED: FCM notification routes - moved to src/deprecated/notifications/
// import fcmRoutes from "@/routes/fcm.routes";
import { loggingMiddleware } from "@/middleware/loggingMiddleware";
import { metricsMiddleware } from "@/middleware/monitoringMiddleware";
import monitoringRoutes from "@/routes/monitoring.routes";
import { notFoundHandler } from "./middleware/notFound";
import { requestId } from "@/middleware/requestId";
import requestRoutes from "@/routes/request.routes";
import notificationRoutes from "@/routes/notifications.routes";
import { setupSecurityHeaders } from "@/middleware/securityHeaders";
import { specs } from "./docs/swagger";
// New comprehensive file management routes
import fileRoutes from "@/routes/file.routes";
// DEPRECATED: Old simple storage route - replaced by new file service
import storageRoutes from "@/routes/storage.routes";
import superAdminRoutes from "@/routes/super-admin.routes";
import swaggerUi from "swagger-ui-express";
import technicianRoutes from "@/routes/technician.routes";
import userRoutes from "@/routes/user.routes";
// import notificationRoutes from "@/routes/notificationRoutes";
var admin = require("firebase-admin");

// Initialize Firebase only if we have valid credentials
try {
  var serviceAccount = require("../config/firebase-service-account.json");

  // Check if service account has placeholder values
  if (serviceAccount.private_key.includes("PLACEHOLDER_PRIVATE_KEY")) {
    console.warn("⚠️  Firebase service account contains placeholder values. Firebase initialization skipped.");
    console.warn("   To enable Firebase, update config/firebase-service-account.json with real credentials");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized successfully");
  }
} catch (error: any) {
  console.warn("⚠️  Firebase initialization failed:", error.message);
  console.warn("   Firebase features will be disabled");
}

const app = express();

// Initialize error monitoring
ErrorMonitoringService.getInstance();

// Group middleware by function
const setupMiddleware = (app: express.Application) => {
  // Security
  app.use(requestId);
  setupSecurityHeaders(app as express.Express);
  app.options("*", cors()); // enable pre-flight requests
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "https://basma-admin-dashboard.vercel.app",
        "https://basma.expo.app",
      ],
      credentials: true,
    }),
  );

  // Performance
  app.use(compressionMiddleware);
  app.use(express.json({ limit: "10kb" }));

  // Monitoring
  app.use(loggingMiddleware);
  app.use(metricsMiddleware);

  // Rate Limiting
  app.use("/api/v1/auth", authLimiter);
  app.use("/api/v1", apiLimiter);
};

setupMiddleware(app);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "🚀 Hello from express-boilerplate Backend!" });
});

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

// API v1 Routes - Consistent RESTful Design
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/maintenance-requests", requestRoutes);
app.use("/api/v1/technicians", technicianRoutes);
app.use("/api/v1/administrators", superAdminRoutes);
app.use("/api/v1/buildings", buildingConfigRoutes);
// File management routes (comprehensive)
app.use("/api/v1/files", fileRoutes);
// DEPRECATED: Simple storage route (kept for backward compatibility)
app.use("/api/v1/notifications", notificationRoutes);
// DEPRECATED: Old file routes - replaced by new storage service
// app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/storage", storageRoutes);
// DEPRECATED: FCM notification routes - moved to src/deprecated/notifications/
// const notificationRoutes = require("@/routes/notificationRoutes");
app.use("/api/v1/notifications", notificationRoutes);

// Monitoring Routes (consolidated - removed duplicate)
app.use("/api/v1/monitoring", monitoringRoutes);

// Swagger Documentation
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "none",
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    servers: [
      {
        url: `http://localhost:${ENV.PORT}/api/v1`,
        description: "Development server - API v1",
      },
    ],
  },
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "BASMA Maintenance Platform API v1 Documentation",
};

app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", swaggerUi.setup(specs, swaggerOptions));

// 404 Handler - MUST be before error handler
app.use(notFoundHandler);

// Error Handler - MUST be ABSOLUTELY LAST
const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  return errorHandler(err, req, res, next);
};

app.use(errorMiddleware);

export default app;
