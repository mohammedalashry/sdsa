import { Router } from "express";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "@/modules/teams/teams.service";
import { TeamsRepository } from "./teams.repository";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { teamsValidationSchemas } from "./teams.validator";

const router = Router();

// Dependency injection setup
const cacheService = new CacheService();
const teamsRepository = new TeamsRepository(cacheService);
const teamsService = new TeamsService(teamsRepository);
const teamsController = new TeamsController(teamsService);

// Apply authentication middleware to all routes
// router.use(authenticate); // Temporarily disabled for testing

// Based on Excel sheet endpoints

// GET /api/team/ - Get teams with filters (league, season)
router.get(
  "/",
  validateRequest(teamsValidationSchemas.getTeams, "query"),
  teamsController.getTeams,
);

// GET /api/team/available-seasons/ - Get available seasons for team
router.get(
  "/available-seasons/",
  validateRequest(teamsValidationSchemas.getAvailableSeasons, "query"),
  teamsController.getAvailableSeasons,
);

// GET /api/team/comparison/stats/ - Compare team statistics
router.get(
  "/comparison/stats/",
  validateRequest(teamsValidationSchemas.getTeamComparisonStats, "query"),
  teamsController.getTeamComparisonStats,
);

// GET /api/team/fixtures/ - Get team fixtures
router.get(
  "/fixtures/",
  validateRequest(teamsValidationSchemas.getTeamFixtures, "query"),
  teamsController.getTeamFixtures,
);

// POST /api/team/follow-team/ - Follow a team
router.post(
  "/follow-team/",
  validateRequest(teamsValidationSchemas.followTeam, "body"),
  teamsController.followTeam,
);

// GET /api/team/is-following/ - Check if following team
router.get(
  "/is-following/",
  validateRequest(teamsValidationSchemas.isFollowingTeam, "query"),
  teamsController.isFollowingTeam,
);

// POST /api/team/unfollow-team/ - Unfollow a team
router.post(
  "/unfollow-team/",
  validateRequest(teamsValidationSchemas.unfollowTeam, "body"),
  teamsController.unfollowTeam,
);

// GET /api/team/form-over-time/ - Get team form over time
router.get(
  "/form-over-time/",
  validateRequest(teamsValidationSchemas.getTeamFormOverTime, "query"),
  teamsController.getTeamFormOverTime,
);
router.get(
  "/form-overview/",
  validateRequest(teamsValidationSchemas.getTeamFormOverview, "query"),
  teamsController.getTeamFormOverview,
);
// GET /api/team/upcoming-fixture/ - Get upcoming fixture for team
router.get(
  "/upcoming-fixture/",
  validateRequest(teamsValidationSchemas.getUpcomingFixture, "query"),
  teamsController.getUpcomingFixture,
);

// GET /api/team/stats/ - Get team statistics
router.get(
  "/stats/",
  validateRequest(teamsValidationSchemas.getTeamStats, "query"),
  teamsController.getTeamStats,
);

// GET /api/team/squad/ - Get team squad
router.get(
  "/squad/",
  validateRequest(teamsValidationSchemas.getTeamSquad, "query"),
  teamsController.getTeamSquad,
);

// GET /api/team/position-overtime/ - Get team position over time
router.get(
  "/position-overtime/",
  validateRequest(teamsValidationSchemas.getTeamPositionOverTime, "query"),
  teamsController.getTeamPositionOverTime,
);

// GET /api/team/last-fixture/ - Get last fixture for team
router.get(
  "/last-fixture/",
  validateRequest(teamsValidationSchemas.getLastFixture, "query"),
  teamsController.getLastFixture,
);

// GET /api/team/info/ - Get team information
router.get(
  "/info/",
  validateRequest(teamsValidationSchemas.getTeamInfo, "query"),
  teamsController.getTeamInfo,
);

// GET /api/team/goals-over-time/ - Get team goals over time
router.get(
  "/goals-over-time/",
  validateRequest(teamsValidationSchemas.getTeamGoalsOverTime, "query"),
  teamsController.getTeamGoalsOverTime,
);

// GET /api/team/lineup/ - Get team lineup
router.get(
  "/lineup/",
  validateRequest(teamsValidationSchemas.getTeamLineup, "query"),
  teamsController.getTeamLineup,
);

export default router;

