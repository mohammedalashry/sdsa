import { Router } from "express";
import { CoachController } from "./coach.controller";
import { CoachService } from "./coach.service";
import { CoachRepository } from "./coach.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { coachValidationSchemas } from "./coach.validator";

const router = Router();

// Dependency injection
const coachRepository = new CoachRepository();
const coachService = new CoachService(coachRepository);
const coachController = new CoachController(coachService);

// Based on Excel sheet endpoints

// GET /api/coach/ - Get coaches (league, season)
router.get(
  "/",
  validateRequest(coachValidationSchemas.getCoaches, "query"),
  coachController.getAllCoaches,
);

// GET /api/coach/available-leagues/ - Get available leagues for coach
router.get(
  "/available-leagues/",
  validateRequest(coachValidationSchemas.getAvailableLeagues, "query"),
  coachController.getAvailableLeagues,
);

// GET /api/coach/career/ - Get coach career
router.get(
  "/career/",
  validateRequest(coachValidationSchemas.getCoachCareer, "query"),
  coachController.getCoachCareer,
);

// GET /api/coach/career_stats/ - Get coach career statistics
router.get(
  "/career_stats/",
  validateRequest(coachValidationSchemas.getCoachCareerStats, "query"),
  coachController.getCoachCareerStats,
);

// GET /api/coach/fixtures/ - Get coach fixtures
router.get(
  "/fixtures/",
  validateRequest(coachValidationSchemas.getCoachFixtures, "query"),
  coachController.getCoachFixtures,
);

// GET /api/coach/info/ - Get coach information
router.get(
  "/info/",
  validateRequest(coachValidationSchemas.getCoachInfo, "query"),
  coachController.getCoachInfo,
);

// GET /api/coach/last-match/ - Get coach last match
router.get(
  "/last-match/",
  validateRequest(coachValidationSchemas.getCoachLastMatch, "query"),
  coachController.getCoachLastMatch,
);

// GET /api/coach/match-stats/ - Get coach match statistics
router.get(
  "/match-stats/",
  validateRequest(coachValidationSchemas.getCoachMatchStats, "query"),
  coachController.getCoachMatchStats,
);

// GET /api/coach/performance/ - Get coach performance
router.get(
  "/performance/",
  validateRequest(coachValidationSchemas.getCoachPerformance, "query"),
  coachController.getCoachPerformance,
);

// GET /api/coach/team-form/ - Get coach team form
router.get(
  "/team-form/",
  validateRequest(coachValidationSchemas.getCoachTeamForm, "query"),
  coachController.getCoachTeamForm,
);

// GET /api/coach/trophies/ - Get coach trophies
router.get(
  "/trophies/",
  validateRequest(coachValidationSchemas.getCoachTrophies, "query"),
  coachController.getCoachTrophies,
);

export default router;

