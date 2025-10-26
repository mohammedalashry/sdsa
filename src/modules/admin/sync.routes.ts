// src/modules/admin/sync.routes.ts
// Routes for sync management

import { Router, Request, Response, NextFunction } from "express";
import { SyncController } from "./sync.controller";
import { authenticate } from "../../core/middleware/auth.middleware";
import { ApiError } from "../../core/middleware/error.middleware";

const router = Router();
const syncController = new SyncController();

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Admin access required",
    });
  }
  next();
};

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

router.get("/status", syncController.getSyncStatus);
router.post("/trigger/full", syncController.triggerFullSync);
router.post("/trigger/matches", syncController.triggerMatchesSync);
router.post("/trigger/new-matches", syncController.triggerNewMatchesCheck);

export default router;

