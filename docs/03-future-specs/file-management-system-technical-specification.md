# Extensible File Management System - Technical Specification

## Overview

This technical specification document outlines the implementation details for the Extensible File Management System (EFMS) in the BASMA Maintenance Platform. The system provides a scalable, secure, and extensible file management infrastructure with polymorphic relationships to support multiple entity types.

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │  Object Storage │
│   (React/Web)   │◄──►│   (Node.js)     │◄──►│  (Hetzner S3)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │    MySQL DB     │              │
         │              │   (Prisma)      │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     CDN         │    │   Redis Cache   │    │  Virus Scanner  │
│   (Optional)    │    │   (File URLs)   │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Component Breakdown

**Frontend Components:**
- File Upload Component (drag & drop, progress tracking)
- File Viewer Component (images, PDFs, documents)
- File Manager Component (list, grid, search, filter)
- File Validation Component (client-side validation)

**Backend Components:**
- File Upload Service (handling, validation, processing)
- File Storage Service (Hetzner Object Storage integration)
- File Processing Service (thumbnails, optimization)
- Security Service (virus scanning, access control)
- Audit Service (logging, tracking)

**Infrastructure Components:**
- Hetzner Object Storage (primary file storage)
- MySQL Database (file metadata and relationships)
- Redis Cache (file URL caching and session management)
- CDN (optional, for static file delivery)

## 2. Database Schema Design

### 2.1 Core File Management Tables

```sql
-- Main file entity table
CREATE TABLE files (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,

  -- File metadata
  title VARCHAR(255),
  description TEXT,
  tags JSON,

  -- Processing status
  processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  processing_error TEXT,

  -- Security and access
  is_public BOOLEAN DEFAULT FALSE,
  access_level ENUM('private', 'role_based', 'public') DEFAULT 'private',
  allowed_roles JSON,

  -- Storage information
  storage_provider VARCHAR(50) DEFAULT 'hetzner',
  storage_path VARCHAR(500) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'basma-files',

  -- Thumbnail information (for images)
  thumbnail_path VARCHAR(500),
  thumbnail_generated BOOLEAN DEFAULT FALSE,

  -- Security scanning
  scan_status ENUM('pending', 'scanning', 'clean', 'infected', 'error') DEFAULT 'pending',
  scan_result JSON,
  scanned_at TIMESTAMP NULL,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(36) NULL,

  -- Audit fields
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_files_created_by (created_by),
  INDEX idx_files_processing_status (processing_status),
  INDEX idx_files_scan_status (scan_status),
  INDEX idx_files_mime_type (mime_type),
  INDEX idx_files_created_at (created_at),
  INDEX idx_files_is_deleted (is_deleted),

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- Polymorphic relationships table
CREATE TABLE file_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,

  -- Polymorphic relationship
  entity_type ENUM('maintenance_request', 'user_profile', 'building', 'comment', 'other') NOT NULL,
  entity_id VARCHAR(36) NOT NULL,

  -- Attachment metadata
  attachment_type ENUM('primary', 'secondary', 'reference', 'evidence') DEFAULT 'primary',
  display_order INT DEFAULT 0,

  -- Audit fields
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_file_entity (file_id, entity_type, entity_id),
  INDEX idx_attachments_entity (entity_type, entity_id),
  INDEX idx_attachments_file (file_id),

  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- File access log for audit trail
CREATE TABLE file_access_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,

  -- Access details
  action ENUM('view', 'download', 'upload', 'delete', 'update') NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_access_logs_file (file_id),
  INDEX idx_access_logs_user (user_id),
  INDEX idx_access_logs_action (action),
  INDEX idx_access_logs_created_at (created_at),

  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File processing jobs queue (can be implemented in Redis or DB)
CREATE TABLE file_processing_jobs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,

  -- Job details
  job_type ENUM('thumbnail_generation', 'virus_scan', 'optimization', 'metadata_extraction') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',

  -- Job data
  job_data JSON,
  result_data JSON,
  error_message TEXT,

  -- Retry mechanism
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Timing
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,

  INDEX idx_processing_jobs_file (file_id),
  INDEX idx_processing_jobs_status (status),
  INDEX idx_processing_jobs_type (job_type),
  INDEX idx_processing_jobs_scheduled (scheduled_at),

  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### 2.2 Prisma Schema Integration

```prisma
// Add to existing schema.prisma
model File {
  id                String                    @id @default(uuid())
  originalName      String                    @map("original_name") @db.VarChar(255)
  storedName        String                    @map("stored_name") @unique @db.VarChar(255)
  mimeType          String                    @map("mime_type") @db.VarChar(100)
  sizeBytes         BigInt                    @map("size_bytes")
  checksum          String                    @db.VarChar(64)

  // Metadata
  title             String?                   @db.VarChar(255)
  description       String?                   @db.Text
  tags              Json?

  // Processing
  processingStatus  ProcessingStatus          @default(PENDING) @map("processing_status")
  processingError   String?                   @map("processing_error") @db.Text

  // Security
  isPublic          Boolean                   @default(false) @map("is_public")
  accessLevel       AccessLevel               @default(PRIVATE) @map("access_level")
  allowedRoles      Json?

  // Storage
  storageProvider   String                    @default("hetzner") @map("storage_provider") @db.VarChar(50)
  storagePath       String                    @map("storage_path") @db.VarChar(500)
  storageBucket     String                    @default("basma-files") @map("storage_bucket") @db.VarChar(100)

  // Thumbnails
  thumbnailPath     String?                   @map("thumbnail_path") @db.VarChar(500)
  thumbnailGenerated Boolean                  @default(false) @map("thumbnail_generated")

  // Security scanning
  scanStatus        ScanStatus                @default(PENDING) @map("scan_status")
  scanResult        Json?
  scannedAt         DateTime?                 @map("scanned_at")

  // Soft delete
  isDeleted         Boolean                   @default(false) @map("is_deleted")
  deletedAt         DateTime?                 @map("deleted_at")
  deletedBy         String?                   @map("deleted_by")

  // Relations
  createdBy         User                      @relation("FileCreator", fields: [createdBy], references: [id])
  deletedByUser     User?                     @relation("FileDeleter", fields: [deletedBy], references: [id])

  // Polymorphic relationships
  attachments       FileAttachment[]

  // Audit
  accessLogs        FileAccessLog[]
  processingJobs    FileProcessingJob[]

  createdAt         DateTime                  @default(now()) @map("created_at")
  updatedAt         DateTime                  @updatedAt @map("updated_at")

  @@map("files")
  @@index([createdBy])
  @@index([processingStatus])
  @@index([scanStatus])
  @@index([mimeType])
  @@index([createdAt])
  @@index([isDeleted])
}

model FileAttachment {
  id               String         @id @default(uuid())
  fileId           String         @map("file_id")
  entityType       EntityType     @map("entity_type")
  entityId         String         @map("entity_id")
  attachmentType   AttachmentType @default(PRIMARY) @map("attachment_type")
  displayOrder     Int            @default(0) @map("display_order")

  // Relations
  file             File           @relation(fields: [fileId], references: [id], onDelete: Cascade)
  createdBy        User           @relation("AttachmentCreator", fields: [createdBy], references: [id])

  createdAt        DateTime       @default(now()) @map("created_at")

  @@unique([fileId, entityType, entityId])
  @@index([entityType, entityId])
  @@index([fileId])
  @@map("file_attachments")
}

model FileAccessLog {
  id           String       @id @default(uuid())
  fileId       String       @map("file_id")
  userId       String       @map("user_id")
  action       AccessAction
  ipAddress    String?      @map("ip_address") @db.VarChar(45)
  userAgent    String?      @map("user_agent") @db.Text
  success      Boolean
  errorMessage String?      @map("error_message") @db.Text

  // Relations
  file         File         @relation(fields: [fileId], references: [id])
  user         User         @relation("FileAccessUser", fields: [userId], references: [id])

  createdAt    DateTime     @default(now()) @map("created_at")

  @@index([fileId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("file_access_logs")
}

model FileProcessingJob {
  id           String            @id @default(uuid())
  fileId       String            @map("file_id")
  jobType      ProcessingJobType @map("job_type")
  status       JobStatus         @default(PENDING)
  jobData      Json?
  resultData   Json?
  errorMessage String?           @map("error_message") @db.Text
  retryCount   Int               @default(0) @map("retry_count")
  maxRetries   Int               @default(3) @map("max_retries")

  scheduledAt  DateTime          @default(now()) @map("scheduled_at")
  startedAt    DateTime?         @map("started_at")
  completedAt  DateTime?         @map("completed_at")

  // Relations
  file         File              @relation(fields: [fileId], references: [id])

  @@index([fileId])
  @@index([status])
  @@index([jobType])
  @@index([scheduledAt])
  @@map("file_processing_jobs")
}

// Enums
enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum AccessLevel {
  PRIVATE
  ROLE_BASED
  PUBLIC
}

enum ScanStatus {
  PENDING
  SCANNING
  CLEAN
  INFECTED
  ERROR
}

enum EntityType {
  MAINTENANCE_REQUEST
  USER_PROFILE
  BUILDING
  COMMENT
  OTHER
}

enum AttachmentType {
  PRIMARY
  SECONDARY
  REFERENCE
  EVIDENCE
}

enum AccessAction {
  VIEW
  DOWNLOAD
  UPLOAD
  DELETE
  UPDATE
}

enum ProcessingJobType {
  THUMBNAIL_GENERATION
  VIRUS_SCAN
  OPTIMIZATION
  METADATA_EXTRACTION
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

// Update User model to include file relationships
model user {
  // ... existing fields ...

  // New file relationships
  filesCreated     File[]             @relation("FileCreator")
  filesDeleted     File[]             @relation("FileDeleter")
  attachmentsCreated FileAttachment[] @relation("AttachmentCreator")
  fileAccessLogs   FileAccessLog[]    @relation("FileAccessUser")

  // ... existing relations ...
}

// Update maintenance_request model to include file relationships
model maintenance_request {
  // ... existing fields ...

  // Add file relationship through polymorphic attachment
  // Files will be accessible through:
  // file_attachments where entity_type = 'MAINTENANCE_REQUEST' and entity_id = request.id

  // ... existing relations ...
}
```

## 3. API Design

### 3.1 File Management Endpoints

#### File Upload Endpoints

```typescript
// POST /api/files/upload
// Upload single or multiple files
interface UploadRequest {
  files: File[];
  entity_type?: 'maintenance_request' | 'user_profile' | 'building' | 'comment';
  entity_id?: string;
  attachment_type?: 'primary' | 'secondary' | 'reference' | 'evidence';
  title?: string;
  description?: string;
  tags?: string[];
}

interface UploadResponse {
  success: boolean;
  files: {
    id: string;
    original_name: string;
    size: number;
    mime_type: string;
    upload_url?: string;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  }[];
  errors?: string[];
}

// POST /api/files/upload/presigned-url
// Get presigned URL for direct upload to storage
interface PresignedUrlRequest {
  file_name: string;
  file_size: number;
  mime_type: string;
  entity_type?: string;
  entity_id?: string;
}

interface PresignedUrlResponse {
  upload_url: string;
  file_id: string;
  upload_id: string;
  expires_at: string;
}
```

#### File Retrieval Endpoints

```typescript
// GET /api/files/:id
// Get file metadata
interface FileResponse {
  id: string;
  original_name: string;
  title?: string;
  description?: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  created_by: {
    id: string;
    name: string;
    email: string;
  };
  thumbnail_url?: string;
  download_url?: string;
  processing_status: string;
  scan_status: string;
  tags?: string[];
}

// GET /api/files/:id/download
// Download file (secure, temporary URL)
interface DownloadResponse {
  download_url: string;
  expires_at: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// GET /api/files/:id/thumbnail
// Get file thumbnail (for images)
interface ThumbnailResponse {
  thumbnail_url: string;
  expires_at: string;
}
```

#### File Management Endpoints

```typescript
// GET /api/files
// List files with filtering and pagination
interface ListFilesQuery {
  page?: number;
  limit?: number;
  entity_type?: string;
  entity_id?: string;
  mime_type?: string;
  search?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'size_bytes' | 'original_name';
  sort_order?: 'asc' | 'desc';
}

interface ListFilesResponse {
  files: FileResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters: {
    applied_filters: Record<string, any>;
    available_mime_types: string[];
    available_entity_types: string[];
  };
}

// PUT /api/files/:id
// Update file metadata
interface UpdateFileRequest {
  title?: string;
  description?: string;
  tags?: string[];
  access_level?: 'private' | 'role_based' | 'public';
  allowed_roles?: string[];
}

// DELETE /api/files/:id
// Delete file (soft delete)
interface DeleteFileResponse {
  success: boolean;
  message: string;
  deleted_at: string;
}
```

#### Entity-Specific File Endpoints

```typescript
// GET /api/maintenance-requests/:requestId/files
// Get files for specific maintenance request
interface RequestFilesResponse {
  request_id: string;
  files: FileResponse[];
  total_count: number;
  total_size: number;
}

// POST /api/maintenance-requests/:requestId/files
// Add files to maintenance request
interface AddFilesToRequestRequest {
  file_ids: string[];
  attachment_type?: 'primary' | 'secondary' | 'reference' | 'evidence';
}

// DELETE /api/maintenance-requests/:requestId/files/:fileId
// Remove file from maintenance request
interface RemoveFileFromRequestResponse {
  success: boolean;
  message: string;
}
```

### 3.2 Admin and Management Endpoints

```typescript
// GET /api/admin/files
// Admin view of all files with advanced filtering
interface AdminFilesQuery extends ListFilesQuery {
  scan_status?: 'pending' | 'scanning' | 'clean' | 'infected' | 'error';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  storage_provider?: string;
  is_deleted?: boolean;
}

// GET /api/admin/files/storage-stats
// Storage usage statistics
interface StorageStatsResponse {
  total_files: number;
  total_size_bytes: number;
  total_size_human: string;
  files_by_type: Record<string, number>;
  files_by_status: Record<string, number>;
  storage_usage_trend: {
    date: string;
    size_bytes: number;
    file_count: number;
  }[];
  projected_growth: {
    next_month: number;
    next_quarter: number;
    next_year: number;
  };
}

// POST /api/admin/files/:id/scan
// Force virus scan
interface ForceScanResponse {
  success: boolean;
  scan_job_id: string;
  message: string;
}

// POST /api/admin/files/bulk-delete
// Bulk delete files
interface BulkDeleteRequest {
  file_ids: string[];
  reason: string;
  permanent?: boolean;
}

// GET /api/admin/files/audit-log
// File access audit log
interface AuditLogQuery {
  file_id?: string;
  user_id?: string;
  action?: 'view' | 'download' | 'upload' | 'delete' | 'update';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface AuditLogResponse {
  logs: {
    id: string;
    file_id: string;
    user_id: string;
    action: string;
    ip_address: string;
    user_agent: string;
    success: boolean;
    error_message?: string;
    created_at: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

## 4. Security Implementation

### 4.1 File Upload Security

```typescript
// File validation middleware
interface FileValidationConfig {
  allowed_mime_types: string[];
  max_file_size: number;
  max_files_per_request: number;
  virus_scan_required: boolean;
  content_validation: boolean;
}

const defaultFileConfig: FileValidationConfig = {
  allowed_mime_types: [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ],
  max_file_size: 10 * 1024 * 1024, // 10MB
  max_files_per_request: 5,
  virus_scan_required: true,
  content_validation: true
};

// Content validation
class FileContentValidator {
  async validateFile(buffer: Buffer, mimeType: string): Promise<boolean> {
    switch (mimeType) {
      case 'image/jpeg':
        return this.validateJPEG(buffer);
      case 'image/png':
        return this.validatePNG(buffer);
      case 'application/pdf':
        return this.validatePDF(buffer);
      default:
        return true; // For non-binary files
    }
  }

  private async validateJPEG(buffer: Buffer): Promise<boolean> {
    // Check JPEG magic numbers
    return buffer[0] === 0xFF && buffer[1] === 0xD8 &&
           buffer[buffer.length - 2] === 0xFF &&
           buffer[buffer.length - 1] === 0xD9;
  }

  private async validatePNG(buffer: Buffer): Promise<boolean> {
    // Check PNG magic numbers
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return buffer.slice(0, 8).equals(pngSignature);
  }

  private async validatePDF(buffer: Buffer): Promise<boolean> {
    // Check PDF magic numbers
    return buffer.slice(0, 4).toString() === '%PDF';
  }
}
```

### 4.2 Access Control Implementation

```typescript
// Role-based access control for files
class FileAccessControl {
  async canAccessFile(
    userId: string,
    userRole: string,
    fileId: string,
    action: 'view' | 'download' | 'delete' | 'update'
  ): Promise<boolean> {
    const file = await this.getFile(fileId);

    // File owner can always access their files
    if (file.createdBy === userId) {
      return true;
    }

    // Check file access level
    switch (file.accessLevel) {
      case 'PRIVATE':
        return false;

      case 'ROLE_BASED':
        return file.allowedRoles?.includes(userRole) || false;

      case 'PUBLIC':
        return action !== 'delete' && action !== 'update';

      default:
        return false;
    }
  }

  async canAccessEntityFiles(
    userId: string,
    userRole: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    switch (entityType) {
      case 'MAINTENANCE_REQUEST':
        return this.canAccessRequestFiles(userId, userRole, entityId);
      case 'USER_PROFILE':
        return this.canAccessProfileFiles(userId, userRole, entityId);
      default:
        return false;
    }
  }

  private async canAccessRequestFiles(
    userId: string,
    userRole: string,
    requestId: string
  ): Promise<boolean> {
    const request = await this.getRequest(requestId);

    // Request creator can access files
    if (request.requestedById === userId) {
      return true;
    }

    // Assigned technician can access files
    if (request.assignedToId === userId) {
      return true;
    }

    // Admin roles can access all request files
    return ['SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN'].includes(userRole);
  }
}
```

### 4.3 Virus Scanning Integration

```typescript
// Virus scanning service interface
interface VirusScanner {
  scanFile(filePath: string): Promise<ScanResult>;
  scanBuffer(buffer: Buffer): Promise<ScanResult>;
}

interface ScanResult {
  isClean: boolean;
  threats: string[];
  scanTime: Date;
  engineVersion: string;
}

// Implementation using ClamAV or similar service
class ClamAVScanner implements VirusScanner {
  async scanFile(filePath: string): Promise<ScanResult> {
    // Implementation would call ClamAV daemon or API
    const result = await this.callClamAV(filePath);

    return {
      isClean: result.status === 'clean',
      threats: result.threats || [],
      scanTime: new Date(),
      engineVersion: result.engineVersion
    };
  }

  async scanBuffer(buffer: Buffer): Promise<ScanResult> {
    // Save buffer to temporary file and scan
    const tempPath = await this.saveTempFile(buffer);
    const result = await this.scanFile(tempPath);
    await this.cleanupTempFile(tempPath);
    return result;
  }

  private async callClamAV(filePath: string): Promise<any> {
    // ClamAV implementation
  }
}

// Scanning workflow
class FileScanningWorkflow {
  constructor(
    private scanner: VirusScanner,
    private fileService: FileService
  ) {}

  async scanUploadedFile(fileId: string): Promise<void> {
    try {
      // Update scan status
      await this.fileService.updateScanStatus(fileId, 'SCANNING');

      // Get file path
      const file = await this.fileService.getFile(fileId);

      // Scan file
      const scanResult = await this.scanner.scanFile(file.storagePath);

      // Update scan result
      await this.fileService.updateScanResult(fileId, {
        status: scanResult.isClean ? 'CLEAN' : 'INFECTED',
        result: scanResult,
        scannedAt: new Date()
      });

      // If infected, quarantine file
      if (!scanResult.isClean) {
        await this.quarantineFile(fileId);
      }

    } catch (error) {
      await this.fileService.updateScanStatus(fileId, 'ERROR');
      throw error;
    }
  }

  private async quarantineFile(fileId: string): Promise<void> {
    // Move file to quarantine storage
    // Update file status
    // Notify administrators
  }
}
```

## 5. File Processing Implementation

### 5.1 Image Processing Service

```typescript
// Image processing using Sharp or similar library
class ImageProcessor {
  async generateThumbnails(filePath: string, outputDir: string): Promise<Thumbnail[]> {
    const thumbnails: Thumbnail[] = [];

    // Generate multiple thumbnail sizes
    const sizes = [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 800, height: 600 }
    ];

    for (const size of sizes) {
      const thumbnailPath = await this.generateThumbnail(
        filePath,
        outputDir,
        size.width,
        size.height
      );

      thumbnails.push({
        size: size.name,
        width: size.width,
        height: size.height,
        path: thumbnailPath,
        file_size: await this.getFileSize(thumbnailPath)
      });
    }

    return thumbnails;
  }

  private async generateThumbnail(
    inputPath: string,
    outputDir: string,
    width: number,
    height: number
  ): Promise<string> {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${filename}_${width}x${height}.jpg`);

    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);

    return outputPath;
  }

  async optimizeImage(filePath: string): Promise<OptimizationResult> {
    const originalSize = await this.getFileSize(filePath);

    // Optimize image
    const optimizedBuffer = await sharp(filePath)
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    const optimizedSize = optimizedBuffer.length;
    const savings = originalSize - optimizedSize;
    const savingsPercent = (savings / originalSize) * 100;

    return {
      original_size: originalSize,
      optimized_size: optimizedSize,
      savings_bytes: savings,
      savings_percent: Math.round(savingsPercent * 100) / 100,
      optimized_buffer: optimizedBuffer
    };
  }

  async extractImageMetadata(filePath: string): Promise<ImageMetadata> {
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      color_space: metadata.space,
      has_alpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      density: metadata.density
    };
  }
}

interface Thumbnail {
  size: string;
  width: number;
  height: number;
  path: string;
  file_size: number;
}

interface OptimizationResult {
  original_size: number;
  optimized_size: number;
  savings_bytes: number;
  savings_percent: number;
  optimized_buffer: Buffer;
}

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  color_space?: string;
  has_alpha?: boolean;
  orientation?: number;
  density?: number;
}
```

### 5.2 Document Processing Service

```typescript
// PDF and document processing
class DocumentProcessor {
  async extractPDFMetadata(filePath: string): Promise<PDFMetadata> {
    // Use pdf-parse or similar library
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);

    return {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creation_date: data.info?.CreationDate,
      modification_date: data.info?.ModDate,
      text_preview: data.text?.substring(0, 500) // First 500 chars
    };
  }

  async generatePDFThumbnails(filePath: string, outputDir: string): Promise<string[]> {
    // Use pdftoppm or similar tool
    const thumbnails: string[] = [];
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-thumbnails-'));

    try {
      // Generate thumbnail for first page
      const thumbnailPath = path.join(outputDir, `${path.basename(filePath, '.pdf')}_thumb.jpg`);

      await this.convertPDFPageToImage(filePath, thumbnailPath, {
        page: 1,
        width: 300,
        height: 400,
        format: 'jpeg'
      });

      thumbnails.push(thumbnailPath);

    } finally {
      await fs.rm(tempDir, { recursive: true });
    }

    return thumbnails;
  }

  private async convertPDFPageToImage(
    pdfPath: string,
    outputPath: string,
    options: any
  ): Promise<void> {
    // Implementation using pdftoppm, Ghostscript, or similar
    // This would be a separate process call
  }
}

interface PDFMetadata {
  pages: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creation_date?: Date;
  modification_date?: Date;
  text_preview?: string;
}
```

## 6. Storage Integration

### 6.1 Hetzner Object Storage Service

```typescript
// Hetzner Object Storage (S3-compatible) implementation
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class HetznerStorageService {
  private s3Client: S3Client;

  constructor(private config: StorageConfig) {
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: true // Required for some S3-compatible services
    });
  }

  async uploadFile(
    bucketName: string,
    objectKey: string,
    body: Buffer | Stream,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
      Metadata: metadata || {},
      ACL: 'private' // Files are private by default
    });

    const result = await this.s3Client.send(command);

    return {
      etag: result.ETag,
      versionId: result.VersionId,
      location: `https://${bucketName}.${this.config.endpoint}/${objectKey}`
    };
  }

  async getPresignedUploadUrl(
    bucketName: string,
    objectKey: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
      ACL: 'private'
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(
    bucketName: string,
    objectKey: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(bucketName: string, objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    await this.s3Client.send(command);
  }

  async getFileMetadata(bucketName: string, objectKey: string): Promise<FileMetadata> {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    const result = await this.s3Client.send(command);

    return {
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      etag: result.ETag,
      metadata: result.Metadata
    };
  }

  generateObjectKey(fileId: string, originalName: string): string {
    const ext = path.extname(originalName);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `files/${date}/${fileId}${ext}`;
  }

  generateThumbnailKey(fileId: string, size: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `thumbnails/${date}/${fileId}_${size}.jpg`;
  }
}

interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface UploadResult {
  etag?: string;
  versionId?: string;
  location?: string;
}

interface FileMetadata {
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
  metadata?: Record<string, string>;
}
```

### 6.2 File Service Integration

```typescript
// Main file service that orchestrates all file operations
class FileService {
  constructor(
    private storageService: HetznerStorageService,
    private imageProcessor: ImageProcessor,
    private documentProcessor: DocumentProcessor,
    private virusScanner: VirusScanner,
    private db: PrismaClient
  ) {}

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    options?: UploadOptions
  ): Promise<File> {
    // Create file record
    const fileId = uuidv4();
    const checksum = this.calculateChecksum(fileBuffer);

    const file = await this.db.file.create({
      data: {
        id: fileId,
        originalName,
        storedName: this.generateStoredName(fileId, originalName),
        mimeType,
        sizeBytes: BigInt(fileBuffer.length),
        checksum,
        title: options?.title,
        description: options?.description,
        tags: options?.tags,
        accessLevel: options?.accessLevel || 'PRIVATE',
        allowedRoles: options?.allowedRoles,
        createdBy: userId
      }
    });

    try {
      // Upload to storage
      const objectKey = this.storageService.generateObjectKey(fileId, originalName);
      await this.storageService.uploadFile(
        process.env.HETZNER_BUCKET!,
        objectKey,
        fileBuffer,
        mimeType,
        {
          'original-name': originalName,
          'uploaded-by': userId,
          'file-id': fileId
        }
      );

      // Update file record with storage path
      await this.db.file.update({
        where: { id: fileId },
        data: { storagePath: objectKey }
      });

      // Start processing workflow
      await this.startProcessingWorkflow(fileId, mimeType);

      return file;

    } catch (error) {
      // Clean up on failure
      await this.db.file.delete({ where: { id: fileId } });
      throw error;
    }
  }

  private async startProcessingWorkflow(fileId: string, mimeType: string): Promise<void> {
    // Queue processing jobs
    await this.queueProcessingJob(fileId, 'VIRUS_SCAN');

    if (mimeType.startsWith('image/')) {
      await this.queueProcessingJob(fileId, 'THUMBNAIL_GENERATION');
      await this.queueProcessingJob(fileId, 'OPTIMIZATION');
      await this.queueProcessingJob(fileId, 'METADATA_EXTRACTION');
    } else if (mimeType === 'application/pdf') {
      await this.queueProcessingJob(fileId, 'METADATA_EXTRACTION');
      await this.queueProcessingJob(fileId, 'THUMBNAIL_GENERATION');
    }
  }

  async processFile(fileId: string, jobType: ProcessingJobType): Promise<void> {
    const file = await this.db.file.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('File not found');

    try {
      switch (jobType) {
        case 'VIRUS_SCAN':
          await this.processVirusScan(fileId);
          break;
        case 'THUMBNAIL_GENERATION':
          await this.processThumbnailGeneration(fileId, file.mimeType);
          break;
        case 'OPTIMIZATION':
          await this.processOptimization(fileId, file.mimeType);
          break;
        case 'METADATA_EXTRACTION':
          await this.processMetadataExtraction(fileId, file.mimeType);
          break;
      }
    } catch (error) {
      await this.updateProcessingJobStatus(fileId, jobType, 'FAILED', error.message);
      throw error;
    }
  }

  private async processVirusScan(fileId: string): Promise<void> {
    const file = await this.db.file.findUnique({ where: { id: fileId } });
    const fileBuffer = await this.downloadFileFromStorage(file.storagePath);

    const scanResult = await this.virusScanner.scanBuffer(fileBuffer);

    await this.db.file.update({
      where: { id: fileId },
      data: {
        scanStatus: scanResult.isClean ? 'CLEAN' : 'INFECTED',
        scanResult: scanResult,
        scannedAt: new Date()
      }
    });

    if (!scanResult.isClean) {
      await this.quarantineFile(fileId);
    }
  }

  private async processThumbnailGeneration(fileId: string, mimeType: string): Promise<void> {
    const file = await this.db.file.findUnique({ where: { id: fileId } });

    if (mimeType.startsWith('image/')) {
      const thumbnails = await this.imageProcessor.generateThumbnails(
        file.storagePath,
        '/tmp/thumbnails'
      );

      // Upload thumbnails to storage
      for (const thumbnail of thumbnails) {
        const thumbnailKey = this.storageService.generateThumbnailKey(fileId, thumbnail.size);
        const thumbnailBuffer = fs.readFileSync(thumbnail.path);

        await this.storageService.uploadFile(
          process.env.HETZNER_BUCKET!,
          thumbnailKey,
          thumbnailBuffer,
          'image/jpeg'
        );
      }

      await this.db.file.update({
        where: { id: fileId },
        data: {
          thumbnailGenerated: true,
          thumbnailPath: this.storageService.generateThumbnailKey(fileId, 'medium')
        }
      });

    } else if (mimeType === 'application/pdf') {
      const thumbnails = await this.documentProcessor.generatePDFThumbnails(
        file.storagePath,
        '/tmp/thumbnails'
      );

      // Upload PDF thumbnail
      const thumbnailKey = this.storageService.generateThumbnailKey(fileId, 'medium');
      const thumbnailBuffer = fs.readFileSync(thumbnails[0]);

      await this.storageService.uploadFile(
        process.env.HETZNER_BUCKET!,
        thumbnailKey,
        thumbnailBuffer,
        'image/jpeg'
      );

      await this.db.file.update({
        where: { id: fileId },
        data: {
          thumbnailGenerated: true,
          thumbnailPath: thumbnailKey
        }
      });
    }
  }

  async getDownloadUrl(fileId: string, userId: string): Promise<string> {
    const file = await this.db.file.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('File not found');

    // Check access permissions
    const hasAccess = await this.checkFileAccess(fileId, userId, 'download');
    if (!hasAccess) throw new Error('Access denied');

    // Generate presigned URL
    const downloadUrl = await this.storageService.getPresignedDownloadUrl(
      process.env.HETZNER_BUCKET!,
      file.storagePath,
      3600 // 1 hour expiry
    );

    // Log access
    await this.logFileAccess(fileId, userId, 'download');

    return downloadUrl;
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private generateStoredName(fileId: string, originalName: string): string {
    const ext = path.extname(originalName);
    return `${fileId}${ext}`;
  }

  private async downloadFileFromStorage(storagePath: string): Promise<Buffer> {
    // Implementation to download file from Hetzner storage
    // This would use the S3 GetObject command
    throw new Error('Not implemented');
  }

  private async quarantineFile(fileId: string): Promise<void> {
    // Move file to quarantine bucket/folder
    // Update file status
    // Notify administrators
  }

  private async checkFileAccess(fileId: string, userId: string, action: string): Promise<boolean> {
    // Implement access control logic
    return true;
  }

  private async logFileAccess(fileId: string, userId: string, action: string): Promise<void> {
    // Log file access for audit trail
    await this.db.fileAccessLog.create({
      data: {
        fileId,
        userId,
        action: action as any,
        success: true,
        ipAddress: '', // Would get from request context
        userAgent: '' // Would get from request context
      }
    });
  }
}

interface UploadOptions {
  title?: string;
  description?: string;
  tags?: string[];
  accessLevel?: 'PRIVATE' | 'ROLE_BASED' | 'PUBLIC';
  allowedRoles?: string[];
}
```

## 7. Performance Optimization

### 7.1 Caching Strategy

```typescript
// Redis-based caching for file URLs and metadata
class FileCacheService {
  constructor(private redis: Redis) {}

  async cacheFileMetadata(fileId: string, metadata: any): Promise<void> {
    const key = `file:metadata:${fileId}`;
    await this.redis.setex(key, 3600, JSON.stringify(metadata)); // 1 hour cache
  }

  async getCachedFileMetadata(fileId: string): Promise<any | null> {
    const key = `file:metadata:${fileId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDownloadUrl(fileId: string, url: string, expiresIn: number): Promise<void> {
    const key = `file:download_url:${fileId}`;
    await this.redis.setex(key, expiresIn, url);
  }

  async getCachedDownloadUrl(fileId: string): Promise<string | null> {
    const key = `file:download_url:${fileId}`;
    return await this.redis.get(key);
  }

  async cacheThumbnailUrl(fileId: string, size: string, url: string): Promise<void> {
    const key = `file:thumbnail:${fileId}:${size}`;
    await this.redis.setex(key, 86400, url); // 24 hour cache
  }

  async invalidateFileCache(fileId: string): Promise<void> {
    const pattern = `file:*:${fileId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 7.2 Upload Optimization

```typescript
// Chunked upload for large files
class ChunkedUploadService {
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  async initiateChunkedUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
    userId: string
  ): Promise<ChunkedUploadSession> {
    const sessionId = uuidv4();
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

    // Create upload session record
    const session = await this.db.chunkedUploadSession.create({
      data: {
        id: sessionId,
        fileName,
        fileSize: BigInt(fileSize),
        mimeType,
        totalChunks,
        uploadedChunks: 0,
        status: 'INITIATED',
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    return session;
  }

  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunkData: Buffer
  ): Promise<void> {
    const session = await this.db.chunkedUploadSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.status !== 'INITIATED') {
      throw new Error('Invalid upload session');
    }

    // Store chunk temporarily
    const chunkPath = `/tmp/uploads/${sessionId}/${chunkIndex}`;
    await fs.ensureDir(path.dirname(chunkPath));
    await fs.writeFile(chunkPath, chunkData);

    // Update session progress
    await this.db.chunkedUploadSession.update({
      where: { id: sessionId },
      data: {
        uploadedChunks: session.uploadedChunks + 1,
        lastChunkUploadedAt: new Date()
      }
    });

    // Check if upload is complete
    if (session.uploadedChunks + 1 >= session.totalChunks) {
      await this.completeChunkedUpload(sessionId);
    }
  }

  private async completeChunkedUpload(sessionId: string): Promise<void> {
    const session = await this.db.chunkedUploadSession.findUnique({
      where: { id: sessionId }
    });

    // Combine chunks into final file
    const finalFilePath = `/tmp/uploads/${sessionId}/final`;
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = `/tmp/uploads/${sessionId}/${i}`;
      const chunkData = await fs.readFile(chunkPath);
      writeStream.write(chunkData);
    }

    writeStream.end();

    // Wait for file to be written
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Process final file
    const fileBuffer = await fs.readFile(finalFilePath);

    // Create file record using regular upload service
    const file = await this.fileService.uploadFile(
      fileBuffer,
      session.fileName,
      session.mimeType,
      session.userId
    );

    // Update session status
    await this.db.chunkedUploadSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        fileId: file.id,
        completedAt: new Date()
      }
    });

    // Cleanup temporary files
    await fs.remove(`/tmp/uploads/${sessionId}`);
  }
}
```

## 8. Error Handling and Monitoring

### 8.1 Error Handling Strategy

```typescript
// File-related error types
class FileError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'FileError';
  }
}

class FileValidationError extends FileError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_VALIDATION_ERROR', 400, details);
  }
}

class FileSecurityError extends FileError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_SECURITY_ERROR', 403, details);
  }
}

class FileStorageError extends FileError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_STORAGE_ERROR', 500, details);
  }
}

class FileProcessingError extends FileError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_PROCESSING_ERROR', 500, details);
  }
}

// Global error handler for file operations
export class FileErrorHandler {
  static handleFileError(error: Error, context: string): never {
    logger.error({
      message: `File operation error in ${context}`,
      context: 'FileErrorHandler',
      error: error.message,
      stack: error.stack,
      ...(error instanceof FileError && { errorCode: error.code, details: error.details })
    });

    if (error instanceof FileError) {
      throw error;
    }

    // Wrap unknown errors
    throw new FileError(
      'An unexpected error occurred during file operation',
      'UNKNOWN_FILE_ERROR',
      500,
      { originalError: error.message }
    );
  }

  static async handleAsyncFileOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleFileError(error as Error, context);
    }
  }
}
```

### 8.2 Monitoring and Metrics

```typescript
// File operation metrics collection
class FileMetrics {
  private metrics: Map<string, number> = new Map();

  recordUpload(fileSize: number, processingTime: number): void {
    this.incrementCounter('file_uploads_total');
    this.recordHistogram('file_upload_size_bytes', fileSize);
    this.recordHistogram('file_upload_duration_seconds', processingTime / 1000);
  }

  recordDownload(fileSize: number, processingTime: number): void {
    this.incrementCounter('file_downloads_total');
    this.recordHistogram('file_download_size_bytes', fileSize);
    this.recordHistogram('file_download_duration_seconds', processingTime / 1000);
  }

  recordProcessing(jobType: string, duration: number, success: boolean): void {
    this.incrementCounter(`file_processing_${jobType}_total`);
    this.recordHistogram(`file_processing_${jobType}_duration_seconds`, duration / 1000);

    if (!success) {
      this.incrementCounter(`file_processing_${jobType}_errors_total`);
    }
  }

  recordStorageUsage(totalFiles: number, totalSize: number): void {
    this.setGauge('file_storage_total_files', totalFiles);
    this.setGauge('file_storage_total_bytes', totalSize);
  }

  recordSecurityScan(result: 'clean' | 'infected' | 'error'): void {
    this.incrementCounter(`file_security_scan_${result}_total`);
  }

  private incrementCounter(name: string): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + 1);
  }

  private recordHistogram(name: string, value: number): void {
    // In a real implementation, this would record to a histogram
    // For now, we'll just track the average
    const key = `${name}_sum`;
    const countKey = `${name}_count`;

    const currentSum = this.metrics.get(key) || 0;
    const currentCount = this.metrics.get(countKey) || 0;

    this.metrics.set(key, currentSum + value);
    this.metrics.set(countKey, currentCount + 1);
  }

  private setGauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// Health check for file system
class FileHealthCheck {
  constructor(
    private storageService: HetznerStorageService,
    private db: PrismaClient
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkStorageConnection(),
      this.checkDatabaseConnection(),
      this.checkProcessingQueue(),
      this.checkStorageSpace()
    ]);

    const results = {
      storage: this.mapSettledResult(checks[0]),
      database: this.mapSettledResult(checks[1]),
      processing: this.mapSettledResult(checks[2]),
      storage_space: this.mapSettledResult(checks[3])
    };

    const overallHealthy = Object.values(results).every(result => result.healthy);

    return {
      healthy: overallHealthy,
      checks: results,
      timestamp: new Date()
    };
  }

  private async checkStorageConnection(): Promise<CheckResult> {
    try {
      // Try to list a small number of objects from storage
      await this.storageService.listObjects(process.env.HETZNER_BUCKET!, { maxKeys: 1 });
      return { healthy: true, message: 'Storage connection successful' };
    } catch (error) {
      return { healthy: false, message: `Storage connection failed: ${error.message}` };
    }
  }

  private async checkDatabaseConnection(): Promise<CheckResult> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { healthy: true, message: 'Database connection successful' };
    } catch (error) {
      return { healthy: false, message: `Database connection failed: ${error.message}` };
    }
  }

  private async checkProcessingQueue(): Promise<CheckResult> {
    try {
      // Check if processing queue is responsive
      const pendingJobs = await this.db.fileProcessingJob.count({
        where: { status: 'PENDING' }
      });

      return {
        healthy: true,
        message: `Processing queue operational, ${pendingJobs} pending jobs`
      };
    } catch (error) {
      return { healthy: false, message: `Processing queue check failed: ${error.message}` };
    }
  }

  private async checkStorageSpace(): Promise<CheckResult> {
    try {
      const stats = await this.getStorageStats();
      const usagePercent = (stats.usedBytes / stats.totalBytes) * 100;

      if (usagePercent > 90) {
        return {
          healthy: false,
          message: `Storage usage critical: ${usagePercent.toFixed(1)}%`
        };
      } else if (usagePercent > 80) {
        return {
          healthy: true,
          message: `Storage usage high: ${usagePercent.toFixed(1)}%`,
          warning: true
        };
      }

      return {
        healthy: true,
        message: `Storage usage normal: ${usagePercent.toFixed(1)}%`
      };
    } catch (error) {
      return { healthy: false, message: `Storage space check failed: ${error.message}` };
    }
  }

  private mapSettledResult(result: PromiseSettledResult<CheckResult>): CheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        healthy: false,
        message: `Check failed: ${result.reason?.message || 'Unknown error'}`
      };
    }
  }

  private async getStorageStats(): Promise<{ usedBytes: number; totalBytes: number }> {
    // Implementation would get actual storage stats from Hetzner API
    return { usedBytes: 0, totalBytes: 0 };
  }
}

interface HealthCheckResult {
  healthy: boolean;
  checks: Record<string, CheckResult>;
  timestamp: Date;
}

interface CheckResult {
  healthy: boolean;
  message: string;
  warning?: boolean;
}
```

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// File service unit tests
describe('FileService', () => {
  let fileService: FileService;
  let mockStorage: jest.Mocked<HetznerStorageService>;
  let mockImageProcessor: jest.Mocked<ImageProcessor>;
  let mockVirusScanner: jest.Mocked<VirusScanner>;
  let mockDb: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockStorage = createMockStorageService();
    mockImageProcessor = createMockImageProcessor();
    mockVirusScanner = createMockVirusScanner();
    mockDb = createMockPrismaClient();

    fileService = new FileService(
      mockStorage,
      mockImageProcessor,
      mockDocumentProcessor,
      mockVirusScanner,
      mockDb
    );
  });

  describe('uploadFile', () => {
    it('should successfully upload a valid image file', async () => {
      // Arrange
      const fileBuffer = Buffer.from('fake image data');
      const originalName = 'test.jpg';
      const mimeType = 'image/jpeg';
      const userId = 'user-123';

      mockDb.file.create.mockResolvedValue({
        id: 'file-123',
        originalName,
        mimeType,
        sizeBytes: BigInt(fileBuffer.length),
        checksum: 'abc123',
        createdBy: userId
      } as any);

      mockStorage.uploadFile.mockResolvedValue({
        etag: 'etag-123',
        location: 'https://bucket.endpoint/path/file.jpg'
      });

      // Act
      const result = await fileService.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        userId
      );

      // Assert
      expect(result.id).toBe('file-123');
      expect(result.originalName).toBe(originalName);
      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        fileBuffer,
        mimeType,
        expect.any(Object)
      );
    });

    it('should reject files with invalid MIME type', async () => {
      // Arrange
      const fileBuffer = Buffer.from('fake data');
      const originalName = 'test.exe';
      const mimeType = 'application/octet-stream';
      const userId = 'user-123';

      // Act & Assert
      await expect(
        fileService.uploadFile(fileBuffer, originalName, mimeType, userId)
      ).rejects.toThrow(FileValidationError);
    });

    it('should quarantine files that fail virus scanning', async () => {
      // Arrange
      const fileBuffer = Buffer.from('infected file data');
      const originalName = 'test.pdf';
      const mimeType = 'application/pdf';
      const userId = 'user-123';

      mockVirusScanner.scanBuffer.mockResolvedValue({
        isClean: false,
        threats: ['Trojan.Generic'],
        scanTime: new Date(),
        engineVersion: '1.0.0'
      });

      // Act
      const result = await fileService.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        userId
      );

      // Assert
      // File should be uploaded but marked as infected
      expect(result.id).toBeDefined();
      // Additional assertions for quarantine behavior
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate download URL for authorized user', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'user-123';

      mockDb.file.findUnique.mockResolvedValue({
        id: fileId,
        storagePath: 'files/2023-10-22/file-123.jpg',
        createdBy: userId,
        accessLevel: 'PRIVATE'
      } as any);

      mockStorage.getPresignedDownloadUrl.mockResolvedValue(
        'https://signed-url-for-download'
      );

      // Act
      const result = await fileService.getDownloadUrl(fileId, userId);

      // Assert
      expect(result).toBe('https://signed-url-for-download');
      expect(mockStorage.getPresignedDownloadUrl).toHaveBeenCalled();
    });

    it('should throw error for unauthorized user', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'unauthorized-user';

      mockDb.file.findUnique.mockResolvedValue({
        id: fileId,
        storagePath: 'files/2023-10-22/file-123.jpg',
        createdBy: 'different-user',
        accessLevel: 'PRIVATE'
      } as any);

      // Act & Assert
      await expect(
        fileService.getDownloadUrl(fileId, userId)
      ).rejects.toThrow('Access denied');
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// File upload integration tests
describe('File Upload Integration', () => {
  let app: Express;
  let testDb: PrismaClient;

  beforeAll(async () => {
    // Setup test database and application
    testDb = new PrismaClient({
      datasources: {
        db: { url: process.env.TEST_DATABASE_URL }
      }
    });

    app = createTestApp();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should handle complete file upload workflow', async () => {
    // Arrange
    const testUser = await createTestUser();
    const authToken = generateTestToken(testUser);

    const testFile = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: createTestImageBuffer()
    };

    // Act
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', testFile.buffer, testFile.originalname)
      .field('entity_type', 'maintenance_request')
      .field('entity_id', 'request-123')
      .expect(201);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.files).toHaveLength(1);

    const uploadedFile = response.body.files[0];
    expect(uploadedFile.original_name).toBe(testFile.originalname);
    expect(uploadedFile.processing_status).toBe('pending');

    // Verify file was created in database
    const dbFile = await testDb.file.findUnique({
      where: { id: uploadedFile.id }
    });
    expect(dbFile).toBeTruthy();
    expect(dbFile.originalName).toBe(testFile.originalname);

    // Verify attachment was created
    const attachment = await testDb.fileAttachment.findFirst({
      where: {
        fileId: uploadedFile.id,
        entityType: 'MAINTENANCE_REQUEST',
        entityId: 'request-123'
      }
    });
    expect(attachment).toBeTruthy();

    // Wait for processing to complete
    await waitForFileProcessing(uploadedFile.id);

    // Verify processing results
    const processedFile = await testDb.file.findUnique({
      where: { id: uploadedFile.id }
    });
    expect(processedFile.processingStatus).toBe('completed');
    expect(processedFile.scanStatus).toBe('clean');
    expect(processedFile.thumbnailGenerated).toBe(true);
  });

  it('should handle file upload with validation errors', async () => {
    // Arrange
    const testUser = await createTestUser();
    const authToken = generateTestToken(testUser);

    const oversizedFile = Buffer.alloc(11 * 1024 * 1024); // 11MB file

    // Act
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', oversizedFile, 'oversized.jpg')
      .expect(400);

    // Assert
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toContain(
      expect.stringContaining('File size exceeds limit')
    );
  });

  it('should handle concurrent file uploads', async () => {
    // Arrange
    const testUser = await createTestUser();
    const authToken = generateTestToken(testUser);

    const uploadPromises = Array.from({ length: 5 }, (_, index) => {
      const testFile = {
        buffer: createTestImageBuffer(),
        originalname: `test-${index}.jpg`
      };

      return request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile.buffer, testFile.originalname);
    });

    // Act
    const responses = await Promise.all(uploadPromises);

    // Assert
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(1);
    });

    // Verify all files were created
    const fileCount = await testDb.file.count({
      where: { createdBy: testUser.id }
    });
    expect(fileCount).toBe(5);
  });
});

function createTestImageBuffer(): Buffer {
  // Create a minimal valid JPEG buffer
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
    0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    // ... minimal JPEG data
    0xFF, 0xD9 // JPEG trailer
  ]);
}

async function waitForFileProcessing(fileId: string, timeout = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const file = await testDb.file.findUnique({
      where: { id: fileId }
    });

    if (file.processingStatus === 'completed') {
      return;
    }

    if (file.processingStatus === 'failed') {
      throw new Error(`File processing failed: ${file.processingError}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('File processing timeout');
}
```

## 10. Deployment and Configuration

### 10.1 Environment Configuration

```typescript
// Enhanced environment configuration for file management
const fileManagementEnvSchema = z.object({
  // Storage Configuration
  HETZNER_ENDPOINT: z.string().url(),
  HETZNER_REGION: z.string(),
  HETZNER_ACCESS_KEY_ID: z.string(),
  HETZNER_SECRET_ACCESS_KEY: z.string(),
  HETZNER_BUCKET: z.string(),

  // File Limits
  MAX_FILE_SIZE: z.string().transform(Number).default("10485760"), // 10MB
  MAX_FILES_PER_REQUEST: z.string().transform(Number).default("5"),
  ALLOWED_MIME_TYPES: z.string().transform(str => str.split(',')).default(
    "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
  ),

  // Processing Configuration
  ENABLE_VIRUS_SCANNING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_IMAGE_PROCESSING: z.string().transform(val => val === 'true').default('true'),
  THUMBNAIL_SIZES: z.string().transform(str => str.split(',')).default("150,300,800"),

  // Security Configuration
  PRESIGNED_URL_EXPIRY: z.string().transform(Number).default("3600"), // 1 hour
  ENABLE_FILE_ENCRYPTION: z.string().transform(val => val === 'true').default('false'),

  // Performance Configuration
  UPLOAD_CHUNK_SIZE: z.string().transform(Number).default("5242880"), // 5MB
  MAX_CONCURRENT_UPLOADS: z.string().transform(Number).default("3"),

  // Monitoring Configuration
  ENABLE_FILE_METRICS: z.string().transform(val => val === 'true').default('true'),
  STORAGE_USAGE_ALERT_THRESHOLD: z.string().transform(Number).default("80"), // 80%
});

export const fileManagementConfig = fileManagementEnvSchema.parse(process.env);
```

### 10.2 Database Migration

```sql
-- Migration file for file management system
-- File: migrations/001_add_file_management.sql

-- Create files table
CREATE TABLE files (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,

  -- Metadata
  title VARCHAR(255),
  description TEXT,
  tags JSON,

  -- Processing status
  processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  processing_error TEXT,

  -- Security and access
  is_public BOOLEAN DEFAULT FALSE,
  access_level ENUM('private', 'role_based', 'public') DEFAULT 'private',
  allowed_roles JSON,

  -- Storage information
  storage_provider VARCHAR(50) DEFAULT 'hetzner',
  storage_path VARCHAR(500) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'basma-files',

  -- Thumbnail information
  thumbnail_path VARCHAR(500),
  thumbnail_generated BOOLEAN DEFAULT FALSE,

  -- Security scanning
  scan_status ENUM('pending', 'scanning', 'clean', 'infected', 'error') DEFAULT 'pending',
  scan_result JSON,
  scanned_at TIMESTAMP NULL,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(36) NULL,

  -- Audit fields
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_files_created_by (created_by),
  INDEX idx_files_processing_status (processing_status),
  INDEX idx_files_scan_status (scan_status),
  INDEX idx_files_mime_type (mime_type),
  INDEX idx_files_created_at (created_at),
  INDEX idx_files_is_deleted (is_deleted),

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- Create file_attachments table
CREATE TABLE file_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,

  -- Polymorphic relationship
  entity_type ENUM('maintenance_request', 'user_profile', 'building', 'comment', 'other') NOT NULL,
  entity_id VARCHAR(36) NOT NULL,

  -- Attachment metadata
  attachment_type ENUM('primary', 'secondary', 'reference', 'evidence') DEFAULT 'primary',
  display_order INT DEFAULT 0,

  -- Audit fields
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_file_entity (file_id, entity_type, entity_id),
  INDEX idx_attachments_entity (entity_type, entity_id),
  INDEX idx_attachments_file (file_id),

  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create file_access_logs table
CREATE TABLE file_access_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,

  -- Access details
  action ENUM('view', 'download', 'upload', 'delete', 'update') NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_access_logs_file (file_id),
  INDEX idx_access_logs_user (user_id),
  INDEX idx_access_logs_action (action),
  INDEX idx_access_logs_created_at (created_at),

  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create file_processing_jobs table
CREATE TABLE file_processing_jobs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  file_id VARCHAR(36) NOT NULL,

  -- Job details
  job_type ENUM('thumbnail_generation', 'virus_scan', 'optimization', 'metadata_extraction') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',

  -- Job data
  job_data JSON,
  result_data JSON,
  error_message TEXT,

  -- Retry mechanism
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Timing
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,

  INDEX idx_processing_jobs_file (file_id),
  INDEX idx_processing_jobs_status (status),
  INDEX idx_processing_jobs_type (job_type),
  INDEX idx_processing_jobs_scheduled (scheduled_at),

  FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Insert initial configuration
INSERT INTO system_config (key, value, description, created_by) VALUES
('file_max_size', '10485760', 'Maximum file size in bytes (10MB)', 'system'),
('file_max_files_per_request', '5', 'Maximum number of files per request', 'system'),
('file_allowed_mime_types', 'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain', 'Allowed MIME types for uploads', 'system'),
('file_presigned_url_expiry', '3600', 'Presigned URL expiry time in seconds', 'system'),
('file_enable_virus_scanning', 'true', 'Enable virus scanning for uploaded files', 'system'),
('file_enable_image_processing', 'true', 'Enable image processing and thumbnail generation', 'system');
```

This comprehensive technical specification provides the detailed implementation guidance needed to build the Extensible File Management System for BASMA. It covers all aspects from database design to API implementation, security measures, performance optimization, and deployment strategies.

The specification is designed to be implemented in phases, starting with the core functionality and gradually adding advanced features. It maintains consistency with the existing BASMA architecture while providing a scalable foundation for future file-based features.