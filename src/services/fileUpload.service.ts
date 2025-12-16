import {
  StorageService,
  StorageUploadResult,
} from "@/services/storage/storage.service";

import { AppError } from "@/utils/appError";
import { logger } from "@/config/logger";

export interface FileUploadResult {
  key: string;
  url: string;
  signedUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: Date;
}

export class FileUploadService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Upload a file to Hetzner Object Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<FileUploadResult> {
    try {
      // Generate unique file key
      const fileKey = this.generateFileKey(file.originalname, userId);

      // Upload to storage
      const uploadResult = await this.storageService.uploadFile(
        file.buffer,
        fileKey,
        file.mimetype,
        {
          uploadedBy: userId,
          originalName: file.originalname,
        }
      );

      // Generate signed URL for immediate access
      const signedUrl = await this.storageService.getSignedUrl(fileKey, 3600); // 1 hour expiry

      logger.info("File upload completed", {
        key: fileKey,
        userId,
        fileName: file.originalname,
        size: file.size,
      });

      return {
        key: uploadResult.key,
        url: uploadResult.url,
        signedUrl,
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error("File upload failed", {
        fileName: file.originalname,
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to upload file", 500);
    }
  }

  /**
   * Generate a unique file key for storage
   * Format: uploads/{userId}/{timestamp}-{random}-{sanitizedFilename}
   */
  private generateFileKey(originalName: string, userId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

    return `uploads/${userId}/${timestamp}-${random}-${sanitizedFileName}`;
  }

  /**
   * Get a signed URL for a file
   */
  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.storageService.getSignedUrl(key, expiresIn);
    } catch (error) {
      logger.error("Failed to get file URL", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to generate file URL", 500);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.storageService.deleteFile(key);
      logger.info("File deleted", { key });
    } catch (error) {
      logger.error("Failed to delete file", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to delete file", 500);
    }
  }

  /**
   * List files for a user
   */
  async listUserFiles(
    prefix: string,
    maxKeys: number = 100
  ): Promise<
    Array<{
      key: string;
      fileName: string;
      fileSize: number;
      uploadedAt: Date;
    }>
  > {
    try {
      const files = await this.storageService.listFiles(prefix, maxKeys);

      // Transform S3 response to user-friendly format
      return files.map((file) => ({
        key: file.key,
        fileName: file.key.split("/").pop() || file.key,
        fileSize: file.size,
        uploadedAt: file.lastModified,
      }));
    } catch (error) {
      logger.error("Failed to list user files", {
        prefix,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to retrieve files", 500);
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(key: string): Promise<{
    key: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    uploadedAt: Date;
  }> {
    try {
      const metadata = await this.storageService.getFileMetadata(key);

      return {
        key,
        fileName: key.split("/").pop() || key,
        fileSize: metadata.contentLength,
        contentType: metadata.contentType,
        uploadedAt: metadata.lastModified,
      };
    } catch (error) {
      logger.error("Failed to get file info", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof AppError && error.statusCode === 404) {
        throw new AppError("File not found", 404);
      }

      throw new AppError("Failed to retrieve file information", 500);
    }
  }
}
