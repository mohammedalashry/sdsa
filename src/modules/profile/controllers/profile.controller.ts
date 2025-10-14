// src/modules/profile/controllers/profile.controller.ts
import { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import { catchAsync } from "../../../core/utils/catch-async";
import { IRequest } from "@/core/types/auth.types";
import multer from "multer";
import { ApiError } from "@/core/middleware/error.middleware";

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile/
   * Get current user's profile information
   */
  getProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as IRequest).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    console.log(`👤 Getting profile for user ${userId}`);

    try {
      const profile = await this.profileService.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({
          error: "Profile not found",
          message: "User profile could not be found",
        });
      }

      console.log(`✅ Profile retrieved for user ${userId}`);
      return res.status(200).json(profile);
    } catch (error) {
      console.error(`❌ Failed to get profile for user ${userId}:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve profile",
      });
    }
  });

  /**
   * PUT /profile/
   * Update current user's profile information
   */
  updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as IRequest).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    console.log(`👤 Updating profile for user ${userId}`);

    try {
      const updatedProfile = await this.profileService.updateUserProfile(
        userId,
        req.body,
      );

      console.log(`✅ Profile updated for user ${userId}`);
      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error(`❌ Failed to update profile for user ${userId}:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to update profile",
      });
    }
  });

  /**
   * POST /profile/upload-image/
   * Upload profile image
   */
  uploadImage = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as IRequest).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    console.log(`👤 Uploading image for user ${userId}`);

    try {
      const result = await this.profileService.uploadProfileImage(userId, req.file);

      console.log(`✅ Image uploaded for user ${userId}`);
      return res.status(201).json(result);
    } catch (error) {
      console.error(`❌ Failed to upload image for user ${userId}:`, error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.message,
          message: error.message,
        });
      }
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to upload image",
      });
    }
  });

  /**
   * GET /profile/view-follow-team/
   * Get user's followed teams
   */
  viewFollowTeam = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as IRequest).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    console.log(`👤 Getting followed teams for user ${userId}`);

    try {
      const followedTeams = await this.profileService.getFollowedTeams(userId);

      console.log(`✅ Followed teams retrieved for user ${userId}`);
      return res.status(200).json(followedTeams);
    } catch (error) {
      console.error(`❌ Failed to get followed teams for user ${userId}:`, error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve followed teams",
      });
    }
  });
}

