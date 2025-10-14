import { AdminRepository } from "./admin.repository";
import {
  AdminUser,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminListResponse,
  AdminSearchParams,
} from "./admin.types";
import { ApiError } from "@/core/middleware/error.middleware";
import path from "path";

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  /**
   * Create a new admin user
   */
  async createAdmin(adminData: CreateAdminRequest): Promise<AdminUser> {
    try {
      // Validate required fields
      if (!adminData.email?.trim()) {
        throw new ApiError(400, "Email is required");
      }
      if (!adminData.password?.trim()) {
        throw new ApiError(400, "Password is required");
      }
      if (!adminData.first_name?.trim()) {
        throw new ApiError(400, "First name is required");
      }
      if (!adminData.last_name?.trim()) {
        throw new ApiError(400, "Last name is required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminData.email)) {
        throw new ApiError(400, "Invalid email format");
      }

      // Validate password strength
      if (adminData.password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters");
      }

      return await this.repository.createAdmin(adminData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service create error:", error);
      throw new ApiError(500, "Failed to create admin user");
    }
  }

  /**
   * Get all admin users
   */
  async getAdmins(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      // Validate pagination parameters
      if (params.page && params.page < 1) {
        throw new ApiError(400, "Page must be greater than 0");
      }
      if (params.pageSize && (params.pageSize < 1 || params.pageSize > 100)) {
        throw new ApiError(400, "Page size must be between 1 and 100");
      }

      return await this.repository.getAdmins(params);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get admins error:", error);
      throw new ApiError(500, "Failed to fetch admin users");
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id: number): Promise<AdminUser> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid admin ID is required");
      }

      const admin = await this.repository.getAdminById(id);
      if (!admin) {
        throw new ApiError(404, "Admin user not found");
      }

      return admin;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get by ID error:", error);
      throw new ApiError(500, "Failed to fetch admin user");
    }
  }

  /**
   * Update admin user
   */
  async updateAdmin(id: number, updateData: UpdateAdminRequest): Promise<AdminUser> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid admin ID is required");
      }

      // Validate email if provided
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          throw new ApiError(400, "Invalid email format");
        }
      }

      return await this.repository.updateAdmin(id, updateData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service update error:", error);
      throw new ApiError(500, "Failed to update admin user");
    }
  }

  /**
   * Delete admin user
   */
  async deleteAdmin(id: number): Promise<void> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid admin ID is required");
      }

      await this.repository.deleteAdmin(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service delete error:", error);
      throw new ApiError(500, "Failed to delete admin user");
    }
  }

  /**
   * Upload admin image
   */
  async uploadAdminImage(id: number, file: any): Promise<{ image: string }> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid admin ID is required");
      }

      if (!file) {
        throw new ApiError(400, "No file found");
      }

      // Check file size (25MB max)
      const MAX_FILE_SIZE = 5242880 * 5; // 25MB
      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError(400, "File size too large");
      }

      // Check file extension
      const allowedExtensions = ["jpeg", "png", "jpg", "jfif", "webp"];
      const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);

      if (!allowedExtensions.includes(fileExtension)) {
        throw new ApiError(
          400,
          `Invalid file type, only ${allowedExtensions.join(", ")} are allowed`,
        );
      }

      // Check if it's actually an image by reading magic bytes
      const buffer = file.buffer;
      const isImage = this.validateImageMagicBytes(buffer, fileExtension);

      if (!isImage) {
        throw new ApiError(400, "Invalid file content");
      }

      // For now, we'll store the image as base64 in the database
      // In production, you'd want to upload to cloud storage (Azure, AWS S3, etc.)
      const base64Image = `data:image/${fileExtension};base64,${buffer.toString("base64")}`;

      return await this.repository.uploadAdminImage(id, base64Image);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service upload image error:", error);
      throw new ApiError(500, "Failed to upload admin image");
    }
  }

  /**
   * Validate image magic bytes
   */
  private validateImageMagicBytes(buffer: Buffer, extension: string): boolean {
    if (buffer.length < 4) return false;

    const magicBytes = buffer.slice(0, 4);

    switch (extension) {
      case "jpg":
      case "jpeg":
        return magicBytes[0] === 0xff && magicBytes[1] === 0xd8;
      case "png":
        return (
          magicBytes[0] === 0x89 &&
          magicBytes[1] === 0x50 &&
          magicBytes[2] === 0x4e &&
          magicBytes[3] === 0x47
        );
      case "webp":
        return (
          magicBytes[0] === 0x52 &&
          magicBytes[1] === 0x49 &&
          magicBytes[2] === 0x46 &&
          magicBytes[3] === 0x46
        );
      case "jfif":
        return magicBytes[0] === 0xff && magicBytes[1] === 0xd8;
      default:
        return false;
    }
  }

  // ===== USER MANAGEMENT METHODS =====

  /**
   * Get all users (non-admin)
   */
  async getUsers(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      return await this.repository.getUsers(params);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get users error:", error);
      throw new ApiError(500, "Failed to fetch users");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<AdminUser> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid user ID is required");
      }

      const user = await this.repository.getUserById(id);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      return user;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get user by ID error:", error);
      throw new ApiError(500, "Failed to fetch user");
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, updateData: UpdateAdminRequest): Promise<AdminUser> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid user ID is required");
      }

      return await this.repository.updateUser(id, updateData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service update user error:", error);
      throw new ApiError(500, "Failed to update user");
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid user ID is required");
      }

      await this.repository.deleteUser(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service delete user error:", error);
      throw new ApiError(500, "Failed to delete user");
    }
  }

  // ===== USER STATISTICS METHODS =====

  /**
   * Get account statistics
   */
  async getAccountStatistics(period: string = "weekly"): Promise<any> {
    try {
      if (period !== "weekly" && period !== "monthly") {
        throw new ApiError(400, "Invalid period. Choose 'weekly' or 'monthly'.");
      }

      return await this.repository.getAccountStatistics(period);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get account statistics error:", error);
      throw new ApiError(500, "Failed to fetch account statistics");
    }
  }

  /**
   * Get user figures
   */
  async getUserFigures(): Promise<any> {
    try {
      return await this.repository.getUserFigures();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get user figures error:", error);
      throw new ApiError(500, "Failed to fetch user figures");
    }
  }

  // ===== USER LOGS METHODS =====

  /**
   * Get user logs
   */
  async getUserLogs(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      return await this.repository.getUserLogs(params);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get user logs error:", error);
      throw new ApiError(500, "Failed to fetch user logs");
    }
  }

  // ===== USER REPORT MANAGEMENT METHODS =====

  /**
   * Get user reports
   */
  async getUserReports(params: {
    page: number;
    pageSize: number;
    country_code?: string;
    age_range?: string;
  }): Promise<AdminListResponse> {
    try {
      return await this.repository.getUserReports(params);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Admin service get user reports error:", error);
      throw new ApiError(500, "Failed to fetch user reports");
    }
  }
}

