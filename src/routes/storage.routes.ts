import { Router } from 'express';
import multer from 'multer';
import { FileUploadController } from '@/controllers/fileUpload.controller';
import { requireAuth } from '@/middleware/authMiddleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const fileUploadController = new FileUploadController();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Single file upload
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation - allow all types for now
    // Can be enhanced later with specific MIME type restrictions
    cb(null, true);
  },
});

// Rate limiting for uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 uploads per windowMs
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Storage
 *   description: File storage endpoints
 */

/**
 * @swagger
 * /api/v1/storage/upload:
 *   post:
 *     summary: Upload a file to Hetzner Object Storage
 *     tags: [Storage]
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                     key:
 *                       type: string
 *                     url:
 *                       type: string
 *                     signedUrl:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     contentType:
 *                       type: string
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - No file provided or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: Payload Too Large - File size exceeds limit
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 */
router.post(
  '/upload',
  requireAuth,
  uploadRateLimit,
  upload.single('file'),
  fileUploadController.uploadFile
);

/**
 * @swagger
 * /api/v1/storage/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Storage]
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
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *               entityType:
 *                 type: string
 *                 enum: [MAINTENANCE_REQUEST, USER_PROFILE, TECHNICIAN_AVATAR, DOCUMENT, OTHER]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       207:
 *         description: Multi-Status - Some files may have failed
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
 *                     uploaded:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FileUploadResponse'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fileName:
 *                             type: string
 *                           error:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         uploaded:
 *                           type: integer
 *                         failed:
 *                           type: integer
 */
router.post(
  '/upload/multiple',
  requireAuth,
  uploadRateLimit,
  upload.array('files', 10), // Max 10 files
  fileUploadController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/v1/storage/{fileKey}/download:
 *   get:
 *     summary: Get signed download URL
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           default: 3600
 *           minimum: 60
 *           maximum: 86400
 *     responses:
 *       200:
 *         description: Signed URL generated successfully
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
 *                     signedUrl:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 */
router.get(
  '/:fileKey/download',
  requireAuth,
  fileUploadController.getDownloadUrl
);

/**
 * @swagger
 * /api/v1/storage/{fileKey}:
 *   get:
 *     summary: Get file information
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File information retrieved successfully
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
 *                     key:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     contentType:
 *                       type: string
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *   delete:
 *     summary: Delete a file
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get(
  '/:fileKey',
  requireAuth,
  fileUploadController.getFileInfo
);

router.delete(
  '/:fileKey',
  requireAuth,
  fileUploadController.deleteFile
);

/**
 * @swagger
 * /api/v1/storage/files:
 *   get:
 *     summary: List user files
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [image, document, video, audio, archive, other]
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MAINTENANCE_REQUEST, USER_PROFILE, TECHNICIAN_AVATAR, DOCUMENT, OTHER]
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
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key:
 *                             type: string
 *                           fileName:
 *                             type: string
 *                           fileSize:
 *                             type: integer
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get(
  '/files',
  requireAuth,
  fileUploadController.listFiles
);

/**
 * @swagger
 * /api/v1/storage/stats:
 *   get:
 *     summary: Get storage statistics
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: month
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     totalFiles:
 *                       type: integer
 *                     totalSize:
 *                       type: integer
 *                     fileStats:
 *                       type: object
 *                       properties:
 *                         images:
 *                           type: object
 *                           properties:
 *                             count:
 *                               type: integer
 *                             size:
 *                               type: integer
 */
router.get(
  '/stats',
  requireAuth,
  fileUploadController.getStorageStats
);

export default router;

