// src/modules/profile/services/profile.service.ts
import prismaService from "../../../db/prismadb/prisma.service";
import { ApiError } from "@/core/middleware/error.middleware";
import path from "path";

export interface ProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phonenumber: string | null;
  image: string;
  twitter_link: string;
  dob: string | null;
  address: string;
  change_password: boolean;
}

export class ProfileService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number): Promise<ProfileData | null> {
    try {
      const user = await prismaService.user.findUnique({
        where: {
          id: userId,
          is_deleted: false, // Only get active users
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phonenumber: true,
          image: true,
          twitter_link: true,
          dob: true,
          address: true,
          change_password: true,
        },
      });

      if (!user) {
        return null;
      }

      // Transform the data to match the expected format
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phonenumber: user.phonenumber,
        image: user.image,
        twitter_link: user.twitter_link,
        dob: user.dob ? user.dob.toISOString().split("T")[0] : null, // Format as YYYY-MM-DD
        address: user.address,
        change_password: user.change_password,
      };
    } catch (error) {
      console.error("❌ Failed to get user profile:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: number,
    updateData: Partial<ProfileData>,
  ): Promise<ProfileData | null> {
    try {
      // Only allow updating specific fields
      const allowedFields = {
        first_name: updateData.first_name,
        last_name: updateData.last_name,
        phonenumber: updateData.phonenumber,
        image: updateData.image,
        twitter_link: updateData.twitter_link,
        dob: updateData.dob ? new Date(updateData.dob) : undefined,
        address: updateData.address,
        change_password: updateData.change_password,
      };

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined),
      );

      const updatedUser = await prismaService.user.update({
        where: {
          id: userId,
          is_deleted: false,
        },
        data: cleanUpdateData,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phonenumber: true,
          image: true,
          twitter_link: true,
          dob: true,
          address: true,
          change_password: true,
        },
      });

      // Transform the data to match the expected format
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        phonenumber: updatedUser.phonenumber,
        image: updatedUser.image,
        twitter_link: updatedUser.twitter_link,
        dob: updatedUser.dob ? updatedUser.dob.toISOString().split("T")[0] : null,
        address: updatedUser.address,
        change_password: updatedUser.change_password,
      };
    } catch (error) {
      console.error("❌ Failed to update user profile:", error);
      throw error;
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(userId: number, file: any): Promise<{ image: string }> {
    try {
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

      // Update user's image
      await prismaService.user.update({
        where: { id: userId },
        data: { image: base64Image },
      });

      return { image: base64Image };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("❌ Failed to upload profile image:", error);
      throw new ApiError(500, "Failed to upload image");
    }
  }

  /**
   * Get user's followed teams
   */
  async getFollowedTeams(userId: number): Promise<string[]> {
    try {
      const teamFollows = await prismaService.teamFollow.findMany({
        where: { user_id: userId },
        select: { team: true },
      });

      return teamFollows.map((follow) => {
        const teamData = follow.team as any;
        return teamData?.name || "Unknown Team";
      });
    } catch (error) {
      console.error("❌ Failed to get followed teams:", error);
      throw new ApiError(500, "Failed to retrieve followed teams");
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
}

