import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import prisma from "@/config/database";

export class BuildingConfigService {
  /**
   * Get all building configurations
   */
  async getAllBuildingConfigs(): Promise<any[]> {
    return await prisma.building_config.findMany({
      where: { isActive: true },
      orderBy: { buildingName: 'asc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get building configuration by name
   */
  async getBuildingConfigByName(buildingName: string): Promise<any> {
    const buildingConfig = await prisma.building_config.findUnique({
      where: { buildingName },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!buildingConfig) {
      throw new AppError("Building configuration not found", 404, ErrorCode.NOT_FOUND);
    }

    return buildingConfig;
  }

  /**
   * Create a new building configuration (admin only)
   */
  async createBuildingConfig(
    data: {
      buildingName: string;
      buildingCode?: string;
      displayName?: string;
      allowCustomId?: boolean;
    },
    userId: string
  ): Promise<any> {
    // Check if building already exists
    const existingBuilding = await prisma.building_config.findUnique({
      where: { buildingName: data.buildingName },
    });

    if (existingBuilding) {
      throw new AppError(
        "Building configuration already exists",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    // Validate building code if provided
    if (data.buildingCode && !this.isValidBuildingCode(data.buildingCode)) {
      throw new AppError(
        "Invalid building code. Use 2-10 characters, letters and numbers only.",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    // Generate building code if not provided
    const buildingCode = data.buildingCode || this.generateBuildingCode(data.buildingName);

    return await prisma.building_config.create({
      data: {
        buildingName: data.buildingName,
        buildingCode,
        displayName: data.displayName || `Building ${data.buildingName}`,
        allowCustomId: data.allowCustomId || false,
        currentSequence: 0,
        lastResetYear: new Date().getFullYear(),
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Update building configuration (admin only)
   */
  async updateBuildingConfig(
    buildingName: string,
    updates: {
      buildingCode?: string;
      displayName?: string;
      allowCustomId?: boolean;
      isActive?: boolean;
      resetSequence?: boolean;
    },
    userId: string
  ): Promise<any> {
    const buildingConfig = await this.getBuildingConfigByName(buildingName);

    const updateData: any = { ...updates };

    // Validate building code if provided
    if (updates.buildingCode) {
      if (!this.isValidBuildingCode(updates.buildingCode)) {
        throw new AppError(
          "Invalid building code. Use 2-10 characters, letters and numbers only.",
          400,
          ErrorCode.INVALID_INPUT
        );
      }

      // Check if building code is already used by another building
      const existingCode = await prisma.building_config.findFirst({
        where: {
          buildingCode: updates.buildingCode,
          buildingName: { not: buildingName },
        },
      });

      if (existingCode) {
        throw new AppError(
          "Building code already exists",
          400,
          ErrorCode.INVALID_INPUT
        );
      }
    }

    // Handle sequence reset
    if (updates.resetSequence) {
      updateData.currentSequence = 0;
      updateData.lastResetYear = new Date().getFullYear();
    }

    return await prisma.building_config.update({
      where: { buildingName },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Delete building configuration (admin only)
   */
  async deleteBuildingConfig(buildingName: string, userId: string): Promise<void> {
    const buildingConfig = await this.getBuildingConfigByName(buildingName);

    // Check if there are any requests for this building
    const requestCount = await prisma.maintenance_request.count({
      where: { building: buildingName },
    });

    if (requestCount > 0) {
      throw new AppError(
        "Cannot delete building configuration. There are maintenance requests associated with this building.",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    await prisma.building_config.delete({
      where: { buildingName },
    });
  }

  /**
   * Get building statistics
   */
  async getBuildingStatistics(buildingName?: string): Promise<any> {
    const whereClause: any = {};
    if (buildingName) {
      whereClause.building = buildingName;
    }

    const [
      totalRequests,
      requestsByStatus,
      requestsByPriority,
      recentRequests,
    ] = await Promise.all([
      prisma.maintenance_request.count({ where: whereClause }),
      prisma.maintenance_request.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      prisma.maintenance_request.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: true,
      }),
      prisma.maintenance_request.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customIdentifier: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalRequests,
      requestsByStatus,
      requestsByPriority,
      recentRequests,
    };
  }

  /**
   * Get next available identifier for a building
   */
  async getNextIdentifier(buildingName: string): Promise<string> {
    const buildingConfig = await this.getBuildingConfigByName(buildingName);
    const currentYear = new Date().getFullYear();
    const yearShort = currentYear.toString().slice(-2);

    // Check if sequence needs to be reset (new year)
    let sequence = buildingConfig.currentSequence;
    if (buildingConfig.lastResetYear !== currentYear) {
      sequence = 0;
    }

    const nextSequence = sequence + 1;
    const sequencePadded = nextSequence.toString().padStart(3, '0');

    return `${yearShort}-${buildingConfig.buildingCode}-${sequencePadded}`;
  }

  /**
   * Validate building code format
   */
  private isValidBuildingCode(code: string): boolean {
    // 2-10 characters, letters and numbers only
    const pattern = /^[A-Z0-9]{2,10}$/i;
    return pattern.test(code);
  }

  /**
   * Generate building code from building name
   */
  private generateBuildingCode(buildingName: string): string {
    // Convert building name to uppercase code
    // Examples: "A" -> "A", "Building A" -> "BA", "ABRAJ-1" -> "ABRAJ1"
    return buildingName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10); // Max 10 characters
  }

  /**
   * Reset building sequence (for new year or manual reset)
   */
  async resetBuildingSequence(buildingName: string, userId: string): Promise<any> {
    const currentYear = new Date().getFullYear();

    return await prisma.building_config.update({
      where: { buildingName },
      data: {
        currentSequence: 0,
        lastResetYear: currentYear,
      },
    });
  }
}