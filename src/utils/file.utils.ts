import crypto from 'crypto';
import { file_entity_type } from '@prisma/client';

/**
 * File utility functions for storage service
 */

/**
 * Generate a unique file key for S3 storage
 * Format: {entityType}/{entityId}/{timestamp}-{random}_{sanitizedFilename}
 */
export function generateFileKey(
  entityType: file_entity_type,
  entityId: string,
  filename: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = crypto.randomBytes(8).toString('hex');
  const sanitized = sanitizeFilename(filename);
  
  return `${entityType}/${entityId}/${timestamp}-${random}_${sanitized}`;
}

/**
 * Sanitize filename by removing/replacing unsafe characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove or replace unsafe characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  sanitized = sanitized.replace(/\//g, '-');
  sanitized = sanitized.replace(/\\/g, '-');
  sanitized = sanitized.replace(/\s+/g, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
  
  // Limit length
  if (sanitized.length > 200) {
    const ext = extractFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 200 - ext.length - 1) + '.' + ext;
  }
  
  return sanitized;
}

/**
 * Calculate checksum (hash) for a buffer
 */
export function calculateChecksum(
  buffer: Buffer,
  algorithm: 'md5' | 'sha256' = 'sha256'
): string {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

/**
 * Extract file extension from filename
 */
export function extractFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is an image based on MIME type
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a PDF based on MIME type
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Check if file is a video based on MIME type
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if file is audio based on MIME type
 */
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if file is a document based on MIME type
 */
export function isDocumentFile(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];
  
  return documentTypes.includes(mimeType);
}

/**
 * Validate entity type against allowed enum values
 */
export function validateEntityType(entityType: string): entityType is file_entity_type {
  const validTypes: file_entity_type[] = [
    'MAINTENANCE_REQUEST',
    'REQUEST_COMMENT',
    'USER_PROFILE',
    'BUILDING_CONFIG',
  ];
  
  return validTypes.includes(entityType as file_entity_type);
}

/**
 * Get file category from MIME type
 */
export function getFileCategory(
  mimeType: string
): 'image' | 'video' | 'document' | 'audio' | 'archive' | 'unknown' {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  if (isDocumentFile(mimeType)) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'unknown';
}

