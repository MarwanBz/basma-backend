import AWS from 'aws-sdk';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import {
  StorageUploadResult,
  StorageDownloadOptions,
  FileConfiguration
} from '@/types/file.types';
import { AppError } from '@/utils/appError';
import { logger } from '@/config/logger';

export class HetznerStorageService {
  private s3: AWS.S3;
  private bucket: string;
  private region: string;
  private config: FileConfiguration['storage'];

  constructor(config: FileConfiguration['storage']) {
    this.config = config;
    this.bucket = config.bucket;
    this.region = config.region;

    // Configure AWS SDK for Hetzner Object Storage
    this.s3 = new AWS.S3({
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      s3ForcePathStyle: true, // Required for Hetzner
      signatureVersion: 'v4',
      maxRetries: 3,
      retryDelayOptions: {
        customBackoff: (retryCount: number) => Math.pow(2, retryCount) * 100 // Exponential backoff
      }
    });

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      logger.info('Successfully connected to Hetzner Object Storage', {
        bucket: this.bucket,
        region: this.region
      });
    } catch (error) {
      logger.error('Failed to connect to Hetzner Object Storage', {
        bucket: this.bucket,
        region: this.region,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Failed to connect to storage service', 503);
    }
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();

    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private', // Always upload as private, use signed URLs for access
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata
        },
        ServerSideEncryption: this.config.encryptionEnabled ? 'AES256' : undefined
      };

      const result = await this.s3.upload(params).promise();

      logger.info('File uploaded successfully', {
        key,
        bucket: result.Bucket,
        etag: result.ETag,
        size: buffer.length,
        duration: Date.now() - startTime
      });

      return {
        key: result.Key,
        url: result.Location,
        bucket: result.Bucket,
        etag: result.ETag
      };

    } catch (error) {
      logger.error('Failed to upload file', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof Error) {
        if (error.message.includes('NoSuchBucket')) {
          throw new AppError('Storage bucket does not exist', 404);
        }
        if (error.message.includes('AccessDenied')) {
          throw new AppError('Access denied to storage service', 403);
        }
        if (error.message.includes('EntityTooLarge')) {
          throw new AppError('File size exceeds storage limit', 413);
        }
      }

      throw new AppError('Failed to upload file to storage', 500);
    }
  }

  async uploadFileStream(
    filePath: string,
    key: string,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();

    try {
      if (!existsSync(filePath)) {
        throw new AppError('Source file does not exist', 404);
      }

      const fileStream = createReadStream(filePath);
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ACL: 'private',
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata
        },
        ServerSideEncryption: this.config.encryptionEnabled ? 'AES256' : undefined
      };

      const result = await this.s3.upload(params).promise();

      logger.info('File uploaded successfully from stream', {
        key,
        bucket: result.Bucket,
        etag: result.ETag,
        duration: Date.now() - startTime
      });

      return {
        key: result.Key,
        url: result.Location,
        bucket: result.Bucket,
        etag: result.ETag
      };

    } catch (error) {
      logger.error('Failed to upload file from stream', {
        key,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to upload file to storage', 500);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const startTime = Date.now();

    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: key
      };

      const result = await this.s3.getObject(params).promise();

      if (!result.Body) {
        throw new AppError('Empty file received from storage', 500);
      }

      const buffer = result.Body as Buffer;

      logger.info('File downloaded successfully', {
        key,
        size: buffer.length,
        contentType: result.ContentType,
        duration: Date.now() - startTime
      });

      return buffer;

    } catch (error) {
      logger.error('Failed to download file', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey')) {
          throw new AppError('File not found in storage', 404);
        }
        if (error.message.includes('AccessDenied')) {
          throw new AppError('Access denied to file', 403);
        }
      }

      throw new AppError('Failed to download file from storage', 500);
    }
  }

  async downloadFileStream(
    key: string,
    destinationPath: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Ensure destination directory exists
      const destDir = join(destinationPath, '..');
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: key
      };

      const s3Stream = this.s3.getObject(params).createReadStream();
      const fileStream = createWriteStream(destinationPath);

      await pipeline(s3Stream, fileStream);

      logger.info('File downloaded successfully to stream', {
        key,
        destinationPath,
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to download file to stream', {
        key,
        destinationPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to download file from storage', 500);
    }
  }

  getSignedUrl(
    key: string,
    expiresIn: number = 3600,
    options: StorageDownloadOptions = {}
  ): string {
    try {
      const params: any = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn
      };

      // Add response parameters if specified
      if (options.contentType) {
        params.ResponseContentType = options.contentType;
      }

      if (options.disposition) {
        params.ResponseContentDisposition = `${options.disposition}; filename="${key.split('/').pop()}"`;
      }

      const signedUrl = this.s3.getSignedUrl('getObject', params);

      logger.debug('Generated signed URL', {
        key,
        expiresIn,
        urlLength: signedUrl.length
      });

      return signedUrl;

    } catch (error) {
      logger.error('Failed to generate signed URL', {
        key,
        expiresIn,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to generate download URL', 500);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();

      logger.info('File deleted successfully', {
        key,
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to delete file', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to delete file from storage', 500);
    }
  }

  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const startTime = Date.now();

    try {
      if (keys.length === 0) return;

      const params: AWS.S3.DeleteObjectsRequest = {
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(key => ({ Key: key }))
        }
      };

      const result = await this.s3.deleteObjects(params).promise();

      logger.info('Multiple files deleted successfully', {
        deleted: result.Deleted?.length || 0,
        errors: result.Errors?.length || 0,
        duration: Date.now() - startTime
      });

      if (result.Errors && result.Errors.length > 0) {
        logger.warn('Some files failed to delete', {
          errors: result.Errors
        });
      }

    } catch (error) {
      logger.error('Failed to delete multiple files', {
        keyCount: keys.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to delete files from storage', 500);
    }
  }

  async copyFile(
    sourceKey: string,
    destinationKey: string,
    metadata: Record<string, string> = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();

    try {
      const params: AWS.S3.CopyObjectRequest = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        Metadata: {
          copiedAt: new Date().toISOString(),
          originalKey: sourceKey,
          ...metadata
        },
        MetadataDirective: 'REPLACE',
        ACL: 'private'
      };

      const result = await this.s3.copyObject(params).promise();

      logger.info('File copied successfully', {
        sourceKey,
        destinationKey,
        duration: Date.now() - startTime
      });

      return {
        key: destinationKey,
        url: `https://${this.bucket}.${this.region}.your-objectstorage.com/${destinationKey}`,
        bucket: this.bucket,
        etag: result.CopyObjectResult?.ETag
      };

    } catch (error) {
      logger.error('Failed to copy file', {
        sourceKey,
        destinationKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to copy file in storage', 500);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.headObject(params).promise();
      return true;

    } catch (error: any) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        return false;
      }

      logger.error('Failed to check file existence', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to check file existence', 500);
    }
  }

  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: key
      };

      return await this.s3.headObject(params).promise();

    } catch (error: any) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        throw new AppError('File not found in storage', 404);
      }

      logger.error('Failed to get file metadata', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to get file metadata', 500);
    }
  }

  async listFiles(
    prefix: string = '',
    maxKeys: number = 1000
  ): Promise<AWS.S3.ObjectList> {
    try {
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents || [];

    } catch (error) {
      logger.error('Failed to list files', {
        prefix,
        maxKeys,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to list files in storage', 500);
    }
  }

  async getBucketUsage(): Promise<{
    fileCount: number;
    totalSize: number;
    lastModified?: Date;
  }> {
    try {
      let fileCount = 0;
      let totalSize = 0;
      let lastModified: Date | undefined;

      let continuationToken: string | undefined;

      do {
        const params: AWS.S3.ListObjectsV2Request = {
          Bucket: this.bucket,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        };

        const result = await this.s3.listObjectsV2(params).promise();

        if (result.Contents) {
          fileCount += result.Contents.length;

          for (const object of result.Contents) {
            if (object.Size) {
              totalSize += object.Size;
            }

            if (object.LastModified && (!lastModified || object.LastModified > lastModified)) {
              lastModified = object.LastModified;
            }
          }
        }

        continuationToken = result.NextContinuationToken;

      } while (continuationToken);

      return {
        fileCount,
        totalSize,
        lastModified
      };

    } catch (error) {
      logger.error('Failed to get bucket usage', {
        bucket: this.bucket,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to get storage usage statistics', 500);
    }
  }

  generateFileKey(
    entityType: string,
    entityId: string,
    fileName: string
  ): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${entityType.toLowerCase()}/${entityId}/${timestamp}/${random}_${sanitizedFileName}`;
  }

  generateThumbnailKey(originalKey: string): string {
    const parts = originalKey.split('.');
    const extension = parts.pop();
    const baseName = parts.join('.');

    return `${baseName}_thumb.${extension}`;
  }

  private validateKey(key: string): void {
    // S3 key validation
    if (!key || key.length === 0) {
      throw new AppError('File key cannot be empty', 400);
    }

    if (key.length > 1024) {
      throw new AppError('File key too long (max 1024 characters)', 400);
    }

    // Check for invalid characters
    const invalidChars = ['\\', '<', '>', ':', '"', '|', '?', '*'];
    for (const char of invalidChars) {
      if (key.includes(char)) {
        throw new AppError(`File key contains invalid character: ${char}`, 400);
      }
    }

    // Check for consecutive slashes
    if (key.includes('//')) {
      throw new AppError('File key cannot contain consecutive slashes', 400);
    }

    // Check for leading/trailing slashes
    if (key.startsWith('/') || key.endsWith('/')) {
      throw new AppError('File key cannot start or end with slash', 400);
    }
  }
}