import { Router } from "express";
import { LeaguesController } from "./leagues.controller";
import { LeaguesService } from "./leagues.service";
import { LeaguesRepository } from "./leagues.repository";
import { LeagueKorastatsService } from "../../integrations/korastats/services/league.service";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { KorastatsClient } from "../../integrations/korastats/client";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { leaguesValidationSchemas } from "./leagues.validator";

const router = Router();

// Dependency injection
const korastatsClient = new KorastatsClient();
const leagueKorastatsService = new LeagueKorastatsService(korastatsClient);
const cacheService = new CacheService();
const leaguesRepository = new LeaguesRepository(leagueKorastatsService, cacheService);
const leaguesService = new LeaguesService(leaguesRepository);
const leaguesController = new LeaguesController(leaguesService);

// Based on Excel sheet endpoints

// GET /api/league/ - Get leagues
router.get(
  "/",
  validateRequest(leaguesValidationSchemas.getLeagues, "query"),
  leaguesController.retrieve,
);

// GET /api/league/historical-winners/ - Get historical winners
router.get(
  "/historical-winners/",
  validateRequest(leaguesValidationSchemas.getHistoricalWinners, "query"),
  leaguesController.getHistoricalWinners,
);

// GET /api/league/last-fixture/ - Get last fixture
router.get(
  "/last-fixture/",
  validateRequest(leaguesValidationSchemas.getLastFixture, "query"),
  leaguesController.getLastFixture,
);

// GET /api/league/rounds/ - Get league rounds
router.get(
  "/rounds/",
  validateRequest(leaguesValidationSchemas.getLeagueRounds, "query"),
  leaguesController.getLeagueRounds,
);

export default router;

