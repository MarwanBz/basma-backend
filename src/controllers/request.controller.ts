import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/appError";
import { BaseController } from "./base.controller";
import { RequestService } from "@/services/request.service";
import { FileService } from "@/services/file.service";
import { file_entity_type } from "@prisma/client";
import { logger } from "@/config/logger";

export class RequestController extends BaseController {
  private fileService: FileService;

  constructor(private requestService: RequestService) {
    super();
    this.fileService = new FileService();
  }

  /**
   * Create a new maintenance request
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("User not authenticated", 401);
      }
      return await this.requestService.createRequest(req.body, req.user.userId);
    });
  };

  /**
   * Create a new maintenance request (helper method for internal use)
   */
  createRequest = async (
    requestData: any,
    user: any
  ): Promise<any> => {
    if (!user?.userId) {
      throw new AppError("User not authenticated", 401);
    }
    return await this.requestService.createRequest(requestData, user.userId);
  };

  /**
   * Get all requests with filtering and pagination
   */
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy:
          (req.query.sortBy as
            | "status"
            | "title"
            | "priority"
            | "createdAt"
            | "updatedAt") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        status: req.query.status as
          | "DRAFT"
          | "SUBMITTED"
          | "ASSIGNED"
          | "IN_PROGRESS"
          | "COMPLETED"
          | "CLOSED"
          | "REJECTED"
          | undefined,
        priority: req.query.priority as
          | "LOW"
          | "MEDIUM"
          | "HIGH"
          | "URGENT"
          | undefined,
        categoryId: req.query.categoryId
          ? parseInt(req.query.categoryId as string)
          : undefined,
        assignedToId: req.query.assignedToId as string | undefined,
        requestedById: req.query.requestedById as string | undefined,
        building: req.query.building as string | undefined,
        search: req.query.search as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      return await this.requestService.getRequests(
        filters,
        req.user.role,
        req.user.userId
      );
    });
  };

  /**
   * Get a single request by ID
   */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.getRequestById(
        req.params.id,
        req.user.role,
        req.user.userId
      );
    });
  };

  /**
   * Update a maintenance request
   */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.updateRequest(
        req.params.id,
        req.body,
        req.user.role,
        req.user.userId
      );
    });
  };

  /**
   * Delete a maintenance request
   */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.deleteRequest(
        req.params.id,
        req.user.role,
        req.user.userId
      );
    });
  };

  /**
   * Add a comment to a request
   */
  addComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.addComment(
        req.params.id,
        req.body,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Confirm completion (customer or admin override)
   */
  confirmCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.confirmCompletion(
        req.params.id,
        req.body,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Reject completion (customer)
   */
  rejectCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.rejectCompletion(
        req.params.id,
        req.body,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Get confirmation status for a request
   */
  getConfirmationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.getConfirmationStatus(
        req.params.id,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Update request status
   */
  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.updateRequestStatus(
        req.params.id,
        req.body,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Assign request to a technician (admin only)
   */
  assign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.assignRequest(
        req.params.id,
        req.body,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Self-assign request (technician only)
   */
  selfAssign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId || !req.user?.role) {
        throw new AppError("User not authenticated", 401);
      }

      return await this.requestService.selfAssignRequest(
        req.params.id,
        req.user.userId,
        req.user.role
      );
    });
  };

  /**
   * Create a new maintenance request with files
   */
  createWithFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("User not authenticated", 401);
      }

      // Extract request data from form
      const requestData = {
        title: req.body.title,
        description: req.body.description,
        categoryId: parseInt(req.body.categoryId),
        location: req.body.location,
        building: req.body.building,
        specificLocation: req.body.specificLocation,
        priority: req.body.priority || 'MEDIUM',
        estimatedCost: req.body.estimatedCost ? parseFloat(req.body.estimatedCost) : undefined,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        customIdentifier: req.body.customIdentifier || undefined
      };

      const files = req.files as Express.Multer.File[];

      // Step 1: Create the maintenance request
      const request = await this.requestService.createRequest(requestData, req.user.userId);

      // Step 2: Upload files if any were provided
      let uploadedFiles: any[] = [];
      let uploadErrors: any[] = [];

      if (files && files.length > 0) {
        try {
          const uploadResult = await this.fileService.uploadMultipleFiles(
            files,
            file_entity_type.MAINTENANCE_REQUEST,
            request.id,
            req.user.userId,
            {
              isPublic: false,
              uploadIp: req.ip,
            }
          );

          uploadedFiles = uploadResult.uploaded;
          uploadErrors = uploadResult.errors;
        } catch (error) {
          // If file upload fails, we don't want to rollback the request creation
          // Instead, we'll log the error and return it with the request
          logger.error('File upload failed after request creation:', error);
          uploadErrors.push({
            error: 'File upload failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Step 3: Return combined result
      return {
        success: true,
        message: `Request created successfully${uploadedFiles.length > 0 ? ` with ${uploadedFiles.length} file(s) attached` : ''}`,
        data: {
          request,
          files: uploadedFiles,
          uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined
        },
        metadata: {
          operation: 'createRequestWithFiles',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };
    });
  };
}
