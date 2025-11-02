import { Router } from "express";
import { MonitoringController } from "@/controllers/monitoring.controller";
import { MetricsService } from "@/services/metrics.service";
import { requireAuth, requireRole } from "@/middleware/authMiddleware";

const router = Router();
const metricsService = new MetricsService();
const monitoringController = new MonitoringController(metricsService);

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: System monitoring and health check endpoints
 */

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/metrics", requireAuth, requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]), monitoringController.getMetrics);

/**
 * @swagger
 * /api/v1/monitoring/health:
 *   get:
 *     summary: Check system health
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 memoryUsage:
 *                   type: object
 */
router.get("/health", monitoringController.getHealth);

/**
 * @swagger
 * /api/v1/monitoring/readiness:
 *   get:
 *     summary: Check if application is ready to handle traffic
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Application is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get("/readiness", monitoringController.getReadiness);

/**
 * @swagger
 * /api/v1/monitoring/liveness:
 *   get:
 *     summary: Check if application is alive
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get("/liveness", monitoringController.getLiveness);

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   post:
 *     summary: Receive alerts from AlertManager
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alerts:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Alert received and processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/alerts", requireAuth, requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]), monitoringController.handleAlert);

/**
 * @swagger
 * /api/v1/monitoring/simulate-error:
 *   get:
 *     summary: Simulate random errors (for testing)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       400:
 *         description: Bad Request Error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal Server Error
 *       503:
 *         description: Service Unavailable
 */
router.get("/simulate-error", requireAuth, requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]), monitoringController.simulateError);

/**
 * @swagger
 * /api/v1/monitoring/trigger-gc:
 *   get:
 *     summary: Trigger garbage collection (for testing)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GC triggered successfully
 *       400:
 *         description: GC not exposed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/trigger-gc", requireAuth, requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]), async (req, res) => {
  if (global.gc) {
    global.gc();
    res.json({ message: "GC triggered" });
  } else {
    res.status(400).json({ message: "GC not exposed. Run Node with --expose-gc flag" });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/simulate-memory-leak:
 *   get:
 *     summary: Simulate memory leak (for testing)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Memory leak simulated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/simulate-memory-leak", requireAuth, requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]), (req, res) => {
  const arr: any[] = [];
  for (let i = 0; i < 1000000; i++) {
    arr.push(new Array(1000).fill('test'));
  }
  res.json({ message: "Memory leak simulated" });
});

export default router;
