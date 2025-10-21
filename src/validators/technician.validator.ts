import { z } from "zod";

// Get Technicians Query Schema
export const getTechniciansQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
});

// Validate query parameters for GET /technicians
export const validateGetTechniciansQuery = (query: any) => {
  const result = getTechniciansQuerySchema.safeParse(query);
  
  if (!result.success) {
    throw new Error("Invalid query parameters");
  }
  
  // Additional validation for reasonable limits
  if (result.data.page < 1) {
    throw new Error("Page must be greater than 0");
  }
  
  if (result.data.limit < 1 || result.data.limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }
  
  return result.data;
};
