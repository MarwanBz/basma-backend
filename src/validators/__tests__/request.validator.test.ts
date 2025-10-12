import {
  addCommentSchema,
  assignRequestSchema,
  createRequestSchema,
  deleteRequestSchema,
  getRequestByIdSchema,
  getRequestsQuerySchema,
  selfAssignRequestSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
} from '../request.validator';
import { describe, expect, it } from 'vitest';

describe('Request Validator Schemas', () => {
  describe('createRequestSchema', () => {
    it('should validate a valid create request', () => {
      const validRequest = {
        body: {
          title: 'Fix broken door',
          description: 'The main entrance door is not closing properly',
          priority: 'MEDIUM',
          categoryId: 1,
          location: 'Main Entrance',
          building: 'Building A',
          specificLocation: 'Ground Floor',
          estimatedCost: 150.50,
        },
      };

      const result = createRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority', () => {
      const invalidRequest = {
        body: {
          title: 'Fix broken door',
          description: 'The main entrance door is not closing properly',
          priority: 'INVALID_PRIORITY',
          categoryId: 1,
          location: 'Main Entrance',
        },
      };

      const result = createRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        body: {
          title: 'Fix broken door',
          // missing description, categoryId, location
        },
      };

      const result = createRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('updateRequestStatusSchema', () => {
    it('should validate a valid status update', () => {
      const validUpdate = {
        body: {
          status: 'IN_PROGRESS',
          reason: 'Technician started working on the issue',
        },
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = updateRequestStatusSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidUpdate = {
        body: {
          status: 'INVALID_STATUS',
        },
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = updateRequestStatusSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('assignRequestSchema', () => {
    it('should validate a valid assignment', () => {
      const validAssignment = {
        body: {
          assignedToId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'Assigned to experienced technician',
        },
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = assignRequestSchema.safeParse(validAssignment);
      expect(result.success).toBe(true);
    });
  });

  describe('getRequestsQuerySchema', () => {
    it('should validate query parameters with defaults', () => {
      const validQuery = {
        query: {
          status: 'SUBMITTED',
          priority: 'HIGH',
          page: '2',
          limit: '10',
        },
      };

      const result = getRequestsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.query.page).toBe(2);
        expect(result.data.query.limit).toBe(10);
      }
    });

    it('should apply default values for missing query params', () => {
      const minimalQuery = {
        query: {},
      };

      const result = getRequestsQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
        expect(result.data.query.sortBy).toBe('createdAt');
        expect(result.data.query.sortOrder).toBe('desc');
      }
    });
  });

  describe('addCommentSchema', () => {
    it('should validate a valid comment', () => {
      const validComment = {
        body: {
          text: 'This is a test comment',
          isInternal: true,
        },
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = addCommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should default isInternal to false', () => {
      const commentWithoutInternal = {
        body: {
          text: 'This is a test comment',
        },
        params: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = addCommentSchema.safeParse(commentWithoutInternal);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.body.isInternal).toBe(false);
      }
    });
  });
});
