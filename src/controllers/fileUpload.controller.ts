import { Request, Response, NextFunction } from 'express';
import { FileUploadService } from '@/services/fileUpload.service';
import { BaseController } from '@/controllers/base.controller';
import { AppError } from '@/utils/appError';

export class FileUploadController extends BaseController {
  private fileUploadService: FileUploadService;

  constructor() {
    super();
    this.fileUploadService = new FileUploadService();
  }

  /**
   * Upload a file
   * POST /api/v1/storage/upload
   */
  uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const file = req.file;

      if (!file) {
        throw new AppError('No file provided for upload', 400);
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new AppError('File size exceeds maximum limit of 50MB', 413);
      }

      // Get user ID from authenticated request
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Upload file
      const result = await this.fileUploadService.uploadFile(file, userId);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: result,
      };
    });
  };
}

