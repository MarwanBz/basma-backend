import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/appError";
import { BaseController } from "./base.controller";
import { RequestService } from "@/services/request.service";

export class RequestController extends BaseController {
  constructor(private requestService: RequestService) {
    super();
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
}
