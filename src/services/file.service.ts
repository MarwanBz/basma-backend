import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError } from '@/utils/appError';
import { StorageService } from '@/services/storage/storage.service';
import { FileValidationService } from '@/services/validation/fileValidation.service';
import {
  generateFileKey,
  calculateChecksum,
  extractFileExtension,
} from '@/utils/file.utils';
import {
  file_entity_type,
  file_processing_status,
  file_attachment,
} from '@prisma/client';
import {
  FileListFilters,
  FileSearchQuery,
  FileAttachmentMetadata,
} from '@/types/file.types';

/**
 * File Service with database integration
 * Coordinates storage operations with database persistence
 */
export class FileService {
  private storageService: StorageService;
  private validationService: FileValidationService;

  constructor() {
    this.storageService = new StorageService();
    this.validationService = new FileValidationService();
  }

  /**
   * Convert Prisma file attachment to FileAttachmentMetadata
   * Converts null values to undefined for optional fields
   */
  private convertToFileMetadata(file: any): FileAttachmentMetadata {
    return {
      ...file,
      width: file.width ?? undefined,
      height: file.height ?? undefined,
      duration: file.duration ?? undefined,
    };
  }

  /**
   * Upload a single file with entity relationship
   */
  async uploadFile(
    file: Express.Multer.File,
    entityType: file_entity_type,
    entityId: string,
    userId: string,
    options?: {
      isPublic?: boolean;
      expiresAt?: Date;
      uploadIp?: string;
    }
  ): Promise<FileAttachmentMetadata> {
    const startTime = Date.now();

    try {
      // Step 1: Validate file
      const validationResult = await this.validationService.validateFile(file);

      if (!validationResult.valid) {
        throw new AppError(
          `File validation failed: ${validationResult.errors.join(', ')}`,
          400
        );
      }

      // Step 2: Generate file key and checksum
      const fileKey = generateFileKey(entityType, entityId, file.originalname);
      const checksum = calculateChecksum(file.buffer);
      const fileExtension = extractFileExtension(file.originalname);

      // Step 3: Upload to S3
      const uploadResult = await this.storageService.uploadFile(
        file.buffer,
        fileKey,
        file.mimetype,
        {
          uploadedBy: userId,
          originalName: file.originalname,
          checksum,
        }
      );

      // Step 4: Save metadata to database
      const fileAttachment = await prisma.file_attachment.create({
        data: {
          originalName: file.originalname,
          fileName: fileKey,
          filePath: uploadResult.key,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileExtension,
          checksum,
          processingStatus: 'COMPLETED',
          isPublic: options?.isPublic || false,
          isScanned: false,
          isValidated: true,
          entityType,
          entityId,
          uploadedById: userId,
          uploadIp: options?.uploadIp,
          expiresAt: options?.expiresAt,
          downloadCount: 0,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info('File uploaded successfully', {
        fileId: fileAttachment.id,
        key: fileKey,
        userId,
        entityType,
        entityId,
        size: file.size,
        duration: Date.now() - startTime,
      });

      // Step 5: Generate signed URL for immediate access
      const signedUrl = await this.storageService.getSignedUrl(fileKey, 3600);

      return this.convertToFileMetadata({
        ...fileAttachment,
        url: uploadResult.url,
        downloadUrl: signedUrl,
      });
    } catch (error) {
      logger.error('File upload failed', {
        fileName: file.originalname,
        userId,
        entityType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to upload file', 500);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    entityType: file_entity_type,
    entityId: string,
    userId: string,
    options?: {
      isPublic?: boolean;
      expiresAt?: Date;
      uploadIp?: string;
    }
  ): Promise<{
    uploaded: FileAttachmentMetadata[];
    errors: Array<{ filename: string; error: string }>;
  }> {
    const uploaded: FileAttachmentMetadata[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(
          file,
          entityType,
          entityId,
          userId,
          options
        );
        uploaded.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    logger.info('Multiple file upload completed', {
      total: files.length,
      uploaded: uploaded.length,
      errors: errors.length,
      userId,
      entityType,
      entityId,
    });

    return { uploaded, errors };
  }

  /**
   * Get download URL for a file
   */
  async downloadFile(
    fileId: string,
    userId: string,
    expiresIn: number = 3600
  ): Promise<{ signedUrl: string; file: FileAttachmentMetadata }> {
    try {
      // Get file from database
      const file = await prisma.file_attachment.findUnique({
        where: { id: fileId },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Check access (user can access their own files or public files)
      const canAccess = await this.checkFileAccess(fileId, userId);
      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      // Check expiration
      if (file.expiresAt && file.expiresAt < new Date()) {
        throw new AppError('File has expired', 410);
      }

      // Generate signed URL
      const signedUrl = await this.storageService.getSignedUrl(
        file.filePath,
        expiresIn
      );

      // Update download count and last accessed time
      await prisma.file_attachment.update({
        where: { id: fileId },
        data: {
          downloadCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      logger.info('File download URL generated', {
        fileId,
        userId,
        downloadCount: file.downloadCount + 1,
      });

      return { signedUrl, file: this.convertToFileMetadata(file) };
    } catch (error) {
      logger.error('Failed to generate download URL', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Delete a file (soft delete via expiration)
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      // Get file from database
      const file = await prisma.file_attachment.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Check access (only owner or admin can delete)
      const canDelete = await this.checkFileAccess(fileId, userId, true);
      if (!canDelete) {
        throw new AppError('Access denied', 403);
      }

      // Soft delete by setting expiration to now
      await prisma.file_attachment.update({
        where: { id: fileId },
        data: {
          expiresAt: new Date(),
        },
      });

      // Optionally: Delete from S3 immediately
      // await this.storageService.deleteFile(file.filePath);

      logger.info('File deleted', {
        fileId,
        userId,
        filePath: file.filePath,
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to delete file', 500);
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(
    fileId: string,
    userId: string
  ): Promise<FileAttachmentMetadata> {
    try {
      const file = await prisma.file_attachment.findUnique({
        where: { id: fileId },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Check access
      const canAccess = await this.checkFileAccess(fileId, userId);
      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      // Generate signed URL
      const signedUrl = await this.storageService.getSignedUrl(
        file.filePath,
        3600
      );

      return this.convertToFileMetadata({
        ...file,
        url: `${process.env.HETZNER_ENDPOINT_URL}/${process.env.HETZNER_BUCKET_NAME}/${file.filePath}`,
        downloadUrl: signedUrl,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to get file', 500);
    }
  }

  /**
   * Get all files (admin only - no user filter)
   */
  async getAllFiles(
    filters?: FileListFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    files: FileAttachmentMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const where: any = {
        // No uploadedById filter - get ALL files
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.entityId && { entityId: filters.entityId }),
        ...(filters?.mimeType && { mimeType: filters.mimeType }),
        ...(filters?.processingStatus && {
          processingStatus: filters.processingStatus,
        }),
        ...(filters?.isPublic !== undefined && { isPublic: filters.isPublic }),
      };

      // Handle date range filters
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      // Handle file size range filters
      if (filters?.minSize || filters?.maxSize) {
        where.fileSize = {};
        if (filters.minSize) {
          where.fileSize.gte = filters.minSize;
        }
        if (filters.maxSize) {
          where.fileSize.lte = filters.maxSize;
        }
      }

      const [files, total] = await Promise.all([
        prisma.file_attachment.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.file_attachment.count({ where }),
      ]);

      return {
        files: files.map(file => this.convertToFileMetadata(file)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get all files', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('Failed to get all files', 500);
    }
  }

  /**
   * Get user's files with pagination
   */
  async getUserFiles(
    userId: string,
    filters?: FileListFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    files: FileAttachmentMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const where: any = {
        uploadedById: userId,
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.entityId && { entityId: filters.entityId }),
        ...(filters?.mimeType && { mimeType: filters.mimeType }),
        ...(filters?.processingStatus && {
          processingStatus: filters.processingStatus,
        }),
        ...(filters?.isPublic !== undefined && { isPublic: filters.isPublic }),
      };

      // Handle date range filters
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      // Handle file size range filters
      if (filters?.minSize || filters?.maxSize) {
        where.fileSize = {};
        if (filters.minSize) {
          where.fileSize.gte = filters.minSize;
        }
        if (filters.maxSize) {
          where.fileSize.lte = filters.maxSize;
        }
      }

      const [files, total] = await Promise.all([
        prisma.file_attachment.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.file_attachment.count({ where }),
      ]);

      return {
        files: files.map(file => this.convertToFileMetadata(file)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get user files', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('Failed to get files', 500);
    }
  }

  /**
   * Get files for a specific entity
   */
  async getEntityFiles(
    entityType: file_entity_type,
    entityId: string,
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    files: FileAttachmentMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const where = {
        entityType,
        entityId,
        OR: [
          { isPublic: true },
          { uploadedById: userId },
        ],
      };

      const [files, total] = await Promise.all([
        prisma.file_attachment.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.file_attachment.count({ where }),
      ]);

      return {
        files: files.map(file => this.convertToFileMetadata(file)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get entity files', {
        entityType,
        entityId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('Failed to get entity files', 500);
    }
  }

  /**
   * Search files
   */
  async searchFiles(
    searchQuery: FileSearchQuery,
    userId: string
  ): Promise<{
    files: FileAttachmentMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = searchQuery.page || 1;
      const limit = searchQuery.limit || 10;

      const where: any = {
        OR: [
          { isPublic: true },
          { uploadedById: userId },
        ],
        ...(searchQuery.query && {
          originalName: {
            contains: searchQuery.query,
          },
        }),
        ...(searchQuery.entityType && {
          entityType: searchQuery.entityType,
        }),
        ...(searchQuery.entityId && { entityId: searchQuery.entityId }),
        ...(searchQuery.mimeType && { mimeType: searchQuery.mimeType }),
        ...(searchQuery.isPublic !== undefined && {
          isPublic: searchQuery.isPublic,
        }),
      };

      // Handle date range filters
      if (searchQuery.dateFrom || searchQuery.dateTo) {
        where.createdAt = {};
        if (searchQuery.dateFrom) {
          where.createdAt.gte = searchQuery.dateFrom;
        }
        if (searchQuery.dateTo) {
          where.createdAt.lte = searchQuery.dateTo;
        }
      }

      const orderBy: any = {};
      if (searchQuery.sortBy) {
        orderBy[searchQuery.sortBy] = searchQuery.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [files, total] = await Promise.all([
        prisma.file_attachment.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.file_attachment.count({ where }),
      ]);

      return {
        files: files.map(file => this.convertToFileMetadata(file)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to search files', {
        userId,
        query: searchQuery.query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('Failed to search files', 500);
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    userId: string,
    updates: {
      isPublic?: boolean;
      expiresAt?: Date | null;
    }
  ): Promise<FileAttachmentMetadata> {
    try {
      // Check access
      const canAccess = await this.checkFileAccess(fileId, userId, true);
      if (!canAccess) {
        throw new AppError('Access denied', 403);
      }

      const file = await prisma.file_attachment.update({
        where: { id: fileId },
        data: updates,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info('File metadata updated', {
        fileId,
        userId,
        updates,
      });

      return this.convertToFileMetadata(file);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update file metadata', 500);
    }
  }

  /**
   * Check if user has access to a file
   */
  async checkFileAccess(
    fileId: string,
    userId: string,
    requireOwnership: boolean = false
  ): Promise<boolean> {
    try {
      const file = await prisma.file_attachment.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        return false;
      }

      // Owner always has access
      if (file.uploadedById === userId) {
        return true;
      }

      // For deletion/update, only owner has access
      if (requireOwnership) {
        return false;
      }

      // Public files are accessible to everyone
      if (file.isPublic) {
        return true;
      }

      // Check if file has expired
      if (file.expiresAt && file.expiresAt < new Date()) {
        return false;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check file access', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }
}

