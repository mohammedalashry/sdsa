// src/modules/profile/routes.ts
import { Router } from "express";
import { ProfileController } from "./controllers/profile.controller";
import { ProfileService } from "./services/profile.service";
import { authenticate } from "../../core/middleware/auth.middleware";
import { validateProfileUpdate } from "./validators/profile.validator";
import multer from "multer";

const router = Router();

// ===== DEPENDENCY INJECTION SETUP =====

// Service layer
const profileService = new ProfileService();

// Controller layer
const profileController = new ProfileController(profileService);

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

// Based on Excel sheet endpoints

// GET /api/profile/ - Get profile
router.get("/", authenticate, profileController.getProfile);

// PUT /api/profile/ - Update profile
router.put("/", authenticate, validateProfileUpdate, profileController.updateProfile);

// POST /api/profile/upload-image/ - Upload profile image
router.post(
  "/upload-image/",
  authenticate,
  upload.single("file"),
  profileController.uploadImage,
);

// GET /api/profile/view-follow-team/ - View follow team
router.get("/view-follow-team/", authenticate, profileController.viewFollowTeam);

export default router;

