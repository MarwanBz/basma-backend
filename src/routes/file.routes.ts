import { FileController } from "@/controllers/file.controller";
import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "@/middleware/authMiddleware";

const router = Router();
const fileController = new FileController();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // File type validation handled by FileValidationService
    cb(null, true);
  },
});

// Rate limiting for uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 uploads per windowMs
  message: {
    success: false,
    error: "Too many file uploads, please try again later.",
  },
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management endpoints
 */

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - entityType
 *               - entityId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               entityType:
 *                 type: string
 *                 enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *               entityId:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post(
  "/upload",
  requireAuth,
  uploadRateLimit,
  upload.single("file"),
  fileController.uploadFile
);

/**
 * @swagger
 * /api/v1/files/upload-multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *               - entityType
 *               - entityId
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               entityType:
 *                 type: string
 *                 enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *               entityId:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload-multiple",
  requireAuth,
  uploadRateLimit,
  upload.array("files", 10), // Max 10 files
  fileController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: List all files (Admin only)
 *     tags: [Files]
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
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
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
 *       - in: query
 *         name: minSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maxSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All files retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 */
router.get("/", requireAuth, fileController.listAllFiles);

/**
 * @swagger
 * /api/v1/files/my-files:
 *   get:
 *     summary: Get current user's files
 *     tags: [Files]
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
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
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
 *       - in: query
 *         name: minSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maxSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/my-files", requireAuth, fileController.listMyFiles);

/**
 * @swagger
 * /api/v1/files/search:
 *   get:
 *     summary: Search files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for filename
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio, archive]
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, fileSize, originalName, downloadCount]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         description: Unauthorized
 */
router.get("/search", requireAuth, fileController.searchFiles);

/**
 * @swagger
 * /api/v1/files/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get files for a specific entity
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Entity files retrieved successfully
 *       400:
 *         description: Invalid entity type
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/entity/:entityType/:entityId",
  requireAuth,
  fileController.listEntityFiles
);

// Parameterized routes - MUST come AFTER specific routes
/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Get download URL for a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *         description: URL expiration time in seconds (default 3600)
 *     responses:
 *       200:
 *         description: Download URL generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.get("/:id/download", requireAuth, fileController.downloadFile);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file details
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File details retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.get("/:id", requireAuth, fileController.getFile);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.delete("/:id", requireAuth, fileController.deleteFile);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   patch:
 *     summary: Update file metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublic:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: File metadata updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.patch("/:id", requireAuth, fileController.updateFileMetadata);

export default router;
