import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { catchAsync } from "../../core/utils/catch-async";
import {
  AdminUser,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminListResponse,
} from "./admin.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * POST /api/admin/
   * Create a new admin user
   */
  createAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const adminData: CreateAdminRequest = req.body;

    const result: AdminUser = await this.adminService.createAdmin(adminData);

    res.status(201).json({
      message: "Admin user created successfully",
      admin: result,
    });
  });

  /**
   * GET /api/admin/
   * Get all admin users
   */
  getAdmins = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize, search } = req.query;

    const result: AdminListResponse = await this.adminService.getAdmins({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      search: search as string,
    });

    res.json(result);
  });

  /**
   * GET /api/admin/:id
   * Get admin by ID
   */
  getAdminById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result: AdminUser = await this.adminService.getAdminById(Number(id));

    res.json(result);
  });

  /**
   * PUT /api/admin/:id
   * Update admin user
   */
  updateAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData: UpdateAdminRequest = req.body;

    const result: AdminUser = await this.adminService.updateAdmin(Number(id), updateData);

    res.json({
      message: "Admin user updated successfully",
      admin: result,
    });
  });

  /**
   * DELETE /api/admin/:id
   * Delete admin user
   */
  deleteAdmin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.adminService.deleteAdmin(Number(id));

    res.json({
      message: "Admin user deleted successfully",
    });
  });

  /**
   * POST /api/admin/:id/upload-image
   * Upload admin image
   */
  uploadAdminImage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await this.adminService.uploadAdminImage(Number(id), req.file);

    res.status(201).json({
      message: "Admin image uploaded successfully",
      ...result,
    });
  });

  // ===== USER MANAGEMENT ENDPOINTS =====

  /**
   * GET /api/admin/users/
   * Get all users (admin only)
   */
  getUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize, search } = req.query;

    const result = await this.adminService.getUsers({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      search: search as string,
    });

    res.json(result);
  });

  /**
   * GET /api/admin/users/:id
   * Get user by ID (admin only)
   */
  getUserById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await this.adminService.getUserById(Number(id));

    res.json(result);
  });

  /**
   * PUT /api/admin/users/:id
   * Update user (admin only)
   */
  updateUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.adminService.updateUser(Number(id), updateData);

    res.json({
      message: "User updated successfully",
      user: result,
    });
  });

  /**
   * DELETE /api/admin/users/:id
   * Delete user (admin only)
   */
  deleteUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.adminService.deleteUser(Number(id));

    res.json({
      message: "User deleted successfully",
    });
  });

  // ===== USER STATISTICS ENDPOINTS =====

  /**
   * GET /api/admin/user-statistics/account-statistics
   * Get account statistics (admin only)
   */
  getAccountStatistics = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { period } = req.query;

      const result = await this.adminService.getAccountStatistics(period as string);

      res.json(result);
    },
  );

  /**
   * GET /api/admin/user-statistics/figures
   * Get user figures (admin only)
   */
  getUserFigures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getUserFigures();

    res.json(result);
  });

  // ===== USER LOGS ENDPOINTS =====

  /**
   * GET /api/admin/user-logs/
   * Get user logs (admin only)
   */
  getUserLogs = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize, search } = req.query;

    const result = await this.adminService.getUserLogs({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      search: search as string,
    });

    res.json(result);
  });

  // ===== USER REPORT MANAGEMENT ENDPOINTS =====

  /**
   * GET /api/admin/user-report-management/
   * Get user reports (admin only)
   */
  getUserReports = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize, country_code, age_range } = req.query;

    const result = await this.adminService.getUserReports({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      country_code: country_code as string,
      age_range: age_range as string,
    });

    res.json(result);
  });
}

