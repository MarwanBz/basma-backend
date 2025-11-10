/**
 * DEPRECATED: This service uses the old HetznerStorageService (AWS SDK v2) and has been replaced.
 *
 * New implementation: src/services/fileUpload.service.ts
 * New routes: src/routes/storage.routes.ts
 *
 * This file is kept for reference only. Do not use in new code.
 *
 * Location: src/deprecated/storage/services/file.service.ts
 *
 * For implementation details, see:
 * - STORAGE_SERVICE.md - Complete documentation of features
 * - src/deprecated/storage/README.md - Overview of deprecated files
 *
 * Key features that were implemented:
 * - Multiple file upload (up to 10 files)
 * - File validation (MIME type, file signature, size, content)
 * - Entity-based file organization (MAINTENANCE_REQUEST, REQUEST_COMMENT, etc.)
 * - Thumbnail generation for images and PDFs
 * - Metadata extraction (dimensions, duration, checksum, EXIF)
 * - Virus scanning (optional)
 * - Database integration (file_attachment table)
 * - File expiration dates
 * - Public/private file access
 * - Download tracking
 * - Role-based access control
 * - File processing status tracking
 * - Search and filtering
 */

// This file is kept for reference only - no implementation needed
