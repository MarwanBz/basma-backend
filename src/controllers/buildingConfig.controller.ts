import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/appError";
import { BaseController } from "./base.controller";
import { BuildingConfigService } from "@/services/buildingConfig.service";

export class BuildingConfigController extends BaseController {
  constructor(private buildingConfigService: BuildingConfigService) {
    super();
  }

  /**
   * Create a new building configuration (admin only)
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
      return await this.buildingConfigService.createBuildingConfig(req.body, req.user.userId);
    });
  };

  /**
   * Get all building configurations
   */
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      return await this.buildingConfigService.getAllBuildingConfigs();
    });
  };

  /**
   * Get building configuration by name
   */
  getByName = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      return await this.buildingConfigService.getBuildingConfigByName(req.params.buildingName);
    });
  };

  /**
   * Update building configuration (admin only)
   */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("User not authenticated", 401);
      }
      return await this.buildingConfigService.updateBuildingConfig(
        req.params.buildingName,
        req.body,
        req.user.userId
      );
    });
  };

  /**
   * Delete building configuration (admin only)
   */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("User not authenticated", 401);
      }
      await this.buildingConfigService.deleteBuildingConfig(req.params.buildingName, req.user.userId);
      return { message: "Building configuration deleted successfully" };
    });
  };

  /**
   * Get building statistics
   */
  getStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const buildingName = req.query.building as string | undefined;
      return await this.buildingConfigService.getBuildingStatistics(buildingName);
    });
  };

  /**
   * Get next available identifier for a building
   */
  getNextIdentifier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      return {
        nextIdentifier: await this.buildingConfigService.getNextIdentifier(req.params.buildingName),
      };
    });
  };

  /**
   * Reset building sequence (admin only)
   */
  resetSequence = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("User not authenticated", 401);
      }
      return await this.buildingConfigService.resetBuildingSequence(req.params.buildingName, req.user.userId);
    });
  };
}