// src/modules/profile/services/profile.service.ts
import prismaService from "../../../db/prismadb/prisma.service";

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
}

