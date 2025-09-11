// src/modules/standings/routes.ts
import { Router } from "express";
import { StandingsController } from "./standings.controller";
import { StandingsService } from "./standings.service";
import { StandingsRepository } from "./standings.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { standingsValidationSchemas } from "./standings.validator";

const router = Router();

// Dependency injection
const standingsRepository = new StandingsRepository();
const standingsService = new StandingsService(standingsRepository);
const standingsController = new StandingsController(standingsService);

// Based on Excel sheet endpoints

// GET /api/standings/ - Get standings (league, season)
router.get(
  "/",
  validateRequest(standingsValidationSchemas.getStandings, "query"),
  standingsController.retrieve,
);

// POST /api/standings/sync - Manually sync team rankings with Korastats
router.post(
  "/sync",
  standingsController.syncTeamRankings,
);

export default router;

