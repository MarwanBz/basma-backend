/**
 * DEPRECATED: This service uses AWS SDK v2 and has been replaced by the new storage service.
 *
 * New implementation: src/services/storage/storage.service.ts
 *
 * This file is kept for reference only. Do not use in new code.
 * The old FileService and HetznerStorageService depend on aws-sdk v2 which has been removed.
 *
 * Location: src/deprecated/storage/services/hetznerStorage.service.ts
 *
 * For implementation details, see:
 * - STORAGE_SERVICE.md - Complete documentation of features
 * - src/deprecated/storage/README.md - Overview of deprecated files
 *
 * Key methods that were implemented:
 * - uploadFile() - Upload file from buffer
 * - uploadFileStream() - Upload file from file path (stream)
 * - downloadFile() - Download file to buffer
 * - downloadFileStream() - Download file to file path (stream)
 * - getSignedUrl() - Generate signed URL for file access
 * - deleteFile() - Delete a single file
 * - deleteMultipleFiles() - Delete multiple files at once
 * - copyFile() - Copy file within storage
 * - fileExists() - Check if file exists
 * - getFileMetadata() - Get file metadata (headObject)
 * - listFiles() - List files with prefix filtering
 * - getBucketUsage() - Get storage usage statistics
 * - generateFileKey() - Generate unique file keys
 * - generateThumbnailKey() - Generate thumbnail keys
 * - validateKey() - Validate S3 key format
 *
 * Note: All implementation code has been removed as it uses AWS SDK v2.
 * Refer to the new implementation in src/services/storage/storage.service.ts
 * which uses AWS SDK v3.
 */

// This file is kept for reference only - no implementation needed
