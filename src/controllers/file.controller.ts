import { Request, Response, NextFunction } from 'express';
import { FileService } from '@/services/file.service';
import { BaseController } from '@/controllers/base.controller';
import { AppError } from '@/utils/appError';
import { file_entity_type } from '@prisma/client';
import { validateEntityType } from '@/utils/file.utils';
import { FileListFilters, FileSearchQuery } from '@/types/file.types';

/**
 * File Controller - Handles all file-related HTTP requests
 */
export class FileController extends BaseController {
  private fileService: FileService;

  constructor() {
    super();
    this.fileService = new FileService();
  }

  /**
   * Upload a single file
   * POST /api/v1/files/upload
   */
  uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const file = req.file;

      if (!file) {
        throw new AppError('No file provided', 400);
      }

      // Get entity information from body
      const { entityType, entityId, isPublic, expiresAt } = req.body;

      if (!entityType || !entityId) {
        throw new AppError('Entity type and ID are required', 400);
      }

      // Validate entity type
      if (!validateEntityType(entityType)) {
        throw new AppError('Invalid entity type', 400);
      }

      // Get user ID from authenticated request
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Upload file
      const result = await this.fileService.uploadFile(
        file,
        entityType as file_entity_type,
        entityId,
        userId,
        {
          isPublic: isPublic === 'true' || isPublic === true,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          uploadIp: req.ip,
        }
      );

      return {
        success: true,
        message: 'File uploaded successfully',
        data: result,
      };
    });
  };

  /**
   * Upload multiple files
   * POST /api/v1/files/upload-multiple
   */
  uploadMultipleFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files provided', 400);
      }

      // Get entity information from body
      const { entityType, entityId, isPublic, expiresAt } = req.body;

      if (!entityType || !entityId) {
        throw new AppError('Entity type and ID are required', 400);
      }

      // Validate entity type
      if (!validateEntityType(entityType)) {
        throw new AppError('Invalid entity type', 400);
      }

      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Upload files
      const result = await this.fileService.uploadMultipleFiles(
        files,
        entityType as file_entity_type,
        entityId,
        userId,
        {
          isPublic: isPublic === 'true' || isPublic === true,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          uploadIp: req.ip,
        }
      );

      return {
        success: true,
        message: `Uploaded ${result.uploaded.length} of ${files.length} files`,
        data: {
          uploaded: result.uploaded,
          errors: result.errors,
        },
      };
    });
  };

  /**
   * Download a file (get signed URL)
   * GET /api/v1/files/:id/download
   */
  downloadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const expiresIn = req.query.expiresIn
        ? parseInt(req.query.expiresIn as string)
        : 3600;

      const result = await this.fileService.downloadFile(id, userId, expiresIn);

      return {
        success: true,
        message: 'Download URL generated',
        data: {
          signedUrl: result.signedUrl,
          file: result.file,
          expiresIn,
        },
      };
    });
  };

  /**
   * Delete a file
   * DELETE /api/v1/files/:id
   */
  deleteFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await this.fileService.deleteFile(id, userId);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    });
  };

  /**
   * Get file details
   * GET /api/v1/files/:id
   */
  getFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const file = await this.fileService.getFileById(id, userId);

      return {
        success: true,
        message: 'File retrieved successfully',
        data: file,
      };
    });
  };

  /**
   * List all files (admin only)
   * GET /api/v1/files
   */
  listAllFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Only admins can list all files
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN'];
      if (!adminRoles.includes(userRole)) {
        throw new AppError('Access denied. Admin privileges required.', 403);
      }

      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: FileListFilters = {
        entityType: req.query.entityType as file_entity_type | undefined,
        entityId: req.query.entityId as string | undefined,
        mimeType: req.query.mimeType as string | undefined,
        isPublic:
          req.query.isPublic !== undefined
            ? req.query.isPublic === 'true'
            : undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        minSize: req.query.minSize
          ? parseInt(req.query.minSize as string)
          : undefined,
        maxSize: req.query.maxSize
          ? parseInt(req.query.maxSize as string)
          : undefined,
      };

      const result = await this.fileService.getAllFiles(
        filters,
        page,
        limit
      );

      return {
        success: true,
        message: 'All files retrieved successfully',
        data: result.files,
        pagination: result.pagination,
      };
    });
  };

  /**
   * Get current user's files
   * GET /api/v1/files/my-files
   */
  listMyFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: FileListFilters = {
        entityType: req.query.entityType as file_entity_type | undefined,
        entityId: req.query.entityId as string | undefined,
        mimeType: req.query.mimeType as string | undefined,
        isPublic:
          req.query.isPublic !== undefined
            ? req.query.isPublic === 'true'
            : undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        minSize: req.query.minSize
          ? parseInt(req.query.minSize as string)
          : undefined,
        maxSize: req.query.maxSize
          ? parseInt(req.query.maxSize as string)
          : undefined,
      };

      const result = await this.fileService.getUserFiles(
        userId,
        filters,
        page,
        limit
      );

      return {
        success: true,
        message: 'Files retrieved successfully',
        data: result.files,
        pagination: result.pagination,
      };
    });
  };

  /**
   * Get files for a specific entity
   * GET /api/v1/files/entity/:entityType/:entityId
   */
  listEntityFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { entityType, entityId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate entity type
      if (!validateEntityType(entityType)) {
        throw new AppError('Invalid entity type', 400);
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await this.fileService.getEntityFiles(
        entityType as file_entity_type,
        entityId,
        userId,
        page,
        limit
      );

      return {
        success: true,
        message: 'Entity files retrieved successfully',
        data: result.files,
        pagination: result.pagination,
      };
    });
  };

  /**
   * Search files
   * GET /api/v1/files/search
   */
  searchFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const searchQuery: FileSearchQuery = {
        query: req.query.q as string | undefined,
        entityType: req.query.entityType as file_entity_type | undefined,
        entityId: req.query.entityId as string | undefined,
        mimeType: req.query.mimeType as string | undefined,
        category: req.query.category as any,
        isPublic:
          req.query.isPublic !== undefined
            ? req.query.isPublic === 'true'
            : undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const result = await this.fileService.searchFiles(searchQuery, userId);

      return {
        success: true,
        message: 'Search completed successfully',
        data: result.files,
        pagination: result.pagination,
      };
    });
  };

  /**
   * Update file metadata
   * PATCH /api/v1/files/:id
   */
  updateFileMetadata = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { isPublic, expiresAt } = req.body;

      const updates: any = {};

      if (isPublic !== undefined) {
        updates.isPublic = isPublic;
      }

      if (expiresAt !== undefined) {
        updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      const file = await this.fileService.updateFileMetadata(
        id,
        userId,
        updates
      );

      return {
        success: true,
        message: 'File metadata updated successfully',
        data: file,
      };
    });
  };
}

