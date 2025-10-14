import { requireAuth, requireRole } from "@/middleware/authMiddleware";

import { Router } from "express";
import { SuperAdminController } from "@/controllers/super-admin.controller";
import { SuperAdminService } from "@/services/super-admin.service";
import { validateRequest } from "@/middleware/validateRequest";
import { z } from "zod";

const router = Router();
const superAdminService = new SuperAdminService();
const superAdminController = new SuperAdminController(superAdminService);

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
router.post(
  "/users",
  validateRequest(createUserSchema),
  superAdminController.createUser
);
router.get("/users", superAdminController.getAllUsers);
router.get(
  "/users/:id",
  validateRequest(getUserSchema),
  superAdminController.getUserById
);
router.put(
  "/users/:id",
  validateRequest(updateUserSchema),
  superAdminController.updateUser
);
router.delete(
  "/users/:id",
  validateRequest(deleteUserSchema),
  superAdminController.deleteUser
);

// Bulk Operations
router.post(
  "/users/bulk-update",
  validateRequest(bulkUpdateSchema),
  superAdminController.bulkUpdateUsers
);
router.post(
  "/users/bulk-delete",
  validateRequest(bulkDeleteSchema),
  superAdminController.bulkDeleteUsers
);

// System Configuration Routes
router.get("/system/stats", superAdminController.getSystemStats);

// Security Management Routes
router.get("/security/logs", superAdminController.getSecurityLogs);

// Audit Logs Routes
router.get("/audit/logs", superAdminController.getAuditLogs);

export default router;
