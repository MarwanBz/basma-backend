import { ErrorRequestHandler, NextFunction, Request, Response } from "express";

import { ENV } from "@/config/env";
import { ErrorMonitoringService } from "@/services/errorMonitoring.service";
import { apiLimiter } from "@/middleware/rateLimiter";
import { authLimiter } from "@/middleware/rateLimiter";
import authRoutes from "@/routes/auth.routes";
import { cache } from "@/middleware/cacheMiddleware";
import categoryRoutes from "@/routes/category.routes";
import { compressionMiddleware } from "@/middleware/performanceMiddleware";
import cors from "cors";
import { errorHandler } from "@/middleware/errorHandler";
import express from "express";
import { loggingMiddleware } from "@/middleware/loggingMiddleware";
import { metricsMiddleware } from "@/middleware/monitoringMiddleware";
import monitoringRoutes from "@/routes/monitoring.routes";
import { notFoundHandler } from "./middleware/notFound";
import { requestId } from "@/middleware/requestId";
import requestRoutes from "@/routes/request.routes";
import { setupSecurityHeaders } from "@/middleware/securityHeaders";
import { specs } from "./docs/swagger";
import superAdminRoutes from "@/routes/super-admin.routes";
import swaggerUi from "swagger-ui-express";
import technicianRoutes from "@/routes/technician.routes";
import userRoutes from "@/routes/user.routes";
import buildingConfigRoutes from "@/routes/buildingConfig.routes";

const app = express();

// Initialize error monitoring
ErrorMonitoringService.getInstance();

// Group middleware by function
const setupMiddleware = (app: express.Application) => {
  // Security
  app.use(requestId);
  setupSecurityHeaders(app as express.Express);
  app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));

  // Performance
  app.use(compressionMiddleware);
  app.use(express.json({ limit: "10kb" }));

  // Monitoring
  app.use(loggingMiddleware);
  app.use(metricsMiddleware);

  // Rate Limiting
  app.use("/api/auth", authLimiter);
  app.use("/api", apiLimiter);
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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/building-configs", buildingConfigRoutes);

// Monitoring Routes (consolidated - removed duplicate)
app.use("/api/monitoring", monitoringRoutes);

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
  },
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Express TypeScript API Documentation",
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
