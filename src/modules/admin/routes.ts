import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRepository } from "./admin.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";
import { adminValidationSchemas } from "./admin.validator";
import multer from "multer";

const router = Router();

// Dependency injection setup
const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5242880 * 5, // 25MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/jfif",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || !user.is_staff) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Admin access required",
    });
  }
  next();
};

// ===== ADMIN MANAGEMENT (admin/management) =====
// POST /api/admin/management/ - Create admin user (admin only)
router.post(
  "/management/",
  authenticate,
  requireAdmin,
  validateRequest(adminValidationSchemas.createAdmin, "body"),
  adminController.createAdmin,
);

// GET /api/admin/management/ - Get all admin users (admin only)
router.get(
  "/management/",
  authenticate,
  requireAdmin,
  validateRequest(adminValidationSchemas.getAdmins, "query"),
  adminController.getAdmins,
);

// GET /api/admin/management/:id - Get admin by ID (admin only)
router.get("/management/:id", authenticate, requireAdmin, adminController.getAdminById);

// PUT /api/admin/management/:id - Update admin user (admin only)
router.put(
  "/management/:id",
  authenticate,
  requireAdmin,
  validateRequest(adminValidationSchemas.updateAdmin, "body"),
  adminController.updateAdmin,
);

// DELETE /api/admin/management/:id - Delete admin user (admin only)
router.delete("/management/:id", authenticate, requireAdmin, adminController.deleteAdmin);

// POST /api/admin/management/:id/upload-image - Upload admin image (admin only)
router.post(
  "/management/:id/upload-image",
  authenticate,
  requireAdmin,
  upload.single("file"),
  adminController.uploadAdminImage,
);

// ===== USER MANAGEMENT (admin/users) =====
// GET /api/admin/users/ - Get all users (admin only)
router.get("/users/", authenticate, requireAdmin, adminController.getUsers);

// GET /api/admin/users/:id - Get user by ID (admin only)
router.get("/users/:id", authenticate, requireAdmin, adminController.getUserById);

// PUT /api/admin/users/:id - Update user (admin only)
router.put("/users/:id", authenticate, requireAdmin, adminController.updateUser);

// DELETE /api/admin/users/:id - Delete user (admin only)
router.delete("/users/:id", authenticate, requireAdmin, adminController.deleteUser);

// ===== USER STATISTICS (admin/user-statistics) =====
// GET /api/admin/user-statistics/account-statistics - Get account statistics (admin only)
router.get(
  "/user-statistics/account-statistics",
  authenticate,
  requireAdmin,
  adminController.getAccountStatistics,
);

// GET /api/admin/user-statistics/figures - Get user figures (admin only)
router.get(
  "/user-statistics/figures",
  authenticate,
  requireAdmin,
  adminController.getUserFigures,
);

// ===== USER LOGS (admin/user-logs) =====
// GET /api/admin/user-logs/ - Get user logs (admin only)
router.get("/user-logs/", authenticate, requireAdmin, adminController.getUserLogs);

// ===== USER REPORT MANAGEMENT (admin/user-report-management) =====
// GET /api/admin/user-report-management/ - Get user reports (admin only)
router.get(
  "/user-report-management/",
  authenticate,
  requireAdmin,
  adminController.getUserReports,
);

export default router;

