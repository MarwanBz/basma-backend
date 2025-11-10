import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import prisma from "@/config/database";

export class RequestIdentifierService {
  /**
   * Generate a custom identifier for a maintenance request
   * Format: YY-BUILDING-CODE-SEQ (e.g., 25-A-001)
   */
  async generateIdentifier(
    building: string,
    customIdentifier?: string,
    userId?: string
  ): Promise<string> {
    // If custom identifier is provided (admin only)
    if (customIdentifier) {
      return await this.generateCustomIdentifier(customIdentifier, building, userId);
    }

    // Auto-generate identifier
    return await this.generateAutoIdentifier(building, userId);
  }

  /**
   * Generate automatic identifier based on building and year
   */
  private async generateAutoIdentifier(building: string, userId?: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearShort = currentYear.toString().slice(-2);

    // Get or create building configuration
    const buildingConfig = await this.getOrCreateBuildingConfig(building, userId);

    // Check if sequence needs to be reset (new year)
    if (buildingConfig.lastResetYear !== currentYear) {
      buildingConfig.currentSequence = 0;
      buildingConfig.lastResetYear = currentYear;
    }

    // Increment sequence
    const newSequence = buildingConfig.currentSequence + 1;
    const sequencePadded = newSequence.toString().padStart(3, '0');

    // Generate identifier
    const identifier = `${yearShort}-${buildingConfig.buildingCode}-${sequencePadded}`;

    // Update building configuration
    await prisma.building_config.update({
      where: { id: buildingConfig.id },
      data: {
        currentSequence: newSequence,
        lastResetYear: currentYear,
      },
    });

    // Record the identifier
    await prisma.request_identifier.create({
      data: {
        identifier,
        building,
        year: currentYear,
        sequence: newSequence,
        createdBy: userId || 'system',
      },
    });

    return identifier;
  }

  /**
   * Generate custom identifier (admin functionality)
   */
  private async generateCustomIdentifier(
    customIdentifier: string,
    building: string,
    userId?: string
  ): Promise<string> {
    // Validate custom identifier format
    if (!this.isValidCustomIdentifier(customIdentifier)) {
      throw new AppError(
        "Invalid custom identifier format. Use 3-20 characters, letters, numbers, and hyphens only.",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    // Check if identifier already exists
    const existingIdentifier = await prisma.request_identifier.findUnique({
      where: { identifier: customIdentifier },
    });

    if (existingIdentifier) {
      throw new AppError(
        "This identifier already exists. Please use a different one.",
        400,
        ErrorCode.INVALID_INPUT
      );
    }

    const currentYear = new Date().getFullYear();

    // Record the custom identifier
    await prisma.request_identifier.create({
      data: {
        identifier: customIdentifier,
        building,
        year: currentYear,
        sequence: 0, // 0 indicates custom identifier
        createdBy: userId || 'system',
        customSequence: 0,
      },
    });

    return customIdentifier;
  }

  /**
   * Get or create building configuration
   */
  private async getOrCreateBuildingConfig(
    building: string,
    userId?: string
  ): Promise<any> {
    // Try to find existing building config
    let buildingConfig = await prisma.building_config.findUnique({
      where: { buildingName: building },
    });

    if (!buildingConfig) {
      // Generate building code from building name
      const buildingCode = this.generateBuildingCode(building);

      // Create new building configuration
      buildingConfig = await prisma.building_config.create({
        data: {
          buildingName: building,
          buildingCode,
          displayName: `Building ${building}`,
          currentSequence: 0,
          lastResetYear: new Date().getFullYear(),
          createdBy: userId || 'system',
        },
      });
    }

    return buildingConfig;
  }

  /**
   * Generate building code from building name
   */
  private generateBuildingCode(building: string): string {
    // Convert building name to uppercase code
    // Examples: "A" -> "A", "Building A" -> "BA", "ABRAJ-1" -> "ABRAJ1"
    return building
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10); // Max 10 characters
  }

  /**
   * Validate custom identifier format
   */
  private isValidCustomIdentifier(identifier: string): boolean {
    // 3-20 characters, letters, numbers, and hyphens only
    const pattern = /^[A-Z0-9-]{3,20}$/i;
    return pattern.test(identifier);
  }

  /**
   * Get all building configurations (admin only)
   */
  async getBuildingConfigs(): Promise<any[]> {
    return await prisma.building_config.findMany({
      where: { isActive: true },
      orderBy: { buildingName: 'asc' },
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
    const buildingConfig = await prisma.building_config.findUnique({
      where: { buildingName },
    });

    if (!buildingConfig) {
      throw new AppError("Building configuration not found", 404, ErrorCode.NOT_FOUND);
    }

    const updateData: any = { ...updates };

    // Handle sequence reset
    if (updates.resetSequence) {
      updateData.currentSequence = 0;
      updateData.lastResetYear = new Date().getFullYear();
    }

    return await prisma.building_config.update({
      where: { buildingName },
      data: updateData,
    });
  }

  /**
   * Get identifier history
   */
  async getIdentifierHistory(filters: {
    building?: string;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (whereFilters.building) {
      where.building = whereFilters.building;
    }
    if (whereFilters.year) {
      where.year = whereFilters.year;
    }

    const [identifiers, total] = await Promise.all([
      prisma.request_identifier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          // Note: _count aggregation removed for compatibility
        },
      }),
      prisma.request_identifier.count({ where }),
    ]);

    return {
      identifiers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if identifier exists
   */
  async identifierExists(identifier: string): Promise<boolean> {
    const existing = await prisma.request_identifier.findUnique({
      where: { identifier },
    });
    return !!existing;
  }
}