import { Request } from 'express';
import { file_entity_type, file_processing_status } from '@prisma/client';

// Re-export types that are commonly needed
export { file_entity_type, file_processing_status };
export type { Express } from 'express';

export interface FileUploadRequest {
  files: Express.Multer.File[];
  entityType: file_entity_type;
  entityId: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface FileMetadata {
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  checksum: string;
  width?: number;
  height?: number;
  duration?: number;
  entityType: file_entity_type;
  entityId: string;
  uploadedById: string;
  uploadIp?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: Partial<FileMetadata>;
  category: 'image' | 'video' | 'document' | 'audio' | 'archive' | 'unknown';
  securityFlags: string[];
}

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
  versionId?: string;
}

export interface StorageDownloadOptions {
  expiresIn?: number;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
  range?: { start: number; end: number };
}

export interface FileProcessingOptions {
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  optimizeImage?: boolean;
  scanForViruses?: boolean;
  extractMetadata?: boolean;
}

export interface FileSearchOptions {
  entityType?: file_entity_type;
  entityId?: string;
  uploadedById?: string;
  mimeType?: string;
  processingStatus?: file_processing_status;
  isPublic?: boolean;
  isScanned?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'fileSize' | 'originalName' | string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FileAccessContext {
  userId: string;
  userRole: string;
  ip: string;
  userAgent?: string;
  operation: 'upload' | 'download' | 'view' | 'delete';
  fileId?: string;
}

export interface FileOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    operation: string;
    duration: number;
    bytesProcessed?: number;
    securityFlags?: string[];
  };
}

export interface FileAnalytics {
  fileId: string;
  operation: string;
  userId: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  processingTime?: number;
}

export interface FileSecurityContext {
  userId: string;
  userRole: string;
  entityId: string;
  entityType: file_entity_type;
  ip: string;
  userAgent?: string;
  operation: 'upload' | 'download' | 'view' | 'delete' | 'update';
  permissions: FilePermissions;
  riskLevel: 'low' | 'medium' | 'high';
  securityFlags: string[];
  fileId?: string;
}

export interface FilePermissions {
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canViewMetadata: boolean;
  canManagePublic: boolean;
  canBypassLimits: boolean;
}

export interface FileQuota {
  maxFileSize: number;
  maxFilesPerDay: number;
  maxStoragePerUser: number;
  allowedFileTypes: string[];
  currentUsage: {
    filesToday: number;
    storageUsed: number;
    lastUploadTime?: Date;
  };
}

export interface FileProcessingJob {
  id: string;
  fileId: string;
  type: 'thumbnail' | 'virus_scan' | 'metadata_extraction' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

export interface FileConfiguration {
  storage: {
    provider: 'hetzner' | 'aws' | 'local';
    bucket: string;
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    encryptionEnabled: boolean;
    cdnEnabled: boolean;
    cdnBaseUrl?: string;
  };
  security: {
    enableVirusScanning: boolean;
    enableContentValidation: boolean;
    allowedMimeTypes: string[];
    blockedMimeTypes: string[];
    maxFileSize: number;
    maxFilesPerUpload: number;
    requireAuth: boolean;
    auditRetentionDays: number;
  };
  processing: {
    generateThumbnails: boolean;
    thumbnailSize: { width: number; height: number };
    enableImageOptimization: boolean;
    enableMetadataExtraction: boolean;
    processingTimeout: number;
  };
  features: {
    enablePublicFiles: boolean;
    enableFileExpiration: boolean;
    enableDownloadCount: boolean;
    enableBulkOperations: boolean;
    enableVersioning: boolean;
  };
}

export interface FileApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: {
    operation: string;
    duration: number;
    timestamp: Date;
    version: string;
  };
}

export interface FileAttachmentMetadata {
  id: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  checksum: string;
  width?: number;
  height?: number;
  duration?: number;
  processingStatus: file_processing_status;
  thumbnailPath?: string;
  filePath?: string;
  isPublic: boolean;
  isScanned: boolean;
  scanResult?: string;
  isValidated: boolean;
  entityType: file_entity_type;
  entityId: string;
  uploadedById: string;
  uploadIp?: string;
  expiresAt?: Date;
  downloadCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Include uploadedBy relation data when needed
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  // Include URL generation
  url?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}