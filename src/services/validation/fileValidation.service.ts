import crypto from 'crypto';
import { createReadStream } from 'fs';
import { lookup } from 'mime-types';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import {
  Express,
  FileValidationResult,
  FileMetadata,
  FileSecurityContext
} from '@/types/file.types';
import { AppError } from '@/utils/appError';
import { logger } from '@/config/logger';
import { prisma } from '@/config/database';

export class FileValidationService {
  private static readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',

    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',

    // Videos (limited)
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',

    // Audio (limited)
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',

    // Archives
    'application/zip',
    'application/x-rar-compressed',
  ];

  private static readonly BLOCKED_MIME_TYPES = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-msi',
    'application/x-java-applet',
    'application/x-java-jnlp-file',
    'application/x-shockwave-flash',
    'application/x-bittorrent',
    'text/x-php',
    'text/x-perl',
    'text/x-python',
    'text/x-ruby',
    'text/x-shellscript',
  ];

  private static readonly DANGEROUS_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'app', 'deb',
    'pkg', 'dmg', 'rpm', 'msi', 'msp', 'msm', 'dll', 'ocx', 'sys', 'cpl', 'drv',
    'scr', 'vbs', 'js', 'wsf', 'wsh', 'ps1', 'ps1xml', 'ps2', 'ps2xml', 'psc1',
    'psc2', 'msh', 'msh1', 'msh2', 'mshxml', 'msh1xml', 'msh2xml'
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_IMAGE_DIMENSION = 10000; // pixels
  private static readonly MAX_VIDEO_DURATION = 3600; // 1 hour in seconds

  async validateFile(
    file: Express.Multer.File,
    context: FileSecurityContext
  ): Promise<FileValidationResult> {
    const startTime = Date.now();
    const result: FileValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {},
      category: 'unknown',
      securityFlags: []
    };

    try {
      // Step 1: Basic file validation
      await this.validateBasicProperties(file, result);

      // Step 2: MIME type validation
      await this.validateMimeType(file, result);

      // Step 3: File signature validation
      await this.validateFileSignature(file, result);

      // Step 4: Size validation
      await this.validateFileSize(file, result);

      // Step 5: Content-based validation
      await this.validateContent(file, result);

      // Step 6: Security scanning
      await this.performSecurityScanning(file, context, result);

      // Step 7: Extract metadata
      await this.extractMetadata(file, result);

      // Determine final validity
      result.valid = result.errors.length === 0;

      const duration = Date.now() - startTime;
      logger.info('File validation completed', {
        filename: file.originalname,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
        duration,
        category: result.category
      });

    } catch (error) {
      logger.error('File validation failed', {
        filename: file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      result.valid = false;
      result.errors.push('File validation process failed');
    }

    return result;
  }

  private async validateBasicProperties(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    // Check if file exists
    if (!file) {
      result.errors.push('No file provided');
      return;
    }

    // Check filename
    if (!file.originalname || file.originalname.trim() === '') {
      result.errors.push('Filename is required');
      return;
    }

    // Check for dangerous extensions
    const extension = this.getFileExtension(file.originalname);
    if (FileValidationService.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
      result.errors.push(`File type .${extension} is not allowed`);
      result.securityFlags.push('dangerous_extension');
    }

    // Check filename length
    if (file.originalname.length > 255) {
      result.errors.push('Filename is too long (max 255 characters)');
    }

    // Check for path traversal attempts
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      result.errors.push('Invalid filename characters detected');
      result.securityFlags.push('path_traversal_attempt');
    }

    // Store basic metadata
    result.metadata.originalName = file.originalname;
    result.metadata.fileSize = file.size;
  }

  private async validateMimeType(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    const declaredMimeType = file.mimetype;

    // Check if MIME type is blocked
    if (FileValidationService.BLOCKED_MIME_TYPES.includes(declaredMimeType)) {
      result.errors.push(`MIME type ${declaredMimeType} is not allowed`);
      result.securityFlags.push('blocked_mime_type');
      return;
    }

    // Check if MIME type is allowed
    if (!FileValidationService.ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
      result.errors.push(`MIME type ${declaredMimeType} is not supported`);
      return;
    }

    result.metadata.mimeType = declaredMimeType;
    result.metadata.fileExtension = this.getFileExtension(file.originalname);

    // Determine category
    result.category = this.categorizeFile(declaredMimeType);
  }

  private async validateFileSignature(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      // Use file-type library to detect actual file type from magic bytes
      const fileType = await fileTypeFromBuffer(file.buffer);

      if (!fileType) {
        result.errors.push('Unable to determine file type');
        result.securityFlags.push('unknown_file_type');
        return;
      }

      // Compare declared MIME type with detected type
      if (fileType.mime !== file.mimetype) {
        result.errors.push(
          `File type mismatch: declared as ${file.mimetype}, detected as ${fileType.mime}`
        );
        result.securityFlags.push('mime_type_mismatch');
        return;
      }

      // Additional validation for specific file types
      await this.validateSpecificFileFormat(file, fileType, result);

    } catch (error) {
      result.warnings.push('Unable to verify file signature');
      result.securityFlags.push('signature_verification_failed');
    }
  }

  private async validateSpecificFileFormat(
    file: Express.Multer.File,
    fileType: any,
    result: FileValidationResult
  ): Promise<void> {
    switch (fileType.mime) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        await this.validateImageFile(file, result);
        break;

      case 'application/pdf':
        await this.validatePdfFile(file, result);
        break;

      case 'video/mp4':
      case 'video/quicktime':
        await this.validateVideoFile(file, result);
        break;
    }
  }

  private async validateImageFile(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      const metadata = await sharp(file.buffer).metadata();

      if (!metadata.width || !metadata.height) {
        result.errors.push('Unable to read image dimensions');
        return;
      }

      // Check dimension limits
      if (metadata.width > FileValidationService.MAX_IMAGE_DIMENSION || metadata.height > FileValidationService.MAX_IMAGE_DIMENSION) {
        result.errors.push(
          `Image dimensions too large (${metadata.width}x${metadata.height}, max ${FileValidationService.MAX_IMAGE_DIMENSION}x${FileValidationService.MAX_IMAGE_DIMENSION})`
        );
        return;
      }

      // Check for minimum dimensions
      if (metadata.width < 1 || metadata.height < 1) {
        result.errors.push('Invalid image dimensions');
        return;
      }

      // Store image metadata
      result.metadata.width = metadata.width;
      result.metadata.height = metadata.height;

      if (metadata.format) {
        result.metadata.mimeType = `image/${metadata.format}`;
      }

    } catch (error) {
      result.errors.push('Invalid image file');
      result.securityFlags.push('corrupted_image');
    }
  }

  private async validatePdfFile(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      const pdfHeader = file.buffer.toString('utf8', 0, 5);
      if (pdfHeader !== '%PDF-') {
        result.errors.push('Invalid PDF file header');
        result.securityFlags.push('corrupted_pdf');
        return;
      }

      // Check for PDF version
      const versionMatch = file.buffer.toString('utf8', 0, 10).match(/%PDF-(\d\.\d)/);
      if (versionMatch) {
        const version = parseFloat(versionMatch[1]);
        if (version > 2.0) {
          result.warnings.push(`PDF version ${version} may not be fully supported`);
        }
      }

    } catch (error) {
      result.errors.push('Unable to validate PDF file');
      result.securityFlags.push('pdf_validation_failed');
    }
  }

  private async validateVideoFile(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    // Basic video validation - would need ffmpeg for more thorough checking
    try {
      // Check for common video file signatures
      const signatures = {
        'mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp box
        'mov': [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // QuickTime
        'avi': [0x52, 0x49, 0x46, 0x46] // RIFF
      };

      let isValidVideo = false;
      for (const [format, signature] of Object.entries(signatures)) {
        if (this.bufferStartsWith(file.buffer, signature)) {
          isValidVideo = true;
          break;
        }
      }

      if (!isValidVideo) {
        result.errors.push('Invalid video file format');
        result.securityFlags.push('corrupted_video');
      }

    } catch (error) {
      result.warnings.push('Unable to fully validate video file');
    }
  }

  private async validateFileSize(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    if (file.size === 0) {
      result.errors.push('File is empty');
      return;
    }

    if (file.size > FileValidationService.MAX_FILE_SIZE) {
      result.errors.push(
        `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(FileValidationService.MAX_FILE_SIZE / 1024 / 1024)}MB`
      );
      return;
    }

    // Check for files that are too small for their declared type
    if (file.mimetype.startsWith('image/') && file.size < 100) {
      result.warnings.push('Image file seems too small');
    }
  }

  private async validateContent(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    try {
      const content = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length));

      // Check for suspicious content
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /eval\(/i,
        /exec\(/i,
        /system\(/i,
        /shell_exec\(/i,
        /passthru\(/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          result.errors.push('Suspicious content detected in file');
          result.securityFlags.push('suspicious_content');
          break;
        }
      }

      // Check for potential injection attempts
      const injectionPatterns = [
        /\.\.\//,
        /\0/,
        /<\?php/i,
        /<%\s*=/i,
        /{{/i,
        /\\x[0-9a-f]{2}/i
      ];

      for (const pattern of injectionPatterns) {
        if (pattern.test(content)) {
          result.warnings.push('Potential injection pattern detected');
          result.securityFlags.push('injection_pattern');
        }
      }

    } catch (error) {
      // Content validation failed, but don't fail the entire upload
      result.warnings.push('Unable to analyze file content');
    }
  }

  private async performSecurityScanning(
    file: Express.Multer.File,
    context: FileSecurityContext,
    result: FileValidationResult
  ): Promise<void> {
    // Check user's quota and permissions
    await this.checkUserQuota(context, result);

    // Check if user has exceeded upload limits
    await this.checkUploadLimits(context, result);

    // Risk assessment
    if (context.riskLevel === 'high') {
      result.warnings.push('High-risk user upload detected');
      result.securityFlags.push('high_risk_user');
    }

    // Generate checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    result.metadata.checksum = checksum;

    // Check for duplicate files (optional - could be expensive)
    // await this.checkDuplicateFile(checksum, context.userId, result);
  }

  private async checkUserQuota(
    context: FileSecurityContext,
    result: FileValidationResult
  ): Promise<void> {
    try {
      // Count files uploaded by user today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filesToday = await prisma.file_attachment.count({
        where: {
          uploadedById: context.userId,
          createdAt: {
            gte: today
          }
        }
      });

      const maxFilesPerDay = this.getUserMaxFilesPerDay(context.userRole);

      if (filesToday >= maxFilesPerDay) {
        result.errors.push(`Daily upload limit exceeded (${maxFilesPerDay} files)`);
        result.securityFlags.push('quota_exceeded');
      }

    } catch (error) {
      logger.warn('Failed to check user quota', {
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkUploadLimits(
    context: FileSecurityContext,
    result: FileValidationResult
  ): Promise<void> {
    // Check for rapid-fire uploads (potential abuse)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const recentUploads = await prisma.file_attachment.count({
        where: {
          uploadedById: context.userId,
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      const maxHourlyUploads = this.getUserMaxHourlyUploads(context.userRole);

      if (recentUploads >= maxHourlyUploads) {
        result.errors.push('Too many uploads in the last hour. Please wait before uploading more.');
        result.securityFlags.push('rate_limit_exceeded');
      }

    } catch (error) {
      logger.warn('Failed to check upload limits', {
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async extractMetadata(
    file: Express.Multer.File,
    result: FileValidationResult
  ): Promise<void> {
    // Extract file extension from original name
    result.metadata.fileExtension = this.getFileExtension(file.originalname);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = result.metadata.fileExtension;
    result.metadata.fileName = `${timestamp}_${random}.${extension}`;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  private categorizeFile(mimeType: string): 'image' | 'video' | 'document' | 'audio' | 'archive' | 'unknown' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'document';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
      return 'document';
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return 'archive';
    }
    return 'unknown';
  }

  private bufferStartsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }

    return true;
  }

  private getUserMaxFilesPerDay(userRole: string): number {
    const limits = {
      'SUPER_ADMIN': 1000,
      'MAINTENANCE_ADMIN': 500,
      'BASMA_ADMIN': 200,
      'TECHNICIAN': 100,
      'CUSTOMER': 50,
      'USER': 25,
      'ADMIN': 200
    };

    return limits[userRole as keyof typeof limits] || 25;
  }

  private getUserMaxHourlyUploads(userRole: string): number {
    const limits = {
      'SUPER_ADMIN': 100,
      'MAINTENANCE_ADMIN': 50,
      'BASMA_ADMIN': 25,
      'TECHNICIAN': 20,
      'CUSTOMER': 10,
      'USER': 5,
      'ADMIN': 25
    };

    return limits[userRole as keyof typeof limits] || 5;
  }

  generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  isFileTypeAllowed(filename: string, mimeType: string): boolean {
    const extension = this.getFileExtension(filename);

    return (
      FileValidationService.ALLOWED_MIME_TYPES.includes(mimeType) &&
      !FileValidationService.BLOCKED_MIME_TYPES.includes(mimeType) &&
      !FileValidationService.DANGEROUS_EXTENSIONS.includes(extension)
    );
  }
}