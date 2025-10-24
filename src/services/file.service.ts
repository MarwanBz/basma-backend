import { Request } from 'express';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/appError';
import { logger } from '@/config/logger';
import { FileValidationService } from '@/services/validation/fileValidation.service';
import { HetznerStorageService } from '@/services/storage/hetznerStorage.service';
import {
  FileUploadRequest,
  FileMetadata,
  FileValidationResult,
  FileSecurityContext,
  FileSearchOptions,
  FileAttachmentMetadata,
  FileApiResponse,
  FileConfiguration,
  file_entity_type,
  file_processing_status
} from '@/types/file.types';

export class FileService {
  private validationService: FileValidationService;
  private storageService: HetznerStorageService;
  private config: FileConfiguration;

  constructor(config: FileConfiguration) {
    this.config = config;
    this.validationService = new FileValidationService();
    this.storageService = new HetznerStorageService(config.storage);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    request: FileUploadRequest,
    context: FileSecurityContext
  ): Promise<{ uploaded: FileAttachmentMetadata[]; errors: string[] }> {
    const uploaded: FileAttachmentMetadata[] = [];
    const errors: string[] = [];

    // Check if user exceeded maximum files per upload
    if (files.length > this.config.security.maxFilesPerUpload) {
      throw new AppError(
        `Too many files in upload. Maximum allowed: ${this.config.security.maxFilesPerUpload}`,
        400
      );
    }

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadSingleFile(file, request, context);
        uploaded.push(uploadedFile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${file.originalname}: ${errorMessage}`);
        logger.error('File upload failed', {
          filename: file.originalname,
          error: errorMessage,
          userId: context.userId
        });
      }
    }

    return { uploaded, errors };
  }

  private async uploadSingleFile(
    file: Express.Multer.File,
    request: FileUploadRequest,
    context: FileSecurityContext
  ): Promise<FileAttachmentMetadata> {
    const startTime = Date.now();

    // Step 1: Validate file
    const validationResult = await this.validationService.validateFile(file, context);

    if (!validationResult.valid) {
      throw new AppError(
        `File validation failed: ${validationResult.errors.join(', ')}`,
        400
      );
    }

    // Step 2: Generate file metadata
    const metadata: FileMetadata = {
      ...validationResult.metadata,
      entityType: request.entityType,
      entityId: request.entityId,
      uploadedById: context.userId,
      uploadIp: context.riskLevel === 'high' ? context.ip : undefined,
      isPublic: request.isPublic || false,
      expiresAt: request.expiresAt
    };

    // Step 3: Generate storage key
    const fileKey = this.storageService.generateFileKey(
      request.entityType,
      request.entityId,
      metadata.fileName!
    );

    // Step 4: Upload to storage
    const storageResult = await this.storageService.uploadFile(
      file.buffer,
      fileKey,
      metadata.mimeType!,
      {
        uploadedBy: context.userId,
        entityType: request.entityType,
        entityId: request.entityId,
        originalName: metadata.originalName!,
        securityFlags: context.securityFlags.join(',')
      }
    );

    // Step 5: Save to database
    const fileAttachment = await prisma.file_attachment.create({
      data: {
        originalName: metadata.originalName!,
        fileName: metadata.fileName!,
        filePath: storageResult.key,
        fileSize: metadata.fileSize!,
        mimeType: metadata.mimeType!,
        fileExtension: metadata.fileExtension!,
        checksum: metadata.checksum!,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        entityType: metadata.entityType,
        entityId: metadata.entityId,
        uploadedById: metadata.uploadedById,
        uploadIp: metadata.uploadIp,
        isPublic: metadata.isPublic!,
        expiresAt: metadata.expiresAt,
        processingStatus: file_processing_status.PENDING,
        isScanned: false,
        isValidated: true
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Step 6: Queue background processing
    await this.queueFileProcessing(fileAttachment.id);

    // Step 7: File metadata cached (cache disabled)

    const duration = Date.now() - startTime;
    logger.info('File uploaded successfully', {
      fileId: fileAttachment.id,
      filename: file.originalname,
      size: file.size,
      userId: context.userId,
      duration
    });

    return this.transformFileAttachment(fileAttachment);
  }

  async getFile(
    fileId: string,
    context: FileSecurityContext
  ): Promise<FileAttachmentMetadata> {
    // Fetch from database (cache disabled)
    const fileAttachment = await prisma.file_attachment.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!fileAttachment) {
      throw new AppError('File not found', 404);
    }

    // Check access permissions
    await this.verifyFileAccess(fileAttachment, context);

    // Update access tracking
    await this.updateFileAccess(fileAttachment.id, context.userId);

    // Cache the result (cache disabled)

    return this.transformFileAttachment(fileAttachment);
  }

  async downloadFile(
    fileId: string,
    context: FileSecurityContext,
    options?: { range?: { start: number; end: number } }
  ): Promise<{ buffer: Buffer; metadata: FileAttachmentMetadata }> {
    const fileAttachment = await this.getFile(fileId, context);

    // Check if file has expired
    if (fileAttachment.expiresAt && fileAttachment.expiresAt < new Date()) {
      throw new AppError('File has expired', 410);
    }

    // Download from storage
    const buffer = await this.storageService.downloadFile(fileAttachment.filePath!);

    return {
      buffer,
      metadata: fileAttachment
    };
  }

  async getDownloadUrl(
    fileId: string,
    context: FileSecurityContext,
    expiresIn: number = 3600
  ): Promise<string> {
    const fileAttachment = await this.getFile(fileId, context);

    // Check if file has expired
    if (fileAttachment.expiresAt && fileAttachment.expiresAt < new Date()) {
      throw new AppError('File has expired', 410);
    }

    // Generate signed URL
    const signedUrl = this.storageService.getSignedUrl(
      fileAttachment.filePath!,
      expiresIn,
      {
        contentType: fileAttachment.mimeType,
        disposition: 'attachment'
      }
    );

    return signedUrl;
  }

  async getThumbnailUrl(
    fileId: string,
    context: FileSecurityContext,
    expiresIn: number = 3600
  ): Promise<string> {
    const fileAttachment = await this.getFile(fileId, context);

    // Check if thumbnail exists
    if (!fileAttachment.thumbnailPath) {
      throw new AppError('Thumbnail not available for this file', 404);
    }

    // Generate signed URL for thumbnail
    const signedUrl = this.storageService.getSignedUrl(
      fileAttachment.thumbnailPath,
      expiresIn,
      {
        disposition: 'inline'
      }
    );

    return signedUrl;
  }

  async deleteFile(
    fileId: string,
    context: FileSecurityContext
  ): Promise<void> {
    const fileAttachment = await this.getFile(fileId, context);

    // Check delete permissions
    if (!this.canDeleteFile(fileAttachment, context)) {
      throw new AppError('You do not have permission to delete this file', 403);
    }

    // Delete from storage
    await this.storageService.deleteFile(fileAttachment.filePath!);

    // Delete thumbnail if exists
    if (fileAttachment.thumbnailPath) {
      try {
        await this.storageService.deleteFile(fileAttachment.thumbnailPath);
      } catch (error) {
        logger.warn('Failed to delete thumbnail', {
          fileId,
          thumbnailPath: fileAttachment.thumbnailPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Delete from database
    await prisma.file_attachment.delete({
      where: { id: fileId }
    });

    // Remove from cache (cache disabled)

    logger.info('File deleted successfully', {
      fileId,
      filename: fileAttachment.originalName,
      userId: context.userId
    });
  }

  async getFilesByEntity(
    entityType: file_entity_type,
    entityId: string,
    context: FileSecurityContext,
    options: FileSearchOptions = {}
  ): Promise<{ files: FileAttachmentMetadata[]; total: number }> {
    // Verify access to the entity
    await this.verifyEntityAccess(entityType, entityId, context);

    const where: any = {
      entityType,
      entityId,
      ...(options.processingStatus && { processingStatus: options.processingStatus }),
      ...(options.isPublic !== undefined && { isPublic: options.isPublic }),
      ...(options.isScanned !== undefined && { isScanned: options.isScanned }),
      ...(options.dateFrom && { createdAt: { gte: options.dateFrom } }),
      ...(options.dateTo && { createdAt: { lte: options.dateTo } }),
      ...(options.search && {
        OR: [
          { originalName: { contains: options.search, mode: 'insensitive' } },
          { fileName: { contains: options.search, mode: 'insensitive' } }
        ]
      })
    };

    // Get total count
    const total = await prisma.file_attachment.count({ where });

    // Get files with pagination
    const skip = ((options.page || 1) - 1) * (options.limit || 10);
    const take = options.limit || 10;

    const files = await prisma.file_attachment.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        [options.sortBy || 'createdAt']: options.sortOrder || 'desc'
      },
      skip,
      take
    });

    // Filter based on access permissions
    const accessibleFiles = [];
    for (const file of files) {
      if (await this.canAccessFile(file, context)) {
        accessibleFiles.push(this.transformFileAttachment(file));
      }
    }

    return {
      files: accessibleFiles,
      total: accessibleFiles.length
    };
  }

  async getUserFiles(
    userId: string,
    context: FileSecurityContext,
    options: FileSearchOptions = {}
  ): Promise<{ files: FileAttachmentMetadata[]; total: number }> {
    // Users can only see their own files unless they're admin
    if (userId !== context.userId && !this.isAdmin(context.userRole)) {
      throw new AppError('You can only view your own files', 403);
    }

    const where: any = {
      uploadedById: userId,
      ...(options.entityType && { entityType: options.entityType }),
      ...(options.mimeType && { mimeType: { contains: options.mimeType } }),
      ...(options.processingStatus && { processingStatus: options.processingStatus }),
      ...(options.dateFrom && { createdAt: { gte: options.dateFrom } }),
      ...(options.dateTo && { createdAt: { lte: options.dateTo } }),
      ...(options.search && {
        OR: [
          { originalName: { contains: options.search, mode: 'insensitive' } },
          { fileName: { contains: options.search, mode: 'insensitive' } }
        ]
      })
    };

    const total = await prisma.file_attachment.count({ where });

    const skip = ((options.page || 1) - 1) * (options.limit || 10);
    const take = options.limit || 10;

    const files = await prisma.file_attachment.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        [options.sortBy || 'createdAt']: options.sortOrder || 'desc'
      },
      skip,
      take
    });

    return {
      files: files.map(file => this.transformFileAttachment(file)),
      total
    };
  }

  async updateFileMetadata(
    fileId: string,
    updates: Partial<{
      isPublic: boolean;
      expiresAt: Date | null;
    }>,
    context: FileSecurityContext
  ): Promise<FileAttachmentMetadata> {
    const fileAttachment = await this.getFile(fileId, context);

    // Check update permissions
    if (!this.canUpdateFile(fileAttachment, context)) {
      throw new AppError('You do not have permission to update this file', 403);
    }

    const updated = await prisma.file_attachment.update({
      where: { id: fileId },
      data: updates,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Update cache (cache disabled)

    return this.transformFileAttachment(updated);
  }

  // Private helper methods

  private async queueFileProcessing(fileId: string): Promise<void> {
    // This would integrate with your background job queue (Redis, Bull, etc.)
    // For now, we'll just log it
    logger.info('File processing queued', { fileId });

    // In a real implementation, you would add jobs to your queue:
    // await queue.add('generate-thumbnail', { fileId });
    // await queue.add('virus-scan', { fileId });
    // await queue.add('extract-metadata', { fileId });
  }

  // Cache methods disabled - no cache implementation available
  // private async cacheFileMetadata(fileAttachment: any): Promise<void> { ... }
  // private async getCachedFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null> { ... }
  // private async removeCachedFileMetadata(fileId: string): Promise<void> { ... }

  private async updateFileAccess(fileId: string, userId: string): Promise<void> {
    await prisma.file_attachment.update({
      where: { id: fileId },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });
  }

  private async verifyFileAccess(
    fileAttachment: any,
    context: FileSecurityContext
  ): Promise<void> {
    if (!(await this.canAccessFile(fileAttachment, context))) {
      throw new AppError('You do not have permission to access this file', 403);
    }
  }

  private async canAccessFile(
    fileAttachment: any,
    context: FileSecurityContext
  ): Promise<boolean> {
    // Owner can always access their files
    if (fileAttachment.uploadedById === context.userId) {
      return true;
    }

    // Admins can access all files
    if (this.isAdmin(context.userRole)) {
      return true;
    }

    // Public files can be accessed by anyone
    if (fileAttachment.isPublic) {
      return true;
    }

    // Check entity-specific access
    return await this.verifyEntityAccess(
      fileAttachment.entityType,
      fileAttachment.entityId,
      context
    );
  }

  private canDeleteFile(
    fileAttachment: FileAttachmentMetadata,
    context: FileSecurityContext
  ): boolean {
    // Owner can delete their files
    if (fileAttachment.uploadedById === context.userId) {
      return true;
    }

    // Admins can delete any file
    return this.isAdmin(context.userRole);
  }

  private canUpdateFile(
    fileAttachment: FileAttachmentMetadata,
    context: FileSecurityContext
  ): boolean {
    // Owner can update their files
    if (fileAttachment.uploadedById === context.userId) {
      return true;
    }

    // Admins can update any file
    return this.isAdmin(context.userRole);
  }

  private async verifyEntityAccess(
    entityType: file_entity_type,
    entityId: string,
    context: FileSecurityContext
  ): Promise<boolean> {
    switch (entityType) {
      case 'MAINTENANCE_REQUEST':
        return await this.verifyMaintenanceRequestAccess(entityId, context);

      case 'USER_PROFILE':
        return entityId === context.userId || this.isAdmin(context.userRole);

      case 'BUILDING_CONFIG':
        return this.isAdminOrMaintenanceAdmin(context.userRole);

      default:
        // Default to admin-only for unknown entity types
        return this.isAdmin(context.userRole);
    }
  }

  private async verifyMaintenanceRequestAccess(
    requestId: string,
    context: FileSecurityContext
  ): Promise<boolean> {
    try {
      const request = await prisma.maintenance_request.findUnique({
        where: { id: requestId },
        select: {
          requestedById: true,
          assignedToId: true,
          assignedById: true
        }
      });

      if (!request) {
        return false;
      }

      // Request creator, assigned technician, or admin can access
      return (
        request.requestedById === context.userId ||
        request.assignedToId === context.userId ||
        request.assignedById === context.userId ||
        this.isAdminOrMaintenanceAdmin(context.userRole)
      );
    } catch (error) {
      logger.error('Failed to verify maintenance request access', {
        requestId,
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private isAdmin(userRole: string): boolean {
    return ['SUPER_ADMIN', 'BASMA_ADMIN', 'ADMIN'].includes(userRole);
  }

  private isAdminOrMaintenanceAdmin(userRole: string): boolean {
    return ['SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN', 'ADMIN'].includes(userRole);
  }

  private transformFileAttachment(file: any): FileAttachmentMetadata {
    return {
      ...file,
      url: this.storageService.getSignedUrl(file.filePath, 3600),
      thumbnailUrl: file.thumbnailPath
        ? this.storageService.getSignedUrl(file.thumbnailPath, 3600)
        : undefined
    };
  }
}