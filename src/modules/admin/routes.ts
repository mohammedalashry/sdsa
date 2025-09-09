import { Router } from "express";
import { AdminController } from "./admin.controller";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { adminValidationSchemas } from "./admin.validator";

const router = Router();
const adminController = new AdminController();

// Based on Excel sheet endpoints

// GET /api/admin/management/ - Get admin management list
router.get(
  "/management/",
  validateRequest(adminValidationSchemas.getAdminManagement, "query"),
  adminController.getAdminManagement,
);

// POST /api/admin/management/ - Create admin
router.post(
  "/management/",
  validateRequest(adminValidationSchemas.createAdmin, "body"),
  adminController.createAdmin,
);

// GET /api/admin/management/{id}/ - Get admin by ID
router.get(
  "/management/:id/",
  validateRequest(adminValidationSchemas.getAdminById, "params"),
  adminController.getAdminById,
);

// PUT /api/admin/management/{id}/ - Update admin
router.put(
  "/management/:id/",
  validateRequest(adminValidationSchemas.getAdminById, "params"),
  validateRequest(adminValidationSchemas.updateAdmin, "body"),
  adminController.updateAdmin,
);

// PATCH /api/admin/management/{id}/ - Partial update admin
router.patch(
  "/management/:id/",
  validateRequest(adminValidationSchemas.getAdminById, "params"),
  validateRequest(adminValidationSchemas.patchAdmin, "body"),
  adminController.patchAdmin,
);

// DELETE /api/admin/management/{id}/ - Delete admin
router.delete(
  "/management/:id/",
  validateRequest(adminValidationSchemas.getAdminById, "params"),
  adminController.deleteAdmin,
);

// POST /api/admin/management/{id}/upload-image/ - Upload admin image
router.post(
  "/management/:id/upload-image/",
  validateRequest(adminValidationSchemas.getAdminById, "params"),
  /* validate(uploadImageValidation), */
  /* uploadImage */
);

// GET /api/admin/user-logs/ - Get user logs
router.get(
  "/user-logs/",
  validateRequest(adminValidationSchemas.getUserLogs, "query"),
  adminController.getUserLogs,
);

// GET /api/admin/user-report-management/ - Get user report management
router.get(
  "/user-report-management/",
  validateRequest(adminValidationSchemas.getUserReportManagement, "query"),
  adminController.getUserReportManagement,
);

// GET /api/admin/user-statistics/account-statistics/ - Get account statistics
router.get(
  "/user-statistics/account-statistics/",
  validateRequest(adminValidationSchemas.getAccountStatistics, "query"),
  adminController.getAccountStatistics,
);

// GET /api/admin/user-statistics/figures/ - Get user statistics figures
router.get("/user-statistics/figures/", adminController.getUserStatisticsFigures);

// GET /api/admin/users/ - Get users
router.get(
  "/users/",
  validateRequest(adminValidationSchemas.getUsers, "query"),
  adminController.getUsers,
);

// GET /api/admin/users/{id}/ - Get user by ID
router.get(
  "/users/:id/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  adminController.getUserById,
);

// PUT /api/admin/users/{id}/ - Update user
router.put(
  "/users/:id/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  validateRequest(adminValidationSchemas.updateUser, "body"),
  adminController.updateUser,
);

// PATCH /api/admin/users/{id}/ - Partial update user
router.patch(
  "/users/:id/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  validateRequest(adminValidationSchemas.patchUser, "body"),
  adminController.patchUser,
);

// DELETE /api/admin/users/{id}/ - Delete user
router.delete(
  "/users/:id/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  adminController.deleteUser,
);

// POST /api/admin/users/{id}/deactivate/ - Deactivate user
router.post(
  "/users/:id/deactivate/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  validateRequest(adminValidationSchemas.deactivateUser, "body"),
  adminController.deactivateUser,
);

// POST /api/admin/users/{id}/reactivate/ - Reactivate user
router.post(
  "/users/:id/reactivate/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  validateRequest(adminValidationSchemas.reactivateUser, "body"),
  adminController.reactivateUser,
);

// POST /api/admin/users/{id}/upload-image/ - Upload user image
router.post(
  "/users/:id/upload-image/",
  validateRequest(adminValidationSchemas.getUserById, "params"),
  /* validate(uploadImageValidation), */
  /* uploadImage */
);

// GET /api/admin/users/recent-signup/ - Get recent signups
router.get("/users/recent-signup/", adminController.getRecentSignups);

export default router;

