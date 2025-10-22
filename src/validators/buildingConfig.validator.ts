import { z } from "zod";

// Create Building Config Schema
export const createBuildingConfigSchema = z.object({
  body: z.object({
    buildingName: z.string().min(1).max(100).trim(),
    buildingCode: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, "Only letters and numbers allowed").optional(),
    displayName: z.string().min(2).max(100).trim().optional(),
    allowCustomId: z.boolean().default(false),
  }),
});

// Update Building Config Schema
export const updateBuildingConfigSchema = z.object({
  body: z.object({
    buildingCode: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, "Only letters and numbers allowed").optional(),
    displayName: z.string().min(2).max(100).trim().optional(),
    allowCustomId: z.boolean().optional(),
    isActive: z.boolean().optional(),
    resetSequence: z.boolean().default(false),
  }),
  params: z.object({
    buildingName: z.string().min(1).max(100).trim(),
  }),
});

// Get Building Config Schema
export const getBuildingConfigSchema = z.object({
  params: z.object({
    buildingName: z.string().min(1).max(100).trim(),
  }),
});

// Delete Building Config Schema
export const deleteBuildingConfigSchema = z.object({
  params: z.object({
    buildingName: z.string().min(1).max(100).trim(),
  }),
});

// Get Next Identifier Schema
export const getNextIdentifierSchema = z.object({
  params: z.object({
    buildingName: z.string().min(1).max(100).trim(),
  }),
});

// Reset Building Sequence Schema
export const resetBuildingSequenceSchema = z.object({
  params: z.object({
    buildingName: z.string().min(1).max(100).trim(),
  }),
});

// Type exports
export type CreateBuildingConfigInput = z.infer<typeof createBuildingConfigSchema>;
export type UpdateBuildingConfigInput = z.infer<typeof updateBuildingConfigSchema>;
export type GetBuildingConfigInput = z.infer<typeof getBuildingConfigSchema>;
export type DeleteBuildingConfigInput = z.infer<typeof deleteBuildingConfigSchema>;
export type GetNextIdentifierInput = z.infer<typeof getNextIdentifierSchema>;
export type ResetBuildingSequenceInput = z.infer<typeof resetBuildingSequenceSchema>;