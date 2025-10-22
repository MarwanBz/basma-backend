import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { FileService } from '@/services/file.service';
import { BaseController } from '@/controllers/base.controller';
import { FileSecurityContext, file_entity_type } from '@/types/file.types';
import { AppError } from '@/utils/appError';
import { logger } from '@/config/logger';
import { validateRequest } from '@/middleware/validateRequest';
import { requireAuth } from '@/middleware/authMiddleware';
import {
  uploadFileSchema,
  getFileSchema,
  deleteFileSchema,
  getEntityFilesSchema,
  updateFileMetadataSchema,
  searchFilesSchema
} from '@/validators/file.validator';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Basic file type filtering - more detailed validation happens in the service
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/zip', 'application/x-rar-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400) as any, false);
    }
  }
});

export class FileController extends BaseController {
  constructor(private fileService: FileService) {
    super();
  }

  /**
   * Upload files to a specific entity
   */
  uploadFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files provided for upload', 400);
      }

      const { entityType, entityId, isPublic, expiresAt } = req.body;

      // Validate entityType
      if (!Object.values(file_entity_type).includes(entityType)) {
        throw new AppError('Invalid entity type', 400);
      }

      // Parse expiresAt if provided
      let expiresAtDate: Date | undefined;
      if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
          throw new AppError('Invalid expiration date', 400);
        }
      }

      // Create security context
      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'upload',
        entityId,
        entityType,
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const uploadRequest = {
        files,
        entityType,
        entityId,
        isPublic: isPublic === 'true',
        expiresAt: expiresAtDate
      };

      const result = await this.fileService.uploadFiles(files, uploadRequest, context);

      return {
        success: true,
        message: `Successfully uploaded ${result.uploaded.length} files`,
        data: {
          uploaded: result.uploaded,
          errors: result.errors
        },
        metadata: {
          operation: 'upload',
          duration: 0, // Would be calculated by middleware
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Get file metadata by ID
   */
  getFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'view',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST', // Default, will be updated after file lookup
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const file = await this.fileService.getFile(id, context);

      return {
        success: true,
        data: file,
        metadata: {
          operation: 'getFile',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Download file by ID
   */
  downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'download',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const { buffer, metadata } = await this.fileService.downloadFile(id, context);

      // Set appropriate headers
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Length', metadata.fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      return res.send(buffer);
    });
  };

  /**
   * Get signed download URL for a file
   */
  getDownloadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const { expiresIn = '3600' } = req.query;

      const expirySeconds = parseInt(expiresIn as string);
      if (isNaN(expirySeconds) || expirySeconds < 60 || expirySeconds > 86400) {
        throw new AppError('Invalid expiration time (must be between 60 and 86400 seconds)', 400);
      }

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'download',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const downloadUrl = await this.fileService.getDownloadUrl(id, context, expirySeconds);

      return {
        success: true,
        data: {
          downloadUrl,
          expiresIn: expirySeconds,
          expiresAt: new Date(Date.now() + expirySeconds * 1000)
        },
        metadata: {
          operation: 'getDownloadUrl',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Get thumbnail URL for a file
   */
  getThumbnailUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const { expiresIn = '3600' } = req.query;

      const expirySeconds = parseInt(expiresIn as string);
      if (isNaN(expirySeconds) || expirySeconds < 60 || expirySeconds > 86400) {
        throw new AppError('Invalid expiration time (must be between 60 and 86400 seconds)', 400);
      }

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'view',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const thumbnailUrl = await this.fileService.getThumbnailUrl(id, context, expirySeconds);

      return {
        success: true,
        data: {
          thumbnailUrl,
          expiresIn: expirySeconds,
          expiresAt: new Date(Date.now() + expirySeconds * 1000)
        },
        metadata: {
          operation: 'getThumbnailUrl',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Delete a file
   */
  deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'delete',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      await this.fileService.deleteFile(id, context);

      return {
        success: true,
        message: 'File deleted successfully',
        metadata: {
          operation: 'delete',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Get files for a specific entity
   */
  getEntityFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { entityType, entityId } = req.params;
      const {
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        processingStatus,
        isPublic,
        search,
        dateFrom,
        dateTo
      } = req.query;

      // Validate entityType
      if (!Object.values(file_entity_type).includes(entityType as file_entity_type)) {
        throw new AppError('Invalid entity type', 400);
      }

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'view',
        entityId,
        entityType: entityType as file_entity_type,
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        processingStatus: processingStatus as string,
        isPublic: isPublic === 'true',
        search: search as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const result = await this.fileService.getFilesByEntity(
        entityType as file_entity_type,
        entityId,
        context,
        options
      );

      return {
        success: true,
        data: result.files,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / options.limit)
        },
        metadata: {
          operation: 'getEntityFiles',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Get current user's files
   */
  getUserFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const {
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        entityType,
        mimeType,
        processingStatus,
        search,
        dateFrom,
        dateTo
      } = req.query;

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'view',
        entityId: req.user!.userId,
        entityType: 'USER_PROFILE',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        entityType: entityType as file_entity_type,
        mimeType: mimeType as string,
        processingStatus: processingStatus as string,
        search: search as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const result = await this.fileService.getUserFiles(req.user!.userId, context, options);

      return {
        success: true,
        data: result.files,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / options.limit)
        },
        metadata: {
          operation: 'getUserFiles',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  /**
   * Update file metadata
   */
  updateFileMetadata = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const { isPublic, expiresAt } = req.body;

      const context: FileSecurityContext = {
        userId: req.user!.userId,
        userRole: req.user!.role,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        operation: 'update',
        fileId: id,
        entityId: '',
        entityType: 'MAINTENANCE_REQUEST',
        permissions: this.getUserPermissions(req.user!.role),
        riskLevel: this.assessUserRisk(req.user!),
        securityFlags: []
      };

      const updates: any = {};

      if (typeof isPublic === 'boolean') {
        updates.isPublic = isPublic;
      }

      if (expiresAt) {
        const expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
          throw new AppError('Invalid expiration date', 400);
        }
        updates.expiresAt = expiresAtDate;
      } else if (expiresAt === null) {
        updates.expiresAt = null;
      }

      const updatedFile = await this.fileService.updateFileMetadata(id, updates, context);

      return {
        success: true,
        message: 'File metadata updated successfully',
        data: updatedFile,
        metadata: {
          operation: 'updateFileMetadata',
          duration: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };

  // Helper methods

  private getUserPermissions(role: string) {
    return {
      canUpload: true, // All authenticated users can upload
      canDownload: true,
      canDelete: ['SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN', 'ADMIN'].includes(role),
      canViewMetadata: true,
      canManagePublic: ['SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN', 'ADMIN'].includes(role),
      canBypassLimits: ['SUPER_ADMIN'].includes(role)
    };
  }

  private assessUserRisk(user: any): 'low' | 'medium' | 'high' {
    // Simple risk assessment - could be made more sophisticated
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 1) return 'high';
    if (daysSinceCreation < 7) return 'medium';
    return 'low';
  }

  // Export multer upload middleware for use in routes
  static uploadMiddleware = upload.array('files', 10); // Max 10 files
}