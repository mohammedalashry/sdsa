import prismaService from "@/db/prismadb/prisma.service";
import {
  AdminUser,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminListResponse,
  AdminSearchParams,
} from "./admin.types";
import { ApiError } from "@/core/middleware/error.middleware";
import { Role, EmailType } from "@prisma/client";
import { encodeDjangoPBKDF2 } from "@/core/helpers/hash-password";

export class AdminRepository {
  /**
   * Create a new admin user
   */
  async createAdmin(adminData: CreateAdminRequest): Promise<AdminUser> {
    try {
      // Check if email already exists
      const existingUser = await prismaService.user.findUnique({
        where: { email: adminData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ApiError(400, "Email already exists");
      }

      const hashedPassword = encodeDjangoPBKDF2(adminData.password);

      const admin = await prismaService.user.create({
        data: {
          email: adminData.email.toLowerCase(),
          password: hashedPassword,
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          phonenumber: adminData.phonenumber || null,
          twitter_link: adminData.twitter_link || "",
          dob: adminData.dob ? new Date(adminData.dob) : null,
          address: adminData.address || "",
          role: Role.admin,
          is_staff: true,
          is_active: true,
          email_type: EmailType.work,
          purpose: "Admin user",
        },
      });

      return this.mapToAdminUser(admin);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Create admin error:", error);
      throw new ApiError(500, "Failed to create admin user");
    }
  }

  /**
   * Get all admin users with pagination and search
   */
  async getAdmins(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      const { page = 1, pageSize = 10, search } = params;
      const skip = (page - 1) * pageSize;

      // Build search conditions
      const searchConditions = search
        ? {
            AND: [
              { is_staff: true },
              {
                OR: [
                  { email: { contains: search, mode: "insensitive" as const } },
                  { first_name: { contains: search, mode: "insensitive" as const } },
                  { last_name: { contains: search, mode: "insensitive" as const } },
                  { phonenumber: { contains: search, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : { is_staff: true };

      // Get total count
      const total = await prismaService.user.count({
        where: searchConditions,
      });

      // Get admins
      const admins = await prismaService.user.findMany({
        where: searchConditions,
        skip,
        take: pageSize,
        orderBy: { date_joined: "desc" },
      });

      return {
        admins: admins.map((admin) => this.mapToAdminUser(admin)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      console.error("Get admins error:", error);
      throw new ApiError(500, "Failed to fetch admin users");
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id: number): Promise<AdminUser | null> {
    try {
      const admin = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: true,
        },
      });

      if (!admin) {
        return null;
      }

      return this.mapToAdminUser(admin);
    } catch (error) {
      console.error("Get admin by ID error:", error);
      throw new ApiError(500, "Failed to fetch admin user");
    }
  }

  /**
   * Update admin user
   */
  async updateAdmin(id: number, updateData: UpdateAdminRequest): Promise<AdminUser> {
    try {
      // Check if admin exists
      const existingAdmin = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: true,
        },
      });

      if (!existingAdmin) {
        throw new ApiError(404, "Admin user not found");
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== existingAdmin.email) {
        const emailExists = await prismaService.user.findUnique({
          where: { email: updateData.email.toLowerCase() },
        });

        if (emailExists) {
          throw new ApiError(400, "Email already exists");
        }
      }

      // Prepare update data
      const cleanUpdateData: any = {};
      if (updateData.email) cleanUpdateData.email = updateData.email.toLowerCase();
      if (updateData.first_name) cleanUpdateData.first_name = updateData.first_name;
      if (updateData.last_name) cleanUpdateData.last_name = updateData.last_name;
      if (updateData.phonenumber !== undefined)
        cleanUpdateData.phonenumber = updateData.phonenumber;
      if (updateData.twitter_link !== undefined)
        cleanUpdateData.twitter_link = updateData.twitter_link;
      if (updateData.dob !== undefined)
        cleanUpdateData.dob = updateData.dob ? new Date(updateData.dob) : null;
      if (updateData.address !== undefined) cleanUpdateData.address = updateData.address;
      if (updateData.is_active !== undefined)
        cleanUpdateData.is_active = updateData.is_active;

      const updatedAdmin = await prismaService.user.update({
        where: { id },
        data: cleanUpdateData,
      });

      return this.mapToAdminUser(updatedAdmin);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Update admin error:", error);
      throw new ApiError(500, "Failed to update admin user");
    }
  }

  /**
   * Delete admin user
   */
  async deleteAdmin(id: number): Promise<void> {
    try {
      // Check if admin exists
      const existingAdmin = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: true,
        },
      });

      if (!existingAdmin) {
        throw new ApiError(404, "Admin user not found");
      }

      // Soft delete by setting is_deleted to true
      await prismaService.user.update({
        where: { id },
        data: { is_deleted: true },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Delete admin error:", error);
      throw new ApiError(500, "Failed to delete admin user");
    }
  }

  /**
   * Upload admin image
   */
  async uploadAdminImage(id: number, imageData: string): Promise<{ image: string }> {
    try {
      // Check if admin exists
      const existingAdmin = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: true,
        },
      });

      if (!existingAdmin) {
        throw new ApiError(404, "Admin user not found");
      }

      // Update admin's image
      await prismaService.user.update({
        where: { id },
        data: { image: imageData },
      });

      return { image: imageData };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Upload admin image error:", error);
      throw new ApiError(500, "Failed to upload admin image");
    }
  }

  /**
   * Map Prisma user to AdminUser interface
   */
  private mapToAdminUser(user: any): AdminUser {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phonenumber: user.phonenumber,
      image: user.image,
      twitter_link: user.twitter_link,
      dob: user.dob ? user.dob.toISOString().split("T")[0] : null,
      address: user.address,
      is_staff: user.is_staff,
      is_active: user.is_active,
      date_joined: user.date_joined.toISOString(),
      last_login: user.last_login ? user.last_login.toISOString() : null,
    };
  }

  // ===== USER MANAGEMENT METHODS =====

  /**
   * Get all users (non-admin)
   */
  async getUsers(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      const { page = 1, pageSize = 10, search } = params;
      const skip = (page - 1) * pageSize;

      // Build search conditions for non-admin users
      const searchConditions = search
        ? {
            AND: [
              { is_staff: false },
              {
                OR: [
                  { email: { contains: search, mode: "insensitive" as const } },
                  { first_name: { contains: search, mode: "insensitive" as const } },
                  { last_name: { contains: search, mode: "insensitive" as const } },
                  { phonenumber: { contains: search, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : { is_staff: false };

      // Get total count
      const total = await prismaService.user.count({
        where: searchConditions,
      });

      // Get users
      const users = await prismaService.user.findMany({
        where: searchConditions,
        skip,
        take: pageSize,
        orderBy: { date_joined: "desc" },
      });

      return {
        admins: users.map((user) => this.mapToAdminUser(user)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      console.error("Get users error:", error);
      throw new ApiError(500, "Failed to fetch users");
    }
  }

  /**
   * Get user by ID (non-admin)
   */
  async getUserById(id: number): Promise<AdminUser | null> {
    try {
      const user = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: false,
        },
      });

      if (!user) {
        return null;
      }

      return this.mapToAdminUser(user);
    } catch (error) {
      console.error("Get user by ID error:", error);
      throw new ApiError(500, "Failed to fetch user");
    }
  }

  /**
   * Update user (non-admin)
   */
  async updateUser(id: number, updateData: UpdateAdminRequest): Promise<AdminUser> {
    try {
      // Check if user exists
      const existingUser = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: false,
        },
      });

      if (!existingUser) {
        throw new ApiError(404, "User not found");
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prismaService.user.findUnique({
          where: { email: updateData.email.toLowerCase() },
        });

        if (emailExists) {
          throw new ApiError(400, "Email already exists");
        }
      }

      // Prepare update data
      const cleanUpdateData: any = {};
      if (updateData.email) cleanUpdateData.email = updateData.email.toLowerCase();
      if (updateData.first_name) cleanUpdateData.first_name = updateData.first_name;
      if (updateData.last_name) cleanUpdateData.last_name = updateData.last_name;
      if (updateData.phonenumber !== undefined)
        cleanUpdateData.phonenumber = updateData.phonenumber;
      if (updateData.twitter_link !== undefined)
        cleanUpdateData.twitter_link = updateData.twitter_link;
      if (updateData.dob !== undefined)
        cleanUpdateData.dob = updateData.dob ? new Date(updateData.dob) : null;
      if (updateData.address !== undefined) cleanUpdateData.address = updateData.address;
      if (updateData.is_active !== undefined)
        cleanUpdateData.is_active = updateData.is_active;

      const updatedUser = await prismaService.user.update({
        where: { id },
        data: cleanUpdateData,
      });

      return this.mapToAdminUser(updatedUser);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Update user error:", error);
      throw new ApiError(500, "Failed to update user");
    }
  }

  /**
   * Delete user (non-admin)
   */
  async deleteUser(id: number): Promise<void> {
    try {
      // Check if user exists
      const existingUser = await prismaService.user.findFirst({
        where: {
          id,
          is_staff: false,
        },
      });

      if (!existingUser) {
        throw new ApiError(404, "User not found");
      }

      // Soft delete by setting is_deleted to true
      await prismaService.user.update({
        where: { id },
        data: { is_deleted: true },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Delete user error:", error);
      throw new ApiError(500, "Failed to delete user");
    }
  }

  // ===== USER STATISTICS METHODS =====

  /**
   * Get account statistics
   */
  async getAccountStatistics(period: string): Promise<any> {
    try {
      // This would need to be implemented based on your UserStatistics model
      // For now, return mock data
      return {
        message: "Account statistics endpoint - needs implementation",
        period,
      };
    } catch (error) {
      console.error("Get account statistics error:", error);
      throw new ApiError(500, "Failed to fetch account statistics");
    }
  }

  /**
   * Get user figures
   */
  async getUserFigures(): Promise<any> {
    try {
      // This would need to be implemented based on your UserStatistics model
      // For now, return mock data
      return {
        message: "User figures endpoint - needs implementation",
      };
    } catch (error) {
      console.error("Get user figures error:", error);
      throw new ApiError(500, "Failed to fetch user figures");
    }
  }

  // ===== USER LOGS METHODS =====

  /**
   * Get user logs
   */
  async getUserLogs(params: AdminSearchParams): Promise<AdminListResponse> {
    try {
      // This would need to be implemented based on your UserLogs model
      // For now, return empty data
      return {
        admins: [],
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
      };
    } catch (error) {
      console.error("Get user logs error:", error);
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
      const { page = 1, pageSize = 10, country_code, age_range } = params;
      const skip = (page - 1) * pageSize;

      // Build search conditions
      let whereConditions: any = { is_staff: false };

      if (country_code) {
        whereConditions.country_code = country_code;
      }

      if (age_range) {
        try {
          const [ageMin, ageMax] = age_range.split("-").map(Number);
          const today = new Date();
          const dobStart = new Date(
            today.getFullYear() - ageMax,
            today.getMonth(),
            today.getDate(),
          );
          const dobEnd = new Date(
            today.getFullYear() - ageMin,
            today.getMonth(),
            today.getDate(),
          );

          whereConditions.dob = {
            gte: dobStart,
            lte: dobEnd,
          };
        } catch (error) {
          // Invalid age range format, ignore
        }
      }

      // Get total count
      const total = await prismaService.user.count({
        where: whereConditions,
      });

      // Get users
      const users = await prismaService.user.findMany({
        where: whereConditions,
        skip,
        take: pageSize,
        orderBy: { date_joined: "desc" },
      });

      return {
        admins: users.map((user) => this.mapToAdminUser(user)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      console.error("Get user reports error:", error);
      throw new ApiError(500, "Failed to fetch user reports");
    }
  }
}

