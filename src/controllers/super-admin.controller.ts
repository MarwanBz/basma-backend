import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/appError";
import { BaseController } from "./base.controller";
import { SuperAdminService } from "@/services/super-admin.service";

export class SuperAdminController extends BaseController {
  constructor(private superAdminService: SuperAdminService) {
    super();
  }

  // User Management
  createUser = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        throw new AppError("Name, email, password, and role are required", 400);
      }

      return await this.superAdminService.createUser({
        name,
        email,
        password,
        role,
      });
    });
  };

  getAllUsers = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;

      return await this.superAdminService.getAllUsers(page, limit, role);
    });
  };

  getUserById = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      return await this.superAdminService.getUserById(id);
    });
  };

  updateUser = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      const { name, email, role, password } = req.body;

      return await this.superAdminService.updateUser(id, {
        name,
        email,
        role,
        password,
      });
    });
  };

  deleteUser = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { id } = req.params;
      return await this.superAdminService.deleteUser(id);
    });
  };

  // System Configuration
  getSystemStats = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      return await this.superAdminService.getSystemStats();
    });
  };

  // Security Management
  getSecurityLogs = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      return await this.superAdminService.getSecurityLogs(page, limit);
    });
  };

  // Audit Logs
  getAuditLogs = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      return await this.superAdminService.getAuditLogs(page, limit);
    });
  };

  // Bulk Operations
  bulkUpdateUsers = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        throw new AppError("Updates must be an array", 400);
      }

      return await this.superAdminService.bulkUpdateUsers(updates);
    });
  };

  bulkDeleteUsers = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { userIds } = req.body;

      if (!Array.isArray(userIds)) {
        throw new AppError("User IDs must be an array", 400);
      }

      return await this.superAdminService.bulkDeleteUsers(userIds);
    });
  };
}
