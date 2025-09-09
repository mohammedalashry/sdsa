// src/modules/profile/routes.ts
import { Router } from "express";
import { ProfileController } from "./controllers/profile.controller";
import { ProfileService } from "./services/profile.service";
import { authenticate } from "../../core/middleware/auth.middleware";
import { validateProfileUpdate } from "./validators/profile.validator";

const router = Router();

// ===== DEPENDENCY INJECTION SETUP =====

// Service layer
const profileService = new ProfileService();

// Controller layer
const profileController = new ProfileController(profileService);

// Based on Excel sheet endpoints

// GET /api/profile/ - Get profile
router.get("/", authenticate, profileController.getProfile);

// PUT /api/profile/ - Update profile
router.put("/", authenticate, validateProfileUpdate, profileController.updateProfile);

// POST /api/profile/upload-image/ - Upload profile image
router.post(
  "/upload-image/",
  authenticate /* validate(uploadImageValidation), */ /* uploadImage */,
);

// GET /api/profile/view-follow-team/ - View follow team
router.get("/view-follow-team/", authenticate /* viewFollowTeam */);

export default router;

