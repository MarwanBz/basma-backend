import { z } from "zod";

// Mirror Prisma enum values for runtime validation with Zod
const FILE_ENTITY_TYPES = [
  "MAINTENANCE_REQUEST",
  "REQUEST_COMMENT",
  "USER_PROFILE",
  "BUILDING_CONFIG",
] as const;

const FILE_PROCESSING_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "THUMBNAIL_GENERATING",
  "VIRUS_SCANNING",
] as const;

/**
 * Schema for uploading files
 */
export const uploadFileSchema = z.object({
  entityType: z.enum(FILE_ENTITY_TYPES, {
    errorMap: () => ({ message: "Invalid entity type" }),
  }),
  entityId: z.string().uuid("Invalid entity ID"),
  isPublic: z.coerce.boolean().optional().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Schema for getting a file by ID
 */
export const getFileSchema = z.object({
  id: z.string().uuid("Invalid file ID"),
});

/**
 * Schema for deleting a file
 */
export const deleteFileSchema = z.object({
  id: z.string().uuid("Invalid file ID"),
});

/**
 * Schema for getting files by entity
 */
export const getEntityFilesSchema = z.object({
  entityType: z.enum(FILE_ENTITY_TYPES, {
    errorMap: () => ({ message: "Invalid entity type" }),
  }),
  entityId: z.string().uuid("Invalid entity ID"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "fileSize", "originalName"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  processingStatus: z.enum(FILE_PROCESSING_STATUSES).optional(),
  isPublic: z.coerce.boolean().optional(),
  search: z.string().max(255).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Schema for updating file metadata
 */
export const updateFileMetadataSchema = z.object({
  isPublic: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * Schema for searching files
 */
export const searchFilesSchema = z.object({
  query: z.string().min(1).max(255),
  entityType: z.enum(FILE_ENTITY_TYPES).optional(),
  mimeType: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "fileSize", "originalName"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Schema for getting user files
 */
export const getUserFilesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "fileSize", "originalName"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  entityType: z.enum(FILE_ENTITY_TYPES).optional(),
  mimeType: z.string().optional(),
  processingStatus: z.enum(FILE_PROCESSING_STATUSES).optional(),
  search: z.string().max(255).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Schema for download URL generation
 */
export const getDownloadUrlSchema = z.object({
  id: z.string().uuid("Invalid file ID"),
  expiresIn: z.coerce
    .number()
    .int()
    .min(60)
    .max(86400)
    .optional()
    .default(3600),
});

/**
 * Schema for thumbnail URL generation
 */
export const getThumbnailUrlSchema = z.object({
  id: z.string().uuid("Invalid file ID"),
  expiresIn: z.coerce
    .number()
    .int()
    .min(60)
    .max(86400)
    .optional()
    .default(3600),
});

/**
 * Query parameters schema for file listing
 */
export const fileQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "fileSize", "originalName"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().max(255).optional(),
  mimeType: z.string().optional(),
  processingStatus: z.enum(FILE_PROCESSING_STATUSES).optional(),
  isPublic: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  entityType: z.enum(FILE_ENTITY_TYPES).optional(),
});

/**
 * Schema for bulk file operations
 */
export const bulkFileOperationSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50), // Max 50 files per operation
  operation: z.enum(["delete", "makePublic", "makePrivate"]),
});

/**
 * Schema for file analytics
 */
export const fileAnalyticsSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
});

// Export all schemas for use in routes
export const fileValidators = {
  uploadFileSchema,
  getFileSchema,
  deleteFileSchema,
  getEntityFilesSchema,
  updateFileMetadataSchema,
  searchFilesSchema,
  getUserFilesSchema,
  getDownloadUrlSchema,
  getThumbnailUrlSchema,
  fileQuerySchema,
  bulkFileOperationSchema,
  fileAnalyticsSchema,
};
