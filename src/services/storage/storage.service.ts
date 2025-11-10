import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { AppError } from "@/utils/appError";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/config/logger";
import { storageConfig } from "@/config/storage.config";

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    // Configure S3Client for Hetzner Object Storage (S3-compatible API)
    this.s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      forcePathStyle: true, // Required for Hetzner S3-compatible API
    });

    this.bucket = storageConfig.bucket;

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: "test-connection",
      });

      // This will fail, but we can catch the error to verify connection
      try {
        await this.s3Client.send(command);
      } catch (error: any) {
        // If it's a 404, the bucket exists and connection works
        if (
          error.name === "NotFound" ||
          error.$metadata?.httpStatusCode === 404
        ) {
          logger.info("Successfully connected to Hetzner Object Storage", {
            bucket: this.bucket,
            region: storageConfig.region,
          });
          return;
        }
        // If it's AccessDenied, bucket exists but we can't access test key (expected)
        if (
          error.name === "Forbidden" ||
          error.$metadata?.httpStatusCode === 403
        ) {
          logger.info("Successfully connected to Hetzner Object Storage", {
            bucket: this.bucket,
            region: storageConfig.region,
          });
          return;
        }
        throw error;
      }
    } catch (error) {
      logger.error("Failed to connect to Hetzner Object Storage", {
        bucket: this.bucket,
        region: storageConfig.region,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw here - let it fail on first actual operation
    }
  }

  /**
   * Upload a file to Hetzner Object Storage
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      });

      const result = await this.s3Client.send(command);

      logger.info("File uploaded successfully", {
        key,
        bucket: this.bucket,
        etag: result.ETag,
        size: buffer.length,
        duration: Date.now() - startTime,
      });

      // Construct URL manually since Hetzner uses path-style URLs
      const url = `${storageConfig.endpoint}/${this.bucket}/${key}`;

      return {
        key,
        url,
        bucket: this.bucket,
        etag: result.ETag,
      };
    } catch (error) {
      logger.error("Failed to upload file", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof Error) {
        if (error.message.includes("NoSuchBucket")) {
          throw new AppError("Storage bucket does not exist", 404);
        }
        if (
          error.message.includes("AccessDenied") ||
          error.name === "Forbidden"
        ) {
          throw new AppError("Access denied to storage service", 403);
        }
        if (error.message.includes("EntityTooLarge")) {
          throw new AppError("File size exceeds storage limit", 413);
        }
      }

      throw new AppError("Failed to upload file to storage", 500);
    }
  }

  /**
   * Generate a signed URL for downloading a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.debug("Generated signed URL", {
        key,
        expiresIn,
        urlLength: signedUrl.length,
      });

      return signedUrl;
    } catch (error) {
      logger.error("Failed to generate signed URL", {
        key,
        expiresIn,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to generate download URL", 500);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info("File deleted successfully", {
        key,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("Failed to delete file", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to delete file from storage", 500);
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }

      logger.error("Failed to check file existence", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to check file existence", 500);
    }
  }

  /**
   * List files in storage with optional prefix filtering
   */
  async listFiles(
    prefix: string = "",
    maxKeys: number = 1000
  ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    try {
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await this.s3Client.send(command);

      const files =
        result.Contents?.map((item) => ({
          key: item.Key!,
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
        })) || [];

      logger.info("Listed files from storage", {
        prefix,
        count: files.length,
        bucket: this.bucket,
      });

      return files;
    } catch (error) {
      logger.error("Failed to list files", {
        prefix,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to list files from storage", 500);
    }
  }

  /**
   * Copy a file within storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const startTime = Date.now();

    try {
      const { CopyObjectCommand } = await import("@aws-sdk/client-s3");
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);

      logger.info("File copied successfully", {
        sourceKey,
        destinationKey,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("Failed to copy file", {
        sourceKey,
        destinationKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new AppError("Failed to copy file in storage", 500);
    }
  }

  /**
   * Get file metadata from storage
   */
  async getFileMetadata(key: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified: Date;
    etag?: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);

      logger.debug("Retrieved file metadata", {
        key,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
      });

      return {
        contentType: result.ContentType || "application/octet-stream",
        contentLength: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        etag: result.ETag,
        metadata: result.Metadata,
      };
    } catch (error) {
      logger.error("Failed to get file metadata", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof Error && error.name === "NotFound") {
        throw new AppError("File not found in storage", 404);
      }

      throw new AppError("Failed to get file metadata", 500);
    }
  }
}
