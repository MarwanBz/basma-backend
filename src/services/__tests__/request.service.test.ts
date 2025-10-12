import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import { RequestService } from "../request.service";

// Mock Prisma
const mockPrisma = {
  maintenance_request: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  request_comment: {
    create: vi.fn(),
  },
  request_status_history: {
    create: vi.fn(),
  },
  request_assignment_history: {
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

// Mock the database module
vi.mock("@/config/database", () => ({
  default: mockPrisma,
}));

describe("RequestService", () => {
  let requestService: RequestService;

  beforeEach(() => {
    requestService = new RequestService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createRequest", () => {
    it("should create a new maintenance request successfully", async () => {
      const requestData = {
        title: "Fix broken door",
        description: "The main entrance door is not closing properly",
        priority: "MEDIUM" as const,
        categoryId: 1,
        location: "Main Entrance",
        building: "Building A",
        specificLocation: "Ground Floor",
        estimatedCost: 150.5,
      };

      const userId = "user-123";
      const mockRequest = {
        id: "request-123",
        ...requestData,
        status: "SUBMITTED",
        requestedById: userId,
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: userId,
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        assignedTo: null,
      };

      mockPrisma.maintenance_request.create.mockResolvedValue(mockRequest);
      mockPrisma.request_status_history.create.mockResolvedValue({});

      const result = await requestService.createRequest(requestData, userId);

      expect(mockPrisma.maintenance_request.create).toHaveBeenCalledWith({
        data: {
          ...requestData,
          requestedById: userId,
          status: "SUBMITTED",
          scheduledDate: null,
        },
        include: expect.any(Object),
      });

      expect(mockPrisma.request_status_history.create).toHaveBeenCalledWith({
        data: {
          fromStatus: null,
          toStatus: "SUBMITTED",
          reason: "Request created",
          changedById: userId,
          requestId: "request-123",
        },
      });

      expect(result).toEqual(mockRequest);
    });

    it("should handle foreign key constraint errors", async () => {
      const requestData = {
        title: "Fix broken door",
        description: "The main entrance door is not closing properly",
        priority: "MEDIUM" as const,
        categoryId: 999, // Invalid category
        location: "Main Entrance",
      };

      const userId = "user-123";

      mockPrisma.maintenance_request.create.mockRejectedValue(
        new Error("Foreign key constraint failed")
      );

      await expect(
        requestService.createRequest(requestData, userId)
      ).rejects.toThrow(AppError);
    });
  });

  describe("getRequests", () => {
    it("should return requests with pagination for SUPER_ADMIN", async () => {
      const filters = {
        page: 1,
        limit: 10,
        sortBy: "createdAt" as const,
        sortOrder: "desc" as const,
      };

      const mockRequests = [
        {
          id: "request-1",
          title: "Fix door",
          status: "SUBMITTED",
          priority: "MEDIUM",
        },
      ];

      mockPrisma.maintenance_request.findMany.mockResolvedValue(mockRequests);
      mockPrisma.maintenance_request.count.mockResolvedValue(1);

      const result = await requestService.getRequests(filters, "SUPER_ADMIN");

      expect(result).toEqual({
        requests: mockRequests,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it("should filter requests by user for CUSTOMER role", async () => {
      const filters = {
        page: 1,
        limit: 10,
        sortBy: "createdAt" as const,
        sortOrder: "desc" as const,
      };

      const userId = "user-123";
      const mockRequests = [];

      mockPrisma.maintenance_request.findMany.mockResolvedValue(mockRequests);
      mockPrisma.maintenance_request.count.mockResolvedValue(0);

      await requestService.getRequests(filters, "CUSTOMER", userId);

      expect(mockPrisma.maintenance_request.findMany).toHaveBeenCalledWith({
        where: {
          requestedById: userId,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: expect.any(Object),
      });
    });

    it("should apply search filters correctly", async () => {
      const filters = {
        page: 1,
        limit: 10,
        sortBy: "createdAt" as const,
        sortOrder: "desc" as const,
        status: "SUBMITTED" as const,
        priority: "HIGH" as const,
        search: "door",
      };

      mockPrisma.maintenance_request.findMany.mockResolvedValue([]);
      mockPrisma.maintenance_request.count.mockResolvedValue(0);

      await requestService.getRequests(filters, "SUPER_ADMIN");

      expect(mockPrisma.maintenance_request.findMany).toHaveBeenCalledWith({
        where: {
          status: "SUBMITTED",
          priority: "HIGH",
          OR: [
            { title: { contains: "door", mode: "insensitive" } },
            { description: { contains: "door", mode: "insensitive" } },
            { location: { contains: "door", mode: "insensitive" } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: expect.any(Object),
      });
    });
  });

  describe("getRequestById", () => {
    it("should return request with full details", async () => {
      const requestId = "request-123";
      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-123",
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);

      const result = await requestService.getRequestById(
        requestId,
        "SUPER_ADMIN"
      );

      expect(result).toEqual(mockRequest);
      expect(mockPrisma.maintenance_request.findUnique).toHaveBeenCalledWith({
        where: { id: requestId },
        include: expect.any(Object),
      });
    });

    it("should throw error if request not found", async () => {
      const requestId = "request-123";

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(null);

      await expect(
        requestService.getRequestById(requestId, "SUPER_ADMIN")
      ).rejects.toThrow(AppError);
    });

    it("should deny access for CUSTOMER trying to view another user's request", async () => {
      const requestId = "request-123";
      const userId = "user-456";
      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-123", // Different user
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        requestService.getRequestById(requestId, "CUSTOMER", userId)
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateRequest", () => {
    it("should update request successfully", async () => {
      const requestId = "request-123";
      const updateData = {
        title: "Updated title",
        description: "Updated description",
      };

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-123",
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      const updatedRequest = {
        ...mockRequest,
        ...updateData,
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.maintenance_request.update.mockResolvedValue(updatedRequest);

      const result = await requestService.updateRequest(
        requestId,
        updateData,
        "SUPER_ADMIN"
      );

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.maintenance_request.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: updateData,
        include: expect.any(Object),
      });
    });
  });

  describe("deleteRequest", () => {
    it("should delete request successfully for SUPER_ADMIN", async () => {
      const requestId = "request-123";
      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-123",
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.maintenance_request.delete.mockResolvedValue({});

      const result = await requestService.deleteRequest(
        requestId,
        "SUPER_ADMIN"
      );

      expect(result).toEqual({ message: "Request deleted successfully" });
      expect(mockPrisma.maintenance_request.delete).toHaveBeenCalledWith({
        where: { id: requestId },
      });
    });

    it("should deny deletion for unauthorized users", async () => {
      const requestId = "request-123";
      const userId = "user-456";
      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-123", // Different user
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        requestService.deleteRequest(requestId, "CUSTOMER", userId)
      ).rejects.toThrow(AppError);
    });
  });

  describe("addComment", () => {
    it("should add comment successfully", async () => {
      const requestId = "request-123";
      const commentData = {
        text: "This is a test comment",
        isInternal: false,
      };
      const userId = "user-123";

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: userId,
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: userId,
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      const mockComment = {
        id: "comment-123",
        ...commentData,
        userId,
        requestId,
        user: {
          id: userId,
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.request_comment.create.mockResolvedValue(mockComment);

      const result = await requestService.addComment(
        requestId,
        commentData,
        userId,
        "CUSTOMER"
      );

      expect(result).toEqual(mockComment);
      expect(mockPrisma.request_comment.create).toHaveBeenCalledWith({
        data: {
          ...commentData,
          userId,
          requestId,
        },
        include: expect.any(Object),
      });
    });
  });

  describe("updateRequestStatus", () => {
    it("should update status successfully", async () => {
      const requestId = "request-123";
      const statusData = {
        status: "IN_PROGRESS" as const,
        reason: "Technician started working",
      };
      const userId = "user-123";

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "ASSIGNED",
        requestedById: "user-456",
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-456",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      const updatedRequest = {
        ...mockRequest,
        status: "IN_PROGRESS",
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.maintenance_request.update.mockResolvedValue(updatedRequest);
      mockPrisma.request_status_history.create.mockResolvedValue({});

      const result = await requestService.updateRequestStatus(
        requestId,
        statusData,
        userId,
        "TECHNICIAN"
      );

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.request_status_history.create).toHaveBeenCalledWith({
        data: {
          fromStatus: "ASSIGNED",
          toStatus: "IN_PROGRESS",
          reason: "Technician started working",
          changedById: userId,
          requestId,
        },
      });
    });

    it("should throw error for invalid status transition", async () => {
      const requestId = "request-123";
      const statusData = {
        status: "COMPLETED" as const,
        reason: "Invalid transition",
      };
      const userId = "user-123";

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED", // Cannot go directly to COMPLETED
        requestedById: "user-456",
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-456",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        requestService.updateRequestStatus(
          requestId,
          statusData,
          userId,
          "TECHNICIAN"
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("assignRequest", () => {
    it("should assign request successfully", async () => {
      const requestId = "request-123";
      const assignData = {
        assignedToId: "tech-123",
        reason: "Assigned to experienced technician",
      };
      const assignedById = "admin-123";

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-456",
        assignedToId: null,
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-456",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      const mockTechnician = {
        id: "tech-123",
        role: "TECHNICIAN",
      };

      const updatedRequest = {
        ...mockRequest,
        assignedToId: "tech-123",
        assignedById,
        status: "ASSIGNED",
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.user.findUnique.mockResolvedValue(mockTechnician);
      mockPrisma.maintenance_request.update.mockResolvedValue(updatedRequest);
      mockPrisma.request_assignment_history.create.mockResolvedValue({});
      mockPrisma.request_status_history.create.mockResolvedValue({});

      const result = await requestService.assignRequest(
        requestId,
        assignData,
        assignedById,
        "SUPER_ADMIN"
      );

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.request_assignment_history.create).toHaveBeenCalledWith(
        {
          data: {
            fromTechnicianId: null,
            toTechnicianId: "tech-123",
            assignmentType: "INITIAL_ASSIGNMENT",
            reason: "Assigned to experienced technician",
            assignedById,
            requestId,
          },
        }
      );
    });

    it("should deny assignment for non-admin users", async () => {
      const requestId = "request-123";
      const assignData = {
        assignedToId: "tech-123",
        reason: "Assigned to experienced technician",
      };
      const assignedById = "user-123";

      await expect(
        requestService.assignRequest(
          requestId,
          assignData,
          assignedById,
          "CUSTOMER"
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("selfAssignRequest", () => {
    it("should self-assign request successfully", async () => {
      const requestId = "request-123";
      const technicianId = "tech-123";

      const mockRequest = {
        id: requestId,
        title: "Fix door",
        status: "SUBMITTED",
        requestedById: "user-456",
        assignedToId: null,
        category: { id: 1, name: "Structural" },
        requestedBy: {
          id: "user-456",
          name: "John Doe",
          email: "john@example.com",
          role: "CUSTOMER",
        },
        comments: [],
        statusHistory: [],
        assignmentHistory: [],
      };

      const updatedRequest = {
        ...mockRequest,
        assignedToId: technicianId,
        assignedById: technicianId,
        status: "ASSIGNED",
      };

      mockPrisma.maintenance_request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.maintenance_request.update.mockResolvedValue(updatedRequest);
      mockPrisma.request_assignment_history.create.mockResolvedValue({});

      const result = await requestService.selfAssignRequest(
        requestId,
        technicianId,
        "TECHNICIAN"
      );

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.request_assignment_history.create).toHaveBeenCalledWith(
        {
          data: {
            fromTechnicianId: null,
            toTechnicianId: technicianId,
            assignmentType: "SELF_ASSIGNMENT",
            reason: "Self-assigned by technician",
            assignedById: technicianId,
            requestId,
          },
        }
      );
    });

    it("should deny self-assignment for non-technician users", async () => {
      const requestId = "request-123";
      const userId = "user-123";

      await expect(
        requestService.selfAssignRequest(requestId, userId, "CUSTOMER")
      ).rejects.toThrow(AppError);
    });
  });
});
