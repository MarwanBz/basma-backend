import { z } from "zod";

// Request Priority enum validation
const requestPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Request Status enum validation
const requestStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CUSTOMER_REJECTED",
  "CLOSED",
  "REJECTED",
]);

// Confirmation status enum validation
const confirmationStatusSchema = z.enum(["PENDING", "CONFIRMED", "REJECTED"]);

// Assignment Type enum validation
const assignmentTypeSchema = z.enum([
  "INITIAL_ASSIGNMENT",
  "REASSIGNMENT",
  "SELF_ASSIGNMENT",
  "UNASSIGNMENT",
]);

// Create Request Schema
export const createRequestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).trim(),
    description: z.string().min(10).max(5000).trim(),
    priority: requestPrioritySchema.default("MEDIUM"),
    categoryId: z.number().int().positive(),
    location: z.string().min(2).max(100).trim(),
    building: z.string().min(1).max(100).trim().optional(), // Optional for identifier generation
    specificLocation: z.string().min(2).max(200).trim().optional(),
    estimatedCost: z.number().positive().optional(),
    scheduledDate: z.string().datetime().optional(),
    customIdentifier: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[A-Z0-9-]+$/i, "Only letters, numbers, and hyphens allowed")
      .optional(), // Admin only
    attachmentIds: z.array(z.string().uuid()).optional(), // Optional file attachment IDs
  }),
});

// Update Request Schema (for general updates)
export const updateRequestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).trim().optional(),
    description: z.string().min(10).max(5000).trim().optional(),
    priority: requestPrioritySchema.optional(),
    categoryId: z.number().int().positive().optional(),
    location: z.string().min(2).max(100).trim().optional(),
    building: z.string().min(2).max(100).trim().optional(),
    specificLocation: z.string().min(2).max(200).trim().optional(),
    estimatedCost: z.number().positive().optional(),
    actualCost: z.number().positive().optional(),
    scheduledDate: z.string().datetime().optional(),
    completedDate: z.string().datetime().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Update Request Status Schema (for status changes)
export const updateRequestStatusSchema = z.object({
  body: z.object({
    status: requestStatusSchema,
    reason: z.string().max(500).trim().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Assign Request Schema (for manual assignment by admins)
export const assignRequestSchema = z.object({
  body: z.object({
    assignedToId: z.string().uuid(),
    reason: z.string().max(500).trim().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Self Assign Request Schema (for technicians)
export const selfAssignRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Add Comment Schema
export const addCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(2000).trim(),
    isInternal: z.boolean().default(false),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Get Requests Query Schema (for filtering, pagination, etc.)
export const getRequestsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
    status: requestStatusSchema.optional(),
    priority: requestPrioritySchema.optional(),
    categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
    assignedToId: z.string().uuid().optional(),
    requestedById: z.string().uuid().optional(),
    building: z.string().trim().optional(),
    search: z.string().trim().optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "priority", "status", "title"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
});

// Get Request by ID Schema
export const getRequestByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Delete Request Schema
export const deleteRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Customer confirm completion schema
export const confirmCompletionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    comment: z.string().max(2000).trim().optional(),
  }),
});

// Customer reject completion schema
export const rejectCompletionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(3).max(2000).trim(),
    comment: z.string().max(2000).trim().optional(),
  }),
});

// Get confirmation status schema
export const getConfirmationStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Type exports for use in controllers
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type UpdateRequestStatusInput = z.infer<
  typeof updateRequestStatusSchema
>;
export type AssignRequestInput = z.infer<typeof assignRequestSchema>;
export type SelfAssignRequestInput = z.infer<typeof selfAssignRequestSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type GetRequestsQueryInput = z.infer<typeof getRequestsQuerySchema>;
export type GetRequestByIdInput = z.infer<typeof getRequestByIdSchema>;
export type DeleteRequestInput = z.infer<typeof deleteRequestSchema>;
export type ConfirmCompletionInput = z.infer<typeof confirmCompletionSchema>;
export type RejectCompletionInput = z.infer<typeof rejectCompletionSchema>;
export type GetConfirmationStatusInput = z.infer<
  typeof getConfirmationStatusSchema
>;
