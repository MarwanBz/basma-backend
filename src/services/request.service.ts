import {
  AddCommentInput,
  AssignRequestInput,
  CreateRequestInput,
  GetRequestsQueryInput,
  SelfAssignRequestInput,
  UpdateRequestInput,
  UpdateRequestStatusInput,
} from "@/validators/request.validator";

import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import { RequestIdentifierService } from "./requestIdentifier.service";
import { notificationService } from "./notification.service";
import prisma from "@/config/database";

export class RequestService {
  private identifierService: RequestIdentifierService;

  constructor() {
    this.identifierService = new RequestIdentifierService();
  }

  /**
   * Create a new maintenance request
   */
  async createRequest(data: CreateRequestInput["body"], userId: string) {
    try {
      // Validate building is provided
      if (!data.building) {
        throw new AppError(
          "Building is required for creating a maintenance request",
          400,
          ErrorCode.INVALID_INPUT
        );
      }

      // Generate custom identifier
      const customIdentifier = await this.identifierService.generateIdentifier(
        data.building,
        data.customIdentifier, // Allow admin to provide custom identifier
        userId
      );

      const request = await prisma.maintenance_request.create({
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          categoryId: data.categoryId,
          location: data.location,
          building: data.building,
          specificLocation: data.specificLocation,
          estimatedCost: data.estimatedCost,
          scheduledDate: data.scheduledDate
            ? new Date(data.scheduledDate)
            : null,
          requestedById: userId,
          customIdentifier,
          status: "SUBMITTED", // Default status for new requests
        },
        include: {
          category: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Create initial status history entry
      await prisma.request_status_history.create({
        data: {
          fromStatus: null,
          toStatus: "SUBMITTED",
          reason: "Request created",
          changedById: userId,
          requestId: request.id,
        },
      });

      // Send FCM notification to maintenance admins about new request
      notificationService
        .notifyNewRequest(
          request.id,
          request.title,
          request.priority,
          request.building || undefined
        )
        .catch((error) => {
          // Log error but don't fail the request
          console.error("Failed to send new request notification:", error);
        });

      return request;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Foreign key constraint")
      ) {
        throw new AppError(
          "Invalid category or user",
          400,
          ErrorCode.INVALID_INPUT
        );
      }
      throw error;
    }
  }

  /**
   * Get requests with filtering, pagination, and search
   */
  async getRequests(
    filters: GetRequestsQueryInput["query"],
    userRole: string,
    userId?: string
  ) {
    const { page, limit, sortBy, sortOrder, ...queryFilters } = filters;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: any = {};

    // Role-based filtering
    if (userRole === "CUSTOMER" && userId) {
      where.requestedById = userId;
    }

    // Apply query filters
    if (queryFilters.status) {
      where.status = queryFilters.status;
    }
    if (queryFilters.priority) {
      where.priority = queryFilters.priority;
    }
    if (queryFilters.categoryId) {
      where.categoryId = queryFilters.categoryId;
    }
    if (queryFilters.assignedToId) {
      where.assignedToId = queryFilters.assignedToId;
    }
    if (queryFilters.requestedById) {
      where.requestedById = queryFilters.requestedById;
    }
    if (queryFilters.building) {
      where.building = {
        contains: queryFilters.building,
        mode: "insensitive",
      };
    }
    if (queryFilters.search) {
      where.OR = [
        { title: { contains: queryFilters.search, mode: "insensitive" } },
        { description: { contains: queryFilters.search, mode: "insensitive" } },
        { location: { contains: queryFilters.search, mode: "insensitive" } },
        {
          customIdentifier: {
            contains: queryFilters.search,
            mode: "insensitive",
          },
        },
      ];
    }
    if (queryFilters.dateFrom || queryFilters.dateTo) {
      where.createdAt = {};
      if (queryFilters.dateFrom) {
        where.createdAt.gte = new Date(queryFilters.dateFrom);
      }
      if (queryFilters.dateTo) {
        where.createdAt.lte = new Date(queryFilters.dateTo);
      }
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [requests, total] = await Promise.all([
      prisma.maintenance_request.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      prisma.maintenance_request.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single request by ID
   */
  async getRequestById(id: string, userRole: string, userId?: string) {
    const request = await prisma.maintenance_request.findUnique({
      where: { id },
      include: {
        category: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        assignmentHistory: {
          include: {
            assignedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            fromTechnician: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            toTechnician: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!request) {
      throw new AppError("Request not found", 404, ErrorCode.NOT_FOUND);
    }

    // Role-based access control
    if (userRole === "CUSTOMER" && request.requestedById !== userId) {
      throw new AppError("Access denied", 403, ErrorCode.FORBIDDEN);
    }

    return request;
  }

  /**
   * Update a maintenance request
   */
  async updateRequest(
    id: string,
    data: UpdateRequestInput["body"],
    userRole: string,
    userId?: string
  ) {
    // Check if request exists and user has permission
    const existingRequest = await this.getRequestById(id, userRole, userId);

    // Role-based update restrictions
    if (userRole === "CUSTOMER" && existingRequest.requestedById !== userId) {
      throw new AppError("Access denied", 403, ErrorCode.FORBIDDEN);
    }

    // Prepare update data
    const updateData: any = { ...data };
    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.completedDate) {
      updateData.completedDate = new Date(data.completedDate);
    }

    const request = await prisma.maintenance_request.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return request;
  }

  /**
   * Delete a maintenance request
   */
  async deleteRequest(id: string, userRole: string, userId?: string) {
    // Check if request exists and user has permission
    const existingRequest = await this.getRequestById(id, userRole, userId);

    // Only SUPER_ADMIN and the request creator can delete
    if (
      userRole !== "SUPER_ADMIN" &&
      existingRequest.requestedById !== userId
    ) {
      throw new AppError("Access denied", 403, ErrorCode.FORBIDDEN);
    }

    await prisma.maintenance_request.delete({
      where: { id },
    });

    return { message: "Request deleted successfully" };
  }

  /**
   * Add a comment to a request
   */
  async addComment(
    requestId: string,
    data: AddCommentInput["body"],
    userId: string,
    userRole: string
  ) {
    // Check if request exists and user has permission
    const request = await this.getRequestById(requestId, userRole, userId);

    const comment = await prisma.request_comment.create({
      data: {
        text: data.text,
        isInternal: data.isInternal,
        userId,
        requestId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Send FCM notification for new comment (skip for internal comments)
    if (!data.isInternal) {
      notificationService
        .notifyNewComment(
          requestId,
          request.title,
          comment.user.name,
          comment.text,
          request.requestedById,
          request.assignedToId || undefined,
          userId
        )
        .catch((error) => {
          // Log error but don't fail the request
          console.error("Failed to send comment notification:", error);
        });
    }

    return comment;
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    data: UpdateRequestStatusInput["body"],
    userId: string,
    userRole: string
  ) {
    const request = await this.getRequestById(requestId, userRole, userId);
    const currentStatus = request.status;
    const newStatus = data.status;

    // Validate status transition based on role
    this.validateStatusTransition(currentStatus, newStatus, userRole);

    // Update the request status
    const updatedRequest = await prisma.maintenance_request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        completedDate: newStatus === "COMPLETED" ? new Date() : null,
      },
    });

    // Record status change in history
    await prisma.request_status_history.create({
      data: {
        fromStatus: currentStatus,
        toStatus: newStatus,
        reason: data.reason,
        changedById: userId,
        requestId,
      },
    });

    // Send FCM notification for status change
    notificationService
      .notifyRequestStatusChange(
        requestId,
        request.title,
        newStatus,
        request.requestedById,
        request.assignedToId || undefined
      )
      .catch((error) => {
        // Log error but don't fail the request
        console.error("Failed to send status change notification:", error);
      });

    return updatedRequest;
  }

  /**
   * Assign request to a technician (admin only)
   */
  async assignRequest(
    requestId: string,
    data: AssignRequestInput["body"],
    assignedById: string,
    userRole: string
  ) {
    // Only SUPER_ADMIN and MAINTENANCE_ADMIN can assign
    if (!["SUPER_ADMIN", "MAINTENANCE_ADMIN"].includes(userRole)) {
      throw new AppError("Access denied", 403, ErrorCode.FORBIDDEN);
    }

    const request = await this.getRequestById(requestId, userRole);

    // Verify the assigned user is a technician
    const technician = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, role: true },
    });

    if (!technician || technician.role !== "TECHNICIAN") {
      throw new AppError("Invalid technician", 400, ErrorCode.INVALID_INPUT);
    }

    const previousTechnicianId = request.assignedToId;

    // Update the request
    const shouldUpdateStatus = request.status === "SUBMITTED";
    const updatedRequest = await prisma.maintenance_request.update({
      where: { id: requestId },
      data: {
        assignedToId: data.assignedToId,
        assignedById,
        status: shouldUpdateStatus ? "ASSIGNED" : request.status,
      },
    });

    // Record assignment in history
    await prisma.request_assignment_history.create({
      data: {
        fromTechnicianId: previousTechnicianId,
        toTechnicianId: data.assignedToId,
        assignmentType: previousTechnicianId
          ? "REASSIGNMENT"
          : "INITIAL_ASSIGNMENT",
        reason: data.reason,
        assignedById,
        requestId,
      },
    });

    // Record status change in history only if status changed
    if (shouldUpdateStatus) {
      await prisma.request_status_history.create({
        data: {
          fromStatus: "SUBMITTED",
          toStatus: "ASSIGNED",
          reason: "Request assigned to technician",
          changedById: assignedById,
          requestId,
        },
      });
    }

    // Get technician name for notification
    const technicianWithName = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { name: true },
    });

    // Send FCM notification for technician assignment
    if (technicianWithName) {
      notificationService
        .notifyTechnicianAssigned(
          requestId,
          request.title,
          data.assignedToId,
          technicianWithName.name,
          request.requestedById
        )
        .catch((error) => {
          // Log error but don't fail the request
          console.error("Failed to send assignment notification:", error);
        });
    }

    return updatedRequest;
  }

  /**
   * Self-assign request (technician only)
   */
  async selfAssignRequest(
    requestId: string,
    technicianId: string,
    userRole: string
  ) {
    if (userRole !== "TECHNICIAN") {
      throw new AppError("Access denied", 403, ErrorCode.FORBIDDEN);
    }

    const request = await this.getRequestById(requestId, userRole);

    // Check if request is available for assignment
    if (request.status !== "SUBMITTED" && request.status !== "ASSIGNED") {
      throw new AppError(
        "Request is not available for assignment",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    const previousTechnicianId = request.assignedToId;

    // Update the request
    const updatedRequest = await prisma.maintenance_request.update({
      where: { id: requestId },
      data: {
        assignedToId: technicianId,
        assignedById: technicianId,
        status: "ASSIGNED",
      },
    });

    // Record self-assignment in history
    await prisma.request_assignment_history.create({
      data: {
        fromTechnicianId: previousTechnicianId,
        toTechnicianId: technicianId,
        assignmentType: "SELF_ASSIGNMENT",
        reason: "Self-assigned by technician",
        assignedById: technicianId,
        requestId,
      },
    });

    return updatedRequest;
  }

  /**
   * Validate status transitions based on role and business rules
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
    userRole: string
  ) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["ASSIGNED", "REJECTED"],
      ASSIGNED: ["IN_PROGRESS", "REJECTED"],
      IN_PROGRESS: ["COMPLETED", "REJECTED"],
      COMPLETED: ["CLOSED", "IN_PROGRESS"],
      CLOSED: [],
      REJECTED: ["SUBMITTED"],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    // Role-based status update restrictions
    const roleRestrictions: Record<string, string[]> = {
      CUSTOMER: ["DRAFT", "SUBMITTED"],
      TECHNICIAN: ["IN_PROGRESS", "COMPLETED"],
      BASMA_ADMIN: [], // Can only view, not update status
      MAINTENANCE_ADMIN: ["ASSIGNED", "REJECTED", "IN_PROGRESS", "COMPLETED"], // Enhanced with emergency permissions
      SUPER_ADMIN: [
        "DRAFT",
        "SUBMITTED",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CLOSED",
        "REJECTED",
      ],
    };

    if (!roleRestrictions[userRole]?.includes(newStatus)) {
      throw new AppError(
        `Role ${userRole} cannot update status to ${newStatus}`,
        403,
        ErrorCode.FORBIDDEN
      );
    }
  }
}
