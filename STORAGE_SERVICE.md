# Storage Service Documentation

## Overview

This document describes the current storage service implementation and references features from the previous implementation that can be re-implemented in the future.

## Current Implementation

### Architecture

The storage service uses **AWS SDK v3** with **Hetzner Object Storage** (S3-compatible API).

**Key Files:**
- `src/config/storage.config.ts` - Storage configuration
- `src/services/storage/storage.service.ts` - Core storage operations
- `src/services/fileUpload.service.ts` - File upload orchestration
- `src/controllers/fileUpload.controller.ts` - HTTP request handling
- `src/routes/storage.routes.ts` - API routes

### Current Features

✅ **Basic File Upload**
- Single file upload per request
- File size limit: 50MB
- All file types allowed
- Authentication required

✅ **File Storage**
- Files stored in Hetzner Object Storage
- Unique file key generation: `uploads/{userId}/{timestamp}-{random}-{filename}`
- Private storage (files not publicly accessible)

✅ **Signed URLs**
- Generate time-limited signed URLs for file access
- Default expiration: 1 hour (configurable)

✅ **Error Handling**
- Proper HTTP status codes
- Detailed error messages
- Logging for debugging

### API Endpoint

**POST `/api/v1/storage/upload`**

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Authentication: Bearer token required
- Body: Form field named `file` with the file

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "key": "uploads/userId/2025-01-10T12-30-45-123Z-random123_document.pdf",
    "url": "https://your-endpoint.com/bucket/uploads/...",
    "signedUrl": "https://your-endpoint.com/bucket/uploads/...?signature=...",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "contentType": "application/pdf",
    "uploadedAt": "2025-01-10T12:30:45.123Z"
  }
}
```

### Configuration

Environment variables required:
```bash
HETZNER_ENDPOINT_URL=https://nbg1.your-objectstorage.com
HETZNER_ACCESS_KEY_ID=your-access-key
HETZNER_SECRET_ACCESS_KEY=your-secret-key
HETZNER_BUCKET_NAME=basma-files
HETZNER_REGION=nbg1
```

---

## Previous Implementation Features (Deprecated)

The following features were implemented in the previous version (`src/services/file.service.ts` and `src/services/storage/hetznerStorage.service.ts`) and can be referenced for future enhancements:

### 1. Multiple File Upload
- **Location:** `src/services/file.service.ts` - `uploadFiles()` method
- **Feature:** Upload multiple files (up to 10) in a single request
- **Implementation:** Loop through files array, upload each individually, return array of results with errors

### 2. File Validation Service
- **Location:** `src/services/validation/fileValidation.service.ts`
- **Features:**
  - Basic file properties validation
  - MIME type validation (allowed/blocked lists)
  - File signature validation (magic bytes)
  - File size validation
  - Content-based validation
  - Security scanning
  - Metadata extraction

### 3. Entity-Based File Organization
- **Location:** `src/services/file.service.ts` - `uploadSingleFile()` method
- **Feature:** Files associated with entities (MAINTENANCE_REQUEST, REQUEST_COMMENT, USER_PROFILE, BUILDING_CONFIG)
- **File Key Format:** `{entityType}/{entityId}/{timestamp}/{random}_{filename}`
- **Database Integration:** Files stored in `file_attachment` table with entity relationships

### 4. Thumbnail Generation
- **Location:** `src/services/file.service.ts` - Processing workflow
- **Feature:** Automatic thumbnail generation for images and PDFs
- **Configuration:**
  - Thumbnail size: 300x300 pixels (configurable)
  - Storage: Separate thumbnail keys in storage
  - Format: JPEG for thumbnails

### 5. Image Optimization
- **Location:** Previous implementation processing workflow
- **Feature:** Automatic image optimization/compression
- **Tools:** Sharp library for image processing

### 6. Metadata Extraction
- **Location:** `src/services/validation/fileValidation.service.ts` - `extractMetadata()` method
- **Features:**
  - Image dimensions (width, height)
  - Video duration
  - File checksum (MD5/SHA256)
  - EXIF data for images
  - PDF metadata

### 7. Virus Scanning
- **Location:** Previous implementation security scanning
- **Feature:** Optional virus scanning for uploaded files
- **Configuration:** `ENABLE_VIRUS_SCANNING` environment variable
- **Status:** Can be enabled/disabled per configuration

### 8. File Download Endpoints
- **Location:** `src/routes/file.routes.ts` (deprecated)
- **Endpoints:**
  - `GET /api/v1/files/:id/download` - Direct file download
  - `GET /api/v1/files/:id/download-url` - Get signed download URL
  - `GET /api/v1/files/:id/thumbnail-url` - Get thumbnail signed URL

### 9. File Management Endpoints
- **Location:** `src/routes/file.routes.ts` (deprecated)
- **Endpoints:**
  - `GET /api/v1/files/:id` - Get file metadata
  - `GET /api/v1/files/my-files` - Get current user's files
  - `GET /api/v1/entities/:entityType/:entityId/files` - Get files for an entity
  - `PATCH /api/v1/files/:id` - Update file metadata
  - `DELETE /api/v1/files/:id` - Delete file

### 10. File Search & Filtering
- **Location:** `src/services/file.service.ts` - `searchFiles()` method
- **Features:**
  - Search by filename
  - Filter by entity type
  - Filter by MIME type
  - Filter by processing status
  - Pagination support
  - Sorting options

### 11. File Expiration
- **Location:** Previous implementation
- **Feature:** Files can have expiration dates
- **Storage:** `expiresAt` field in database
- **Behavior:** Files become inaccessible after expiration

### 12. Public/Private Files
- **Location:** Previous implementation
- **Feature:** Files can be marked as public or private
- **Storage:** `isPublic` boolean field
- **Behavior:** Public files accessible without authentication (with proper URL)

### 13. Download Tracking
- **Location:** Previous implementation
- **Feature:** Track download counts and last accessed time
- **Storage:** `downloadCount` and `lastAccessedAt` fields in database

### 14. Role-Based Access Control
- **Location:** `src/services/file.service.ts` - Security context
- **Feature:** Different permissions based on user roles
- **Permissions:**
  - `canUpload` - Upload files
  - `canDownload` - Download files
  - `canDelete` - Delete files
  - `canViewMetadata` - View file metadata
  - `canManagePublic` - Manage public/private status
  - `canBypassLimits` - Bypass file size/type limits

### 15. File Processing Status
- **Location:** Previous implementation
- **Feature:** Track file processing status
- **Statuses:**
  - `PENDING` - File uploaded, processing not started
  - `PROCESSING` - Currently being processed
  - `COMPLETED` - Processing completed successfully
  - `FAILED` - Processing failed
  - `THUMBNAIL_GENERATING` - Thumbnail being generated
  - `VIRUS_SCANNING` - Virus scan in progress

### 16. Bulk Operations
- **Location:** Previous implementation
- **Feature:** Delete multiple files at once
- **Method:** `deleteMultipleFiles()` in storage service

### 17. File Copying
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `copyFile()` method
- **Feature:** Copy files within storage
- **Use Case:** Duplicate files for different entities

### 18. File Listing
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `listFiles()` method
- **Feature:** List files with prefix filtering
- **Parameters:** Prefix, max keys, pagination

### 19. Bucket Usage Statistics
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `getBucketUsage()` method
- **Feature:** Get storage usage statistics
- **Returns:** File count, total size, last modified date

### 20. Stream-Based Upload/Download
- **Location:** `src/services/storage/hetznerStorage.service.ts`
- **Features:**
  - `uploadFileStream()` - Upload from file path (stream)
  - `downloadFileStream()` - Download to file path (stream)
- **Use Case:** Large files, avoid loading entire file into memory

### 21. File Metadata Storage
- **Location:** Previous implementation database schema
- **Database Table:** `file_attachment`
- **Fields:**
  - File information (name, size, type, extension)
  - Checksum for integrity verification
  - Image/video metadata (dimensions, duration)
  - Processing status
  - Thumbnail path
  - Security flags (virus scan results)
  - Entity relationships
  - Access tracking (download count, last accessed)
  - Expiration dates

### 22. Advanced File Key Generation
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `generateFileKey()` method
- **Format:** `{entityType}/{entityId}/{date}/{random}_{sanitizedFilename}`
- **Features:**
  - Organized by entity type and ID
  - Date-based organization
  - Random component for uniqueness
  - Sanitized filenames

### 23. Thumbnail Key Generation
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `generateThumbnailKey()` method
- **Feature:** Generate thumbnail storage keys from original file keys
- **Format:** `{originalKey}_thumb.{extension}`

### 24. File Key Validation
- **Location:** `src/services/storage/hetznerStorage.service.ts` - `validateKey()` method
- **Features:**
  - Length validation (max 1024 characters)
  - Invalid character checking
  - Consecutive slash prevention
  - Leading/trailing slash prevention

---

## Migration Notes

### What Changed

1. **SDK Upgrade:** Migrated from AWS SDK v2 to v3
   - Old: `aws-sdk` package
   - New: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`

2. **Simplified Architecture:** Removed complex features for initial implementation
   - No database integration (files not stored in DB)
   - No entity relationships
   - No thumbnail generation
   - No virus scanning
   - No metadata extraction
   - Single file upload only

3. **New Route Structure:**
   - Old: `/api/v1/files/*`
   - New: `/api/v1/storage/*`

### Deprecated Files (Kept for Reference)

- `src/services/storage/hetznerStorage.service.ts` - Old storage service (AWS SDK v2)
- `src/services/file.service.ts` - Old file service with all features
- `src/routes/file.routes.ts` - Old file routes
- `src/controllers/file.controller.ts` - Old file controller

---

## Future Enhancements

Based on the previous implementation, here are features that can be added:

### High Priority
1. **Database Integration** - Store file metadata in database
2. **File Download Endpoint** - Add download functionality
3. **File Delete Endpoint** - Add delete functionality
4. **Multiple File Upload** - Support multiple files per request

### Medium Priority
5. **Thumbnail Generation** - Automatic thumbnail creation for images
6. **File Validation** - MIME type and file signature validation
7. **Entity Relationships** - Link files to entities (requests, users, etc.)
8. **File Listing** - List user's files with pagination

### Low Priority
9. **Virus Scanning** - Optional virus scanning integration
10. **Image Optimization** - Automatic image compression
11. **Metadata Extraction** - Extract file metadata (dimensions, duration, etc.)
12. **File Expiration** - Set expiration dates for files
13. **Public/Private Files** - Mark files as public or private
14. **Download Tracking** - Track download counts and access times

---

## Implementation References

When implementing future features, refer to:

1. **File Validation:** `src/services/validation/fileValidation.service.ts`
2. **Entity Relationships:** `src/services/file.service.ts` - `uploadSingleFile()` method
3. **Thumbnail Generation:** Previous processing workflow in file service
4. **Database Schema:** Prisma schema for `file_attachment` model
5. **Security Context:** `src/types/file.types.ts` - `FileSecurityContext` interface
6. **File Configuration:** `src/types/file.types.ts` - `FileConfiguration` interface

---

## Testing

### Manual Testing

**Upload a file:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.pdf"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "key": "uploads/...",
    "url": "https://...",
    "signedUrl": "https://...",
    "fileName": "file.pdf",
    "fileSize": 12345,
    "contentType": "application/pdf",
    "uploadedAt": "2025-01-10T12:30:45.123Z"
  }
}
```

---

## Environment Variables

```bash
# Hetzner Object Storage Configuration
HETZNER_ENDPOINT_URL=https://nbg1.your-objectstorage.com
HETZNER_ACCESS_KEY_ID=your-access-key
HETZNER_SECRET_ACCESS_KEY=your-secret-key
HETZNER_BUCKET_NAME=basma-files
HETZNER_REGION=nbg1

# Optional: Future features
ENABLE_VIRUS_SCANNING=false
CDN_BASE_URL=
```

---

## Support

For issues or questions:
- Check logs: `logs/` directory
- Review error messages in API responses
- Check Hetzner Object Storage dashboard for storage issues

---

**Last Updated:** January 2025
**Version:** 2.0 (Simplified Storage Service)

