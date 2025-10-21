import { Request, Response, NextFunction } from "express";
import { TechnicianService } from "@/services/technician.service";
import { BaseController } from "./base.controller";
import { AppError } from "@/utils/appError";

export class TechnicianController extends BaseController {
  constructor(private technicianService: TechnicianService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      return await this.technicianService.getAllTechnicians(page, limit);
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      // Check authorization: SUPER_ADMIN/MAINTENANCE_ADMIN can view any, TECHNICIAN can only view own profile
      if (req.user?.role === "TECHNICIAN" && req.user?.userId !== req.params.id) {
        throw new AppError("Not authorized to access this profile", 403);
      }
      
      return await this.technicianService.getTechnicianById(req.params.id);
    });
  };
}
