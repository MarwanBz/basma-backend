import {
  addCommentSchema,
  assignRequestSchema,
  createRequestSchema,
  deleteRequestSchema,
  getRequestByIdSchema,
  getRequestsQuerySchema,
  selfAssignRequestSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
} from "@/validators/request.validator";
import { requireAuth, requireRole } from "@/middleware/authMiddleware";

import { RequestController } from "@/controllers/request.controller";
import { RequestService } from "@/services/request.service";
import { Router } from "express";
import { cache } from "@/middleware/cacheMiddleware";
import { validateRequest } from "@/middleware/validateRequest";

// DEPRECATED: Old file service - replaced by new storage service
// import { FileController } from "@/controllers/file.controller";
// import { FileService } from "@/services/file.service";
// import { FileConfiguration } from "@/types/file.types";

const router = Router();
const requestService = new RequestService();
const requestController = new RequestController(requestService);

// DEPRECATED: Old file service initialization - replaced by new storage service
// See: src/routes/storage.routes.ts for the new implementation
/*
const fileConfig: FileConfiguration = {
  storage: {
    provider: 'hetzner',
    bucket: process.env.HETZNER_BUCKET_NAME || 'basma-maintenance-files',
    region: process.env.HETZNER_REGION || 'nbg1',
    endpoint: process.env.HETZNER_ENDPOINT_URL,
    accessKeyId: process.env.HETZNER_ACCESS_KEY_ID!,
    secretAccessKey: process.env.HETZNER_SECRET_ACCESS_KEY!,
    encryptionEnabled: true,
    cdnEnabled: false,
    cdnBaseUrl: process.env.CDN_BASE_URL
  },
  security: {
    enableVirusScanning: process.env.ENABLE_VIRUS_SCANNING === 'true',
    enableContentValidation: true,
    allowedMimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/zip', 'application/x-rar-compressed'
    ],
    blockedMimeTypes: [
      'application/x-executable', 'application/x-msdownload', 'application/x-msdos-program',
      'application/x-java-applet', 'application/x-shockwave-flash', 'text/x-php'
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFilesPerUpload: 10,
    requireAuth: true,
    auditRetentionDays: 365
  },
  processing: {
    generateThumbnails: true,
    thumbnailSize: { width: 300, height: 300 },
    enableImageOptimization: true,
    enableMetadataExtraction: true,
    processingTimeout: 30000 // 30 seconds
  },
  features: {
    enablePublicFiles: true,
    enableFileExpiration: true,
    enableDownloadCount: true,
    enableBulkOperations: false,
    enableVersioning: false
  }
};

const fileService = new FileService(fileConfig);
const fileController = new FileController(fileService);
*/

/**
 * @swagger
 * tags:
 *   name: Requests
 *   description: Maintenance request management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED]
 *         location:
 *           type: string
 *         building:
 *           type: string
 *         specificLocation:
 *           type: string
 *         estimatedCost:
 *           type: number
 *           format: decimal
 *         actualCost:
 *           type: number
 *           format: decimal
 *         scheduledDate:
 *           type: string
 *           format: date-time
 *         completedDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         category:
 *           $ref: '#/components/schemas/RequestCategory'
 *         requestedBy:
 *           $ref: '#/components/schemas/User'
 *         assignedTo:
 *           $ref: '#/components/schemas/User'
 *         assignedBy:
 *           $ref: '#/components/schemas/User'
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequestComment'
 *         statusHistory:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequestStatusHistory'
 *         assignmentHistory:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequestAssignmentHistory'
 *
 *     RequestCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *
 *     RequestComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         text:
 *           type: string
 *         isInternal:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     RequestStatusHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fromStatus:
 *           type: string
 *         toStatus:
 *           type: string
 *         reason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         changedBy:
 *           $ref: '#/components/schemas/User'
 *
 *     RequestAssignmentHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         assignmentType:
 *           type: string
 *           enum: [INITIAL_ASSIGNMENT, REASSIGNMENT, SELF_ASSIGNMENT, UNASSIGNMENT]
 *         reason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         assignedBy:
 *           $ref: '#/components/schemas/User'
 *         fromTechnician:
 *           $ref: '#/components/schemas/User'
 *         toTechnician:
 *           $ref: '#/components/schemas/User'
 *
 *     User:
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
 *           enum: [SUPER_ADMIN, MAINTENANCE_ADMIN, BASMA_ADMIN, TECHNICIAN, CUSTOMER]
 */

// Protected routes - all routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/v1/requests:
 *   post:
 *     summary: Create a new maintenance request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - categoryId
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *                 default: MEDIUM
 *               categoryId:
 *                 type: integer
 *               location:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               building:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               specificLocation:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               estimatedCost:
 *                 type: number
 *                 format: decimal
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  validateRequest(createRequestSchema),
  requestController.create
);

/**
 * DEPRECATED: This route used the old file service and has been disabled.
 * To create requests with files, use:
 * 1. POST /api/v1/requests to create the request
 * 2. POST /api/v1/storage/upload to upload files separately
 *
 * Future enhancement: Integrate new storage service with request creation
 */
/*
router.post(
  "/with-files",
  FileController.uploadMiddleware,
  async (req: any, res: any, next: any) => {
    // ... old implementation commented out
  }
);
*/

/**
 * @swagger
 * /api/v1/requests:
 *   get:
 *     summary: Get all maintenance requests with filtering and pagination
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, priority, status]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: assignedToId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: requestedById
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: building
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of requests with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MaintenanceRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  validateRequest(getRequestsQuerySchema),
  cache({ duration: 60 }), // Cache for 1 minute
  requestController.getAll
);

/**
 * @swagger
 * /api/v1/requests/{id}:
 *   get:
 *     summary: Get a maintenance request by ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request details with full history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Request not found
 */
router.get(
  "/:id",
  validateRequest(getRequestByIdSchema),
  cache({ duration: 30 }), // Cache for 30 seconds
  requestController.getById
);

/**
 * @swagger
 * /api/v1/requests/{id}:
 *   put:
 *     summary: Update a maintenance request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               categoryId:
 *                 type: integer
 *               location:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               building:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               specificLocation:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               estimatedCost:
 *                 type: number
 *                 format: decimal
 *               actualCost:
 *                 type: number
 *                 format: decimal
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               completedDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Request not found
 */
router.put(
  "/:id",
  validateRequest(updateRequestSchema),
  requestController.update
);

/**
 * @swagger
 * /api/v1/requests/{id}:
 *   delete:
 *     summary: Delete a maintenance request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Request not found
 */
router.delete(
  "/:id",
  validateRequest(deleteRequestSchema),
  requestController.delete
);

/**
 * @swagger
 * /api/v1/requests/{id}/comments:
 *   post:
 *     summary: Add a comment to a maintenance request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *               isInternal:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RequestComment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Request not found
 */
router.post(
  "/:id/comments",
  validateRequest(addCommentSchema),
  requestController.addComment
);

/**
 * @swagger
 * /api/v1/requests/{id}/status:
 *   patch:
 *     summary: Update request status
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, CLOSED, REJECTED]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       400:
 *         description: Invalid input or status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Role cannot update to this status
 *       404:
 *         description: Request not found
 */
router.patch(
  "/:id/status",
  validateRequest(updateRequestStatusSchema),
  requestController.updateStatus
);

/**
 * @swagger
 * /api/v1/requests/{id}/assign:
 *   post:
 *     summary: Assign request to a technician (Admin only)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedToId
 *             properties:
 *               assignedToId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Request assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Request or technician not found
 */
router.post(
  "/:id/assign",
  requireRole(["SUPER_ADMIN", "MAINTENANCE_ADMIN"]),
  validateRequest(assignRequestSchema),
  requestController.assign
);

/**
 * @swagger
 * /api/v1/requests/{id}/self-assign:
 *   post:
 *     summary: Self-assign request (Technician only)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request self-assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceRequest'
 *       400:
 *         description: Request not available for assignment
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Technician only
 *       404:
 *         description: Request not found
 */
router.post(
  "/:id/self-assign",
  requireRole(["TECHNICIAN"]),
  validateRequest(selfAssignRequestSchema),
  requestController.selfAssign
);

export default router;
