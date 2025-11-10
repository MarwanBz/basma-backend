/**
 * DEPRECATED: This route is kept for backward compatibility only
 * 
 * Please use the new /api/v1/files routes instead:
 * - POST /api/v1/files/upload - Single file upload
 * - POST /api/v1/files/upload-multiple - Multiple file upload
 * - GET /api/v1/files/:id/download - Download file
 * - DELETE /api/v1/files/:id - Delete file
 * - GET /api/v1/files/my-files - List user files
 * - GET /api/v1/files/search - Search files
 * 
 * The new file service provides:
 * - Database integration
 * - Entity relationships
 * - File validation
 * - Access control
 * - Download tracking
 * - Search and filtering
 */

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

export default router;

