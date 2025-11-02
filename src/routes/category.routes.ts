import { ApiResponse } from "@/utils/apiResponse";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import { Router } from "express";
import { cache } from "@/middleware/cacheMiddleware";
import prisma from "@/config/database";
import { requireAuth } from "@/middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Request category management
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all active categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 */
router.get(
  "/",
  requireAuth,
  cache({ duration: 3600 }),
  async (req, res, next) => {
    try {
      const categories = await prisma.request_category.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Categories retrieved successfully",
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get(
  "/:id",
  requireAuth,
  cache({ duration: 3600 }),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new AppError("Invalid category ID", 400, ErrorCode.INVALID_INPUT);
      }

      const category = await prisma.request_category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
      });

      if (!category) {
        throw new AppError("Category not found", 404, ErrorCode.NOT_FOUND);
      }

      res.status(200).json({
        success: true,
        message: "Category retrieved successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
