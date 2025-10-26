// src/modules/admin/sync.controller.ts
// Controller for sync status and manual triggers

import { Request, Response } from "express";
import { catchAsync } from "../../core/utils/catch-async";
import { ApiError } from "../../core/middleware/error.middleware";
import { ScheduledSyncService } from "../../syncer/scheduled-sync.service";
import { SyncLockService } from "../../syncer/sync-lock.service";

let scheduledSyncService: ScheduledSyncService | null = null;
let lockService: SyncLockService | null = null;

export function setScheduledSyncService(service: ScheduledSyncService): void {
  scheduledSyncService = service;
}

export function setLockService(service: SyncLockService): void {
  lockService = service;
}

export class SyncController {
  /**
   * GET /api/admin/sync/status
   * Get current sync status
   */
  getSyncStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!scheduledSyncService || !lockService) {
      throw new ApiError(500, "Sync service not initialized");
    }

    const status = scheduledSyncService.getSyncStatus();
    const metrics = await status.metrics;

    res.json({
      success: true,
      data: {
        isRunning: status.isRunning,
        lockInfo: status.lockInfo,
        lastFullSync: status.lastFullSync,
        lastMatchesSync: status.lastMatchesSync,
        lastNewMatchesCheck: status.lastNewMatchesCheck,
        metrics,
      },
    });
  });

  /**
   * POST /api/admin/sync/trigger/full
   * Manually trigger full sync
   */
  triggerFullSync = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!scheduledSyncService) {
      throw new ApiError(500, "Sync service not initialized");
    }

    await scheduledSyncService.triggerFullSync();

    res.json({
      success: true,
      message: "Full sync triggered",
    });
  });

  /**
   * POST /api/admin/sync/trigger/matches
   * Manually trigger matches sync
   */
  triggerMatchesSync = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!scheduledSyncService) {
      throw new ApiError(500, "Sync service not initialized");
    }

    await scheduledSyncService.triggerMatchesSync();

    res.json({
      success: true,
      message: "Matches sync triggered",
    });
  });

  /**
   * POST /api/admin/sync/trigger/new-matches
   * Manually trigger new matches check
   */
  triggerNewMatchesCheck = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      if (!scheduledSyncService) {
        throw new ApiError(500, "Sync service not initialized");
      }

      await scheduledSyncService.triggerNewMatchesCheck();

      res.json({
        success: true,
        message: "New matches check triggered",
      });
    },
  );
}

