import { Router } from "express";
import { TechnicianController } from "@/controllers/technician.controller";
import { TechnicianService } from "@/services/technician.service";
import { requireAuth, requireRole } from "@/middleware/authMiddleware";
import { cache } from "@/middleware/cacheMiddleware";

const router = Router();
const technicianService = new TechnicianService();
const technicianController = new TechnicianController(technicianService);

/**
 * @swagger
 * tags:
 *   name: Technicians
 *   description: Technician management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Technician:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [TECHNICIAN]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     TechnicianListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             technicians:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Technician'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */

// Protected routes - all routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /technicians:
 *   get:
 *     summary: Get all technicians (Admin only)
 *     tags: [Technicians]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of technicians per page
 *     responses:
 *       200:
 *         description: List of technicians with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicianListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  "/",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  cache({ duration: 300 }), // Cache for 5 minutes
  technicianController.getAll
);

/**
 * @swagger
 * /technicians/{id}:
 *   get:
 *     summary: Get technician by ID
 *     tags: [Technicians]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Technician ID
 *     responses:
 *       200:
 *         description: Technician details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Technician'
 *       403:
 *         description: Forbidden - Not authorized to access this profile
 *       404:
 *         description: Technician not found
 */
router.get(
  "/:id",
  cache({ duration: 60 }), // Cache for 1 minute
  technicianController.getById
);

export default router;
