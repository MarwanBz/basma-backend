import { requireAuth, requireRole } from "@/middleware/authMiddleware";

import { Router } from "express";
import { SuperAdminController } from "@/controllers/super-admin.controller";
import { SuperAdminService } from "@/services/super-admin.service";
import { validateRequest } from "@/middleware/validateRequest";
import { z } from "zod";

const router = Router();
const superAdminService = new SuperAdminService();
const superAdminController = new SuperAdminController(superAdminService);

/**
 * @swagger
 * tags:
 *   name: Super Admin
 *   description: Super administrator only endpoints for user and system management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SuperAdminUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [SUPER_ADMIN, MAINTENANCE_ADMIN, BASMA_ADMIN, TECHNICIAN, CUSTOMER, ADMIN, USER]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SystemStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: integer
 *         totalRequests:
 *           type: integer
 *         activeTechnicians:
 *           type: integer
 *         pendingRequests:
 *           type: integer
 *         systemUptime:
 *           type: number
 *     SecurityLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         action:
 *           type: string
 *         userId:
 *           type: string
 *           format: uuid
 *         ip:
 *           type: string
 *         userAgent:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         details:
 *           type: object
 */

// Validation schemas
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum([
      "SUPER_ADMIN",
      "MAINTENANCE_ADMIN",
      "BASMA_ADMIN",
      "TECHNICIAN",
      "CUSTOMER",
      "ADMIN",
      "USER",
    ]),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email("Invalid email format").optional(),
    role: z
      .enum([
        "SUPER_ADMIN",
        "MAINTENANCE_ADMIN",
        "BASMA_ADMIN",
        "TECHNICIAN",
        "CUSTOMER",
        "ADMIN",
        "USER",
      ])
      .optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
  }),
});

const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
});

const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
});

const bulkUpdateSchema = z.object({
  body: z.object({
    updates: z.array(
      z.object({
        id: z.string().uuid("Invalid user ID"),
        data: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email("Invalid email format").optional(),
          role: z
            .enum([
              "SUPER_ADMIN",
              "MAINTENANCE_ADMIN",
              "BASMA_ADMIN",
              "TECHNICIAN",
              "CUSTOMER",
              "ADMIN",
              "USER",
            ])
            .optional(),
        }),
      })
    ),
  }),
});

const bulkDeleteSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid("Invalid user ID")),
  }),
});

// Apply authentication and Super Admin middleware to all routes
router.use(requireAuth);
router.use(requireRole(["SUPER_ADMIN"]));

// User Management Routes
/**
 * @swagger
 * /api/v1/super-admin/users:
 *   post:
 *     summary: Create a new user (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, MAINTENANCE_ADMIN, BASMA_ADMIN, TECHNICIAN, CUSTOMER, ADMIN, USER]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuperAdminUser'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post(
  "/users",
  validateRequest(createUserSchema),
  superAdminController.createUser
);
/**
 * @swagger
 * /api/v1/super-admin/users:
 *   get:
 *     summary: Get all users (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SuperAdminUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get("/users", superAdminController.getAllUsers);
/**
 * @swagger
 * /api/v1/super-admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuperAdminUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id",
  validateRequest(getUserSchema),
  superAdminController.getUserById
);

/**
 * @swagger
 * /api/v1/super-admin/users/{id}:
 *   put:
 *     summary: Update user (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, MAINTENANCE_ADMIN, BASMA_ADMIN, TECHNICIAN, CUSTOMER, ADMIN, USER]
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: User not found
 */
router.put(
  "/users/:id",
  validateRequest(updateUserSchema),
  superAdminController.updateUser
);

/**
 * @swagger
 * /api/v1/super-admin/users/{id}:
 *   delete:
 *     summary: Delete user (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: User not found
 */
router.delete(
  "/users/:id",
  validateRequest(deleteUserSchema),
  superAdminController.deleteUser
);

// Bulk Operations
/**
 * @swagger
 * /api/v1/super-admin/users/bulk-update:
 *   post:
 *     summary: Bulk update users (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     data:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                         role:
 *                           type: string
 *                           enum: [SUPER_ADMIN, MAINTENANCE_ADMIN, BASMA_ADMIN, TECHNICIAN, CUSTOMER, ADMIN, USER]
 *     responses:
 *       200:
 *         description: Users updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post(
  "/users/bulk-update",
  validateRequest(bulkUpdateSchema),
  superAdminController.bulkUpdateUsers
);

/**
 * @swagger
 * /api/v1/super-admin/users/bulk-delete:
 *   post:
 *     summary: Bulk delete users (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post(
  "/users/bulk-delete",
  validateRequest(bulkDeleteSchema),
  superAdminController.bulkDeleteUsers
);

// System Configuration Routes
/**
 * @swagger
 * /api/v1/super-admin/system/stats:
 *   get:
 *     summary: Get system statistics (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get("/system/stats", superAdminController.getSystemStats);

// Security Management Routes
/**
 * @swagger
 * /api/v1/super-admin/security/logs:
 *   get:
 *     summary: Get security logs (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SecurityLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get("/security/logs", superAdminController.getSecurityLogs);

// Audit Logs Routes
/**
 * @swagger
 * /api/v1/super-admin/audit/logs:
 *   get:
 *     summary: Get audit logs (Super Admin only)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SecurityLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get("/audit/logs", superAdminController.getAuditLogs);

export default router;
