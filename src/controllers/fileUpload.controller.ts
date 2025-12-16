import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/appError";
import { BaseController } from "@/controllers/base.controller";
import { FileUploadService } from "@/services/fileUpload.service";

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
  uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const file = req.file;

      if (!file) {
        throw new AppError("No file provided for upload", 400);
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new AppError("File size exceeds maximum limit of 50MB", 413);
      }

      // Get user ID from authenticated request
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      // Upload file
      const result = await this.fileUploadService.uploadFile(file, userId);

      return {
        success: true,
        message: "File uploaded successfully",
        data: result,
      };
    });
  };

  /**
   * Upload multiple files
   * POST /api/v1/storage/upload/multiple
   */
  uploadMultipleFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError("No files provided for upload", 400);
      }

      // Validate file sizes (50MB limit each)
      const maxSize = 50 * 1024 * 1024; // 50MB
      for (const file of files) {
        if (file.size > maxSize) {
          throw new AppError(
            `File ${file.originalname} exceeds maximum limit of 50MB`,
            413
          );
        }
      }

      // Get user ID from authenticated request
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      // Upload files
      const results = await Promise.allSettled(
        files.map((file) => this.fileUploadService.uploadFile(file, userId))
      );

      const uploaded: any[] = [];
      const errors: any[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          uploaded.push(result.value);
        } else {
          errors.push({
            fileName: files[index].originalname,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Upload failed",
          });
        }
      });

      return {
        success: uploaded.length > 0,
        data: {
          uploaded,
          errors,
          summary: {
            total: files.length,
            uploaded: uploaded.length,
            failed: errors.length,
          },
        },
      };
    });
  };

  /**
   * Get download URL for a file
   * GET /api/v1/storage/:fileKey/download
   */
  getDownloadUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { fileKey } = req.params;
      const expiresIn = req.query.expiresIn
        ? parseInt(req.query.expiresIn as string)
        : 3600;

      if (!fileKey) {
        throw new AppError("File key is required", 400);
      }

      // Validate expiresIn range (60 - 86400 seconds)
      if (expiresIn < 60 || expiresIn > 86400) {
        throw new AppError(
          "expiresIn must be between 60 and 86400 seconds",
          400
        );
      }

      const signedUrl = await this.fileUploadService.getFileUrl(
        fileKey,
        expiresIn
      );

      return {
        success: true,
        message: "Download URL generated successfully",
        data: {
          signedUrl,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      };
    });
  };

  /**
   * Get file information
   * GET /api/v1/storage/:fileKey
   */
  getFileInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { fileKey } = req.params;

      if (!fileKey) {
        throw new AppError("File key is required", 400);
      }

      // Get file metadata from storage
      const fileInfo = await this.fileUploadService.getFileInfo(fileKey);

      return {
        success: true,
        message: "File information retrieved",
        data: fileInfo,
      };
    });
  };

  /**
   * Delete a file
   * DELETE /api/v1/storage/:fileKey
   */
  deleteFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { fileKey } = req.params;

      if (!fileKey) {
        throw new AppError("File key is required", 400);
      }

      await this.fileUploadService.deleteFile(fileKey);

      return {
        success: true,
        message: "File deleted successfully",
      };
    });
  };

  /**
   * List user files
   * GET /api/v1/storage/files
   */
  listFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      // Get files from storage service (basic implementation)
      // Note: This returns files from S3 directly without database records
      // For database-backed file listing with metadata, use /api/v1/files/my-files
      const userPrefix = `uploads/${userId}/`;
      const files = await this.fileUploadService.listUserFiles(
        userPrefix,
        limit
      );

      // Calculate pagination
      const total = files.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFiles = files.slice(startIndex, endIndex);

      return {
        success: true,
        message: "Files retrieved successfully",
        data: {
          files: paginatedFiles,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      };
    });
  };

  /**
   * Get storage statistics
   * GET /api/v1/storage/stats
   */
  getStorageStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      // Get user's files from storage
      const userPrefix = `uploads/${userId}/`;
      const files = await this.fileUploadService.listUserFiles(
        userPrefix,
        1000
      );

      // Calculate statistics
      let totalSize = 0;
      const fileStats = {
        images: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
        other: { count: 0, size: 0 },
      };

      files.forEach((file) => {
        totalSize += file.fileSize;

        // Categorize by file extension
        const ext = file.fileName.split(".").pop()?.toLowerCase() || "";

        if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
          fileStats.images.count++;
          fileStats.images.size += file.fileSize;
        } else if (
          ["pdf", "doc", "docx", "txt", "rtf", "xls", "xlsx"].includes(ext)
        ) {
          fileStats.documents.count++;
          fileStats.documents.size += file.fileSize;
        } else if (["mp4", "avi", "mov", "mkv", "webm"].includes(ext)) {
          fileStats.videos.count++;
          fileStats.videos.size += file.fileSize;
        } else if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
          fileStats.audio.count++;
          fileStats.audio.size += file.fileSize;
        } else {
          fileStats.other.count++;
          fileStats.other.size += file.fileSize;
        }
      });

      return {
        success: true,
        message: "Storage statistics retrieved",
        data: {
          totalFiles: files.length,
          totalSize,
          fileStats,
        },
      };
    });
  };
}
