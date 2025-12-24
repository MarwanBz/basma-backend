import { AppError } from "@/utils/appError";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export class SuperAdminService {
  // User Management - Create, edit, and delete all user types
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role:
      | "SUPER_ADMIN"
      | "MAINTENANCE_ADMIN"
      | "BASMA_ADMIN"
      | "TECHNICIAN"
      | "CUSTOMER"
      | "ADMIN"
      | "USER";
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new AppError("Email already exists", 400);
    }

    if (data.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (existingPhone) {
        throw new AppError("Phone number already exists", 400);
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllUsers(page = 1, limit = 10, role?: string) {
    const skip = (page - 1) * limit;
    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone?: string;
      role:
        | "SUPER_ADMIN"
        | "MAINTENANCE_ADMIN"
        | "BASMA_ADMIN"
        | "TECHNICIAN"
        | "CUSTOMER"
        | "ADMIN"
        | "USER";
      password: string;
    }>
  ) {
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  }

  // System Configuration - Modify system-wide settings
  async getSystemStats() {
    const [totalUsers, usersByRole, recentUsers, verifiedUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
        prisma.user.count({
          where: { emailVerified: { not: null } },
        }),
      ]);

    return {
      totalUsers,
      usersByRole,
      recentUsers,
      verifiedUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
    };
  }

  // Security Management - Manage security policies
  async getSecurityLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // This would typically come from a security logs table
    // For now, we'll return user login patterns
    const recentLogins = await prisma.user.findMany({
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      logs: recentLogins,
      pagination: {
        page,
        limit,
        total: await prisma.user.count(),
        pages: Math.ceil((await prisma.user.count()) / limit),
      },
    };
  }

  // Audit Logs - View all system activities
  async getAuditLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // This would typically come from an audit logs table
    // For now, we'll return user activity patterns
    const userActivity = await prisma.user.findMany({
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      activities: userActivity,
      pagination: {
        page,
        limit,
        total: await prisma.user.count(),
        pages: Math.ceil((await prisma.user.count()) / limit),
      },
    };
  }

  // Bulk Operations
  async bulkUpdateUsers(
    updates: Array<{
      id: string;
      data: Partial<{ name: string; email: string; role: any }>;
    }>
  ) {
    const results = [];

    for (const update of updates) {
      try {
        const result = await this.updateUser(update.id, update.data);
        results.push({ success: true, user: result });
      } catch (error) {
        results.push({
          success: false,
          id: update.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  async bulkDeleteUsers(userIds: string[]) {
    const results = [];

    for (const id of userIds) {
      try {
        await this.deleteUser(id);
        results.push({ success: true, id });
      } catch (error) {
        results.push({
          success: false,
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }
}
