import { Express, FileValidationResult } from "@/types/file.types";

import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { logger } from "@/config/logger";

/**
 * Simplified File Validation Service
 * Provides basic validation for file uploads:
 * - Basic properties (filename, buffer)
 * - MIME type checking (allowed/blocked lists)
 * - File signature verification (magic bytes)
 * - Size limits
 */
export class FileValidationService {
  private static readonly ALLOWED_MIME_TYPES = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",

    // Videos
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",

    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",

    // Archives
    "application/zip",
    "application/x-rar-compressed",
  ];

  private static readonly BLOCKED_MIME_TYPES = [
    "application/x-executable",
    "application/x-msdownload",
    "application/x-msdos-program",
    "application/x-msi",
    "application/x-java-applet",
    "application/x-shockwave-flash",
    "text/x-php",
    "text/x-shellscript",
  ];

  private static readonly DANGEROUS_EXTENSIONS = [
    "exe",
    "bat",
    "cmd",
    "com",
    "pif",
    "scr",
    "vbs",
    "jar",
    "msi",
    "dll",
    "sys",
    "sh",
    "ps1",
    "app",
    "deb",
    "rpm",
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate a file with basic checks
   */
  async validateFile(file: Express.Multer.File): Promise<FileValidationResult> {
    const startTime = Date.now();
    const result: FileValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {},
      category: "unknown",
      securityFlags: [],
    };

    try {
      // Step 1: Basic properties
      this.validateBasicProperties(file, result);

      // Step 2: MIME type
      this.validateMimeType(file, result);

      // Step 3: File signature (magic bytes)
      await this.validateFileSignature(file, result);

      // Step 4: Size
      this.validateFileSize(file, result);

      // Determine final validity
      result.valid = result.errors.length === 0;

      const duration = Date.now() - startTime;
      logger.info("File validation completed", {
        filename: file.originalname,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
        duration,
        category: result.category,
      });
    } catch (error) {
      logger.error("File validation failed", {
        filename: file.originalname,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      result.valid = false;
      result.errors.push("File validation process failed");
    }

    return result;
  }

  /**
   * Validate basic file properties
   */
  private validateBasicProperties(
    file: Express.Multer.File,
    result: FileValidationResult
  ): void {
    if (!file) {
      result.errors.push("No file provided");
      return;
    }

    if (!file.originalname || file.originalname.trim() === "") {
      result.errors.push("Filename is required");
      return;
    }

    // Check for dangerous extensions
    const extension = this.getFileExtension(file.originalname);
    if (
      FileValidationService.DANGEROUS_EXTENSIONS.includes(
        extension.toLowerCase()
      )
    ) {
      result.errors.push(`File type .${extension} is not allowed`);
      result.securityFlags.push("dangerous_extension");
    }

    // Check filename length
    if (file.originalname.length > 255) {
      result.errors.push("Filename is too long (max 255 characters)");
    }

    // Check for path traversal attempts
    if (file.originalname.includes("..") || file.originalname.includes("/")) {
      result.errors.push("Invalid filename characters detected");
      result.securityFlags.push("path_traversal_attempt");
    }

    result.metadata.originalName = file.originalname;
    result.metadata.fileSize = file.size;
  }

  /**
   * Validate MIME type against allowed/blocked lists
   */
  private validateMimeType(
    file: Express.Multer.File,
    result: FileValidationResult
  ): void {
    const declaredMimeType = file.mimetype;

    // Check if MIME type is blocked
    if (FileValidationService.BLOCKED_MIME_TYPES.includes(declaredMimeType)) {
      result.errors.push(`MIME type ${declaredMimeType} is not allowed`);
      result.securityFlags.push("blocked_mime_type");
      return;
    }

    // Check if MIME type is allowed
    if (!FileValidationService.ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
      result.errors.push(`MIME type ${declaredMimeType} is not supported`);
      return;
    }

    result.metadata.mimeType = declaredMimeType;
    result.metadata.fileExtension = this.getFileExtension(file.originalname);
    result.category = this.categorizeFile(declaredMimeType);
  }

  /**
   * Validate file signature (magic bytes) to prevent MIME type spoofing
   */
  private async validateFileSignature(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      const fileType = await fileTypeFromBuffer(file.buffer);

      if (!fileType) {
        result.warnings.push("Unable to determine file type from content");
        return;
      }

      // Compare declared MIME type with detected type
      if (fileType.mime !== file.mimetype) {
        result.errors.push(
          `File type mismatch: declared as ${file.mimetype}, detected as ${fileType.mime}`
        );
        result.securityFlags.push("mime_type_mismatch");
      }
    } catch (error) {
      result.warnings.push("Unable to verify file signature");
    }
  }

  /**
   * Validate file size limits
   */
  private validateFileSize(
    file: Express.Multer.File,
    result: FileValidationResult
  ): void {
    if (file.size === 0) {
      result.errors.push("File is empty");
      return;
    }

    if (file.size > FileValidationService.MAX_FILE_SIZE) {
      result.errors.push(
        `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(FileValidationService.MAX_FILE_SIZE / 1024 / 1024)}MB`
      );
    }
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  }

  /**
   * Categorize file by MIME type
   */
  private categorizeFile(
    mimeType: string
  ): "image" | "video" | "document" | "audio" | "archive" | "unknown" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("text/")) return "document";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return "document";
    }
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("archive")
    ) {
      return "archive";
    }
    return "unknown";
  }

  /**
   * Generate SHA-256 checksum for file buffer
   */
  generateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Check if file type is allowed
   */
  isFileTypeAllowed(filename: string, mimeType: string): boolean {
    const extension = this.getFileExtension(filename);
    return (
      FileValidationService.ALLOWED_MIME_TYPES.includes(mimeType) &&
      !FileValidationService.BLOCKED_MIME_TYPES.includes(mimeType) &&
      !FileValidationService.DANGEROUS_EXTENSIONS.includes(extension)
    );
  }
}
