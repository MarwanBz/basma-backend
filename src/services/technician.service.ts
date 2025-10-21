import { AppError } from "@/utils/appError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TechnicianService {
  async getAllTechnicians(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [technicians, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TECHNICIAN" },
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({
        where: { role: "TECHNICIAN" },
      }),
    ]);

    return {
      technicians,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTechnicianById(id: string) {
    const technician = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!technician) {
      throw new AppError("Technician not found", 404);
    }

    if (technician.role !== "TECHNICIAN") {
      throw new AppError("User is not a technician", 404);
    }

    return technician;
  }
}
