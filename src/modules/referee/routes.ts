import { Router } from "express";
import { RefereeController } from "./referee.controller";
import { RefereeService } from "./referee.service";
import { RefereeRepository } from "./referee.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { refereeValidationSchemas } from "./referee.validator";

const router = Router();

// Dependency injection
const refereeRepository = new RefereeRepository();
const refereeService = new RefereeService(refereeRepository);
const refereeController = new RefereeController(refereeService);

// Based on Excel sheet endpoints

// GET /api/referee/ - Get referees (league, season)
router.get(
  "/",
  validateRequest(refereeValidationSchemas.getReferees, "query"),
  refereeController.getAllReferees,
);

// GET /api/referee/available-seasons/ - Get available seasons for referee
router.get(
  "/available-seasons/",
  validateRequest(refereeValidationSchemas.getAvailableSeasons, "query"),
  refereeController.getAvailableSeasons,
);

// GET /api/referee/career-stats/ - Get referee career statistics
router.get(
  "/career-stats/",
  validateRequest(refereeValidationSchemas.getCareerStats, "query"),
  refereeController.getCareerStats,
);

// GET /api/referee/fixtures/ - Get referee fixtures
router.get(
  "/fixtures/",
  validateRequest(refereeValidationSchemas.getRefereeFixtures, "query"),
  refereeController.getRefereeFixtures,
);

// GET /api/referee/info/ - Get referee information
router.get(
  "/info/",
  validateRequest(refereeValidationSchemas.getRefereeInfo, "query"),
  refereeController.getRefereeInfo,
);

// GET /api/referee/last-match/ - Get referee last match
router.get(
  "/last-match/",
  validateRequest(refereeValidationSchemas.getRefereeLastMatch, "query"),
  refereeController.getRefereeLastMatch,
);

export default router;

