/**
 * DEPRECATED: This file contains the old file management routes.
 * These routes have been replaced by the new storage service.
 *
 * New implementation: src/routes/storage.routes.ts
 *
 * This file is kept for reference only and routes are disabled.
 *
 * For implementation details, see:
 * - src/deprecated/storage/services/file.service.ts - Service implementation
 * - src/deprecated/storage/controllers/file.controller.ts - Controller implementation
 * - STORAGE_SERVICE.md - Complete documentation of features
 *
 * Old endpoints that were available:
 * - POST /api/v1/files/upload - Upload files to an entity
 * - GET /api/v1/files/my-files - Get current user's files
 * - GET /api/v1/files/:id - Get file metadata
 * - GET /api/v1/files/:id/download - Download file
 * - GET /api/v1/files/:id/download-url - Get signed download URL
 * - GET /api/v1/files/:id/thumbnail-url - Get thumbnail URL
 * - DELETE /api/v1/files/:id - Delete file
 * - PATCH /api/v1/files/:id - Update file metadata
 * - GET /api/v1/entities/:entityType/:entityId/files - Get entity files
 */

// Export empty router to prevent import errors
import { Router } from "express";
const router = Router();
export default router;
