import {
  createBuildingConfigSchema,
  deleteBuildingConfigSchema,
  getBuildingConfigSchema,
  getNextIdentifierSchema,
  resetBuildingSequenceSchema,
  updateBuildingConfigSchema,
} from "@/validators/buildingConfig.validator";
import { requireAuth, requireRole } from "@/middleware/authMiddleware";
import { BuildingConfigController } from "@/controllers/buildingConfig.controller";
import { BuildingConfigService } from "@/services/buildingConfig.service";
import { Router } from "express";
import { validateRequest } from "@/middleware/validateRequest";

const router = Router();
const buildingConfigService = new BuildingConfigService();
const buildingConfigController = new BuildingConfigController(buildingConfigService);

/**
 * @swagger
 * tags:
 *   name: Building Configurations
 *   description: Building management and identifier configuration endpoints
 */

// Protected routes - all routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/v1/building-configs:
 *   post:
 *     summary: Create a new building configuration
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingName
 *             properties:
 *               buildingName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               buildingCode:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 10
 *                 pattern: '^[A-Z0-9]+$'
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               allowCustomId:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Building configuration created successfully
 *       400:
 *         description: Invalid input or building already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
  "/",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  validateRequest(createBuildingConfigSchema),
  buildingConfigController.create
);

/**
 * @swagger
 * /api/v1/building-configs:
 *   get:
 *     summary: Get all building configurations
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of building configurations
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  buildingConfigController.getAll
);

/**
 * @swagger
 * /api/v1/building-configs/statistics:
 *   get:
 *     summary: Get building statistics
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingName
 *         schema:
 *           type: string
 *         description: Filter statistics by specific building
 *     responses:
 *       200:
 *         description: Building statistics
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/statistics",
  buildingConfigController.getStatistics
);

/**
 * @swagger
 * /api/v1/building-configs/{buildingName}:
 *   get:
 *     summary: Get building configuration by name
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Building configuration details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Building configuration not found
 */
router.get(
  "/:buildingName",
  validateRequest(getBuildingConfigSchema),
  buildingConfigController.getByName
);

/**
 * @swagger
 * /api/v1/building-configs/{buildingName}:
 *   put:
 *     summary: Update building configuration
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               buildingCode:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 10
 *                 pattern: '^[A-Z0-9]+$'
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               allowCustomId:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               resetSequence:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Building configuration updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Building configuration not found
 */
router.put(
  "/:buildingName",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  validateRequest(updateBuildingConfigSchema),
  buildingConfigController.update
);

/**
 * @swagger
 * /api/v1/building-configs/{buildingName}:
 *   delete:
 *     summary: Delete building configuration
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Building configuration deleted successfully
 *       400:
 *         description: Cannot delete - has associated requests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Building configuration not found
 */
router.delete(
  "/:buildingName",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  validateRequest(deleteBuildingConfigSchema),
  buildingConfigController.delete
);

/**
 * @swagger
 * /api/v1/building-configs/{buildingName}/next-identifier:
 *   get:
 *     summary: Get next available identifier for a building
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next available identifier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nextIdentifier:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Building configuration not found
 */
router.get(
  "/:buildingName/next-identifier",
  validateRequest(getNextIdentifierSchema),
  buildingConfigController.getNextIdentifier
);

/**
 * @swagger
 * /api/v1/building-configs/{buildingName}/reset-sequence:
 *   post:
 *     summary: Reset building sequence
 *     tags: [Building Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Building sequence reset successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Building configuration not found
 */
router.post(
  "/:buildingName/reset-sequence",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  validateRequest(resetBuildingSequenceSchema),
  buildingConfigController.resetSequence
);

export default router;