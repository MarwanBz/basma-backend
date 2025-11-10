import { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/utils/appError";
import { RequestController } from "../request.controller";
import { RequestService } from "@/services/request.service";

// Mock the RequestService
const mockRequestService = {
  createRequest: vi.fn(),
  getRequests: vi.fn(),
  getRequestById: vi.fn(),
  updateRequest: vi.fn(),
  deleteRequest: vi.fn(),
  addComment: vi.fn(),
  updateRequestStatus: vi.fn(),
  assignRequest: vi.fn(),
  selfAssignRequest: vi.fn(),
};

// Mock the RequestService constructor
vi.mock("@/services/request.service", () => ({
  RequestService: vi.fn().mockImplementation(() => mockRequestService),
}));

describe("RequestController", () => {
  let requestController: RequestController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    requestController = new RequestController(mockRequestService as any);
    mockNext = vi.fn() as any;
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("create", () => {
    it("should create a request successfully", async () => {
      const requestData = {
        title: "Fix door",
        description: "The door is broken",
        categoryId: 1,
        location: "Main entrance",
      };

      const mockUser = {
        userId: "user-123",
        role: "CUSTOMER",
      };

      const mockRequest = {
        id: "request-123",
        ...requestData,
        status: "SUBMITTED",
      };

      mockReq = {
        body: requestData,
        user: mockUser,
      };

      mockRequestService.createRequest.mockResolvedValue(mockRequest);

      await requestController.create(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.createRequest).toHaveBeenCalledWith(
        requestData,
        "user-123"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });

    it("should throw error when user is not authenticated", async () => {
      mockReq = {
        body: { title: "Test" },
        user: undefined,
      };

      await requestController.create(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not authenticated",
          statusCode: 401,
        })
      );
    });
  });

  describe("getAll", () => {
    it("should get requests with filters", async () => {
      const mockUser = {
        userId: "user-123",
        role: "SUPER_ADMIN",
      };

      const mockRequests = {
        requests: [
          {
            id: "request-1",
            title: "Fix door",
            status: "SUBMITTED",
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockReq = {
        query: {
          page: "1",
          limit: "10",
          status: "SUBMITTED",
        },
        user: mockUser,
      };

      mockRequestService.getRequests.mockResolvedValue(mockRequests);

      await requestController.getAll(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          status: "SUBMITTED",
        }),
        "SUPER_ADMIN",
        "user-123"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequests,
      });
    });

    it("should throw error when user is not authenticated", async () => {
      mockReq = {
        query: {},
        user: undefined,
      };

      await requestController.getAll(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not authenticated",
          statusCode: 401,
        })
      );
    });
  });

  describe("getById", () => {
    it("should get request by ID", async () => {
      const mockUser = {
        userId: "user-123",
        role: "SUPER_ADMIN",
      };

      const mockRequest = {
        id: "request-123",
        title: "Fix door",
        status: "SUBMITTED",
      };

      mockReq = {
        params: { id: "request-123" },
        user: mockUser,
      };

      mockRequestService.getRequestById.mockResolvedValue(mockRequest);

      await requestController.getById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.getRequestById).toHaveBeenCalledWith(
        "request-123",
        "SUPER_ADMIN",
        "user-123"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });
  });

  describe("update", () => {
    it("should update request", async () => {
      const mockUser = {
        userId: "user-123",
        role: "SUPER_ADMIN",
      };

      const updateData = {
        title: "Updated title",
        description: "Updated description",
      };

      const mockRequest = {
        id: "request-123",
        ...updateData,
      };

      mockReq = {
        params: { id: "request-123" },
        body: updateData,
        user: mockUser,
      };

      mockRequestService.updateRequest.mockResolvedValue(mockRequest);

      await requestController.update(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.updateRequest).toHaveBeenCalledWith(
        "request-123",
        updateData,
        "SUPER_ADMIN",
        "user-123"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });
  });

  describe("delete", () => {
    it("should delete request", async () => {
      const mockUser = {
        userId: "user-123",
        role: "SUPER_ADMIN",
      };

      const mockResult = { message: "Request deleted successfully" };

      mockReq = {
        params: { id: "request-123" },
        user: mockUser,
      };

      mockRequestService.deleteRequest.mockResolvedValue(mockResult);

      await requestController.delete(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.deleteRequest).toHaveBeenCalledWith(
        "request-123",
        "SUPER_ADMIN",
        "user-123"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockResult,
      });
    });
  });

  describe("addComment", () => {
    it("should add comment to request", async () => {
      const mockUser = {
        userId: "user-123",
        role: "CUSTOMER",
      };

      const commentData = {
        text: "This is a comment",
        isInternal: false,
      };

      const mockComment = {
        id: "comment-123",
        ...commentData,
        userId: "user-123",
        requestId: "request-123",
      };

      mockReq = {
        params: { id: "request-123" },
        body: commentData,
        user: mockUser,
      };

      mockRequestService.addComment.mockResolvedValue(mockComment);

      await requestController.addComment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.addComment).toHaveBeenCalledWith(
        "request-123",
        commentData,
        "user-123",
        "CUSTOMER"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockComment,
      });
    });
  });

  describe("updateStatus", () => {
    it("should update request status", async () => {
      const mockUser = {
        userId: "user-123",
        role: "TECHNICIAN",
      };

      const statusData = {
        status: "IN_PROGRESS",
        reason: "Started working on the request",
      };

      const mockRequest = {
        id: "request-123",
        status: "IN_PROGRESS",
      };

      mockReq = {
        params: { id: "request-123" },
        body: statusData,
        user: mockUser,
      };

      mockRequestService.updateRequestStatus.mockResolvedValue(mockRequest);

      await requestController.updateStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.updateRequestStatus).toHaveBeenCalledWith(
        "request-123",
        statusData,
        "user-123",
        "TECHNICIAN"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });
  });

  describe("assign", () => {
    it("should assign request to technician", async () => {
      const mockUser = {
        userId: "admin-123",
        role: "SUPER_ADMIN",
      };

      const assignData = {
        assignedToId: "tech-123",
        reason: "Assigned to experienced technician",
      };

      const mockRequest = {
        id: "request-123",
        assignedToId: "tech-123",
        status: "ASSIGNED",
      };

      mockReq = {
        params: { id: "request-123" },
        body: assignData,
        user: mockUser,
      };

      mockRequestService.assignRequest.mockResolvedValue(mockRequest);

      await requestController.assign(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.assignRequest).toHaveBeenCalledWith(
        "request-123",
        assignData,
        "admin-123",
        "SUPER_ADMIN"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });
  });

  describe("selfAssign", () => {
    it("should self-assign request", async () => {
      const mockUser = {
        userId: "tech-123",
        role: "TECHNICIAN",
      };

      const mockRequest = {
        id: "request-123",
        assignedToId: "tech-123",
        status: "ASSIGNED",
      };

      mockReq = {
        params: { id: "request-123" },
        user: mockUser,
      };

      mockRequestService.selfAssignRequest.mockResolvedValue(mockRequest);

      await requestController.selfAssign(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRequestService.selfAssignRequest).toHaveBeenCalledWith(
        "request-123",
        "tech-123",
        "TECHNICIAN"
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: mockRequest,
      });
    });
  });
});
