import { Router } from 'express';
import { FileController } from '@/controllers/file.controller';
import { FileService } from '@/services/file.service';
import { requireAuth } from '@/middleware/authMiddleware';
import { validateRequest } from '@/middleware/validateRequest';
import { cache } from '@/middleware/cacheMiddleware';
import { rateLimit } from 'express-rate-limit';
import {
  uploadFileSchema,
  getFileSchema,
  deleteFileSchema,
  getEntityFilesSchema,
  updateFileMetadataSchema,
  getUserFilesSchema,
  getDownloadUrlSchema,
  getThumbnailUrlSchema
} from '@/validators/file.validator';
import { FileConfiguration } from '@/types/file.types';

// Create file configuration - in a real app, this would come from environment variables or config
const fileConfig: FileConfiguration = {
  storage: {
    provider: 'hetzner',
    bucket: process.env.HETZNER_BUCKET_NAME || 'basma-files',
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
    enableBulkOperations: false, // Can be enabled later
    enableVersioning: false // Can be enabled later
  }
};

const router = Router();
const fileService = new FileService(fileConfig);
const fileController = new FileController(fileService);

// Rate limiting for file operations
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 uploads per windowMs
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const downloadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 downloads per windowMs
  message: {
    success: false,
    error: 'Too many download requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication to all routes
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FileAttachment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         originalName:
 *           type: string
 *         fileName:
 *           type: string
 *         fileSize:
 *           type: integer
 *         mimeType:
 *           type: string
 *         fileExtension:
 *           type: string
 *         checksum:
 *           type: string
 *         width:
 *           type: integer
 *           nullable: true
 *         height:
 *           type: integer
 *           nullable: true
 *         duration:
 *           type: integer
 *           nullable: true
 *         processingStatus:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, THUMBNAIL_GENERATING, VIRUS_SCANNING]
 *         thumbnailPath:
 *           type: string
 *           nullable: true
 *         isPublic:
 *           type: boolean
 *         isScanned:
 *           type: boolean
 *         scanResult:
 *           type: string
 *           nullable: true
 *         isValidated:
 *           type: boolean
 *         entityType:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *         entityId:
 *           type: string
 *         uploadedById:
 *           type: string
 *         uploadIp:
 *           type: string
 *           nullable: true
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         downloadCount:
 *           type: integer
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         uploadedBy:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *         url:
 *           type: string
 *           nullable: true
 *         downloadUrl:
 *           type: string
 *           nullable: true
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload files to an entity
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
 *                 maxItems: 10
 *               entityType:
 *                 type: string
 *                 enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploaded:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FileAttachment'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Bad request - Invalid input or file validation failed
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: Payload Too Large - File size exceeds limit
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 */
router.post(
  '/upload',
  uploadRateLimit,
  FileController.uploadMiddleware,
  validateRequest(uploadFileSchema, 'body'),
  fileController.uploadFiles
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file metadata by ID
 *     tags: [Files]
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
 *         description: File metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FileAttachment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found
 */
router.get(
  '/:id',
  validateRequest(getFileSchema, 'params'),
  cache({ duration: 300 }), // Cache for 5 minutes
  fileController.getFile
);

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Download file by ID
 *     tags: [Files]
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
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found
 *       410:
 *         description: Gone - File has expired
 */
router.get(
  '/:id/download',
  downloadRateLimit,
  validateRequest(getFileSchema, 'params'),
  fileController.downloadFile
);

/**
 * @swagger
 * /api/v1/files/{id}/download-url:
 *   get:
 *     summary: Get signed download URL for a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           minimum: 60
 *           maximum: 86400
 *           default: 3600
 *         description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found
 */
router.get(
  '/:id/download-url',
  validateRequest(getDownloadUrlSchema, 'params'),
  validateRequest(getDownloadUrlSchema, 'query'),
  cache({ duration: 300 }), // Cache URLs for 5 minutes
  fileController.getDownloadUrl
);

/**
 * @swagger
 * /api/v1/files/{id}/thumbnail-url:
 *   get:
 *     summary: Get signed thumbnail URL for a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           minimum: 60
 *           maximum: 86400
 *           default: 3600
 *         description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Thumbnail URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     thumbnailUrl:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found or thumbnail not available
 */
router.get(
  '/:id/thumbnail-url',
  validateRequest(getThumbnailUrlSchema, 'params'),
  validateRequest(getThumbnailUrlSchema, 'query'),
  cache({ duration: 1800 }), // Cache thumbnail URLs for 30 minutes
  fileController.getThumbnailUrl
);

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
 *           format: uuid
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found
 */
router.delete(
  '/:id',
  validateRequest(deleteFileSchema, 'params'),
  fileController.deleteFile
);

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
 *           format: uuid
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
 *         description: File metadata updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FileAttachment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: File not found
 */
router.patch(
  '/:id',
  validateRequest(getFileSchema, 'params'),
  validateRequest(updateFileMetadataSchema, 'body'),
  fileController.updateFileMetadata
);

/**
 * @swagger
 * /api/v1/entities/{entityType}/{entityId}/files:
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
 *           format: uuid
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
 *           enum: [createdAt, updatedAt, fileSize, originalName]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: processingStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, THUMBNAIL_GENERATING, VIRUS_SCANNING]
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FileAttachment'
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
 *       403:
 *         description: Forbidden - Access denied
 */
router.get(
  '/entities/:entityType/:entityId/files',
  validateRequest(getEntityFilesSchema, 'params'),
  validateRequest(getEntityFilesSchema, 'query'),
  cache({ duration: 120 }), // Cache for 2 minutes
  fileController.getEntityFiles
);

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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, fileSize, originalName]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG]
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *     responses:
 *       200:
 *         description: User files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FileAttachment'
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
  '/my-files',
  validateRequest(getUserFilesSchema, 'query'),
  cache({ duration: 60 }), // Cache for 1 minute
  fileController.getUserFiles
);

export default router;