import { Router } from "express";
import { PlayersController } from "./players.controller";
import { PlayersService } from "./players.service";
import { PlayersRepository } from "./players.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { playersValidationSchemas } from "./players.validator";

const router = Router();

// Dependency injection
const playersRepository = new PlayersRepository();
const playersService = new PlayersService(playersRepository);
const playersController = new PlayersController(playersService);

// Based on Excel sheet endpoints

// GET /api/player/career/ - Get player career data
router.get(
  "/career/",
  validateRequest(playersValidationSchemas.getPlayerCareer, "query"),
  playersController.getPlayerCareer,
);

// GET /api/player/comparison/stats/ - Compare player statistics
router.get(
  "/comparison/stats/",
  validateRequest(playersValidationSchemas.getPlayerComparisonStats, "query"),
  playersController.getPlayerComparisonStats,
);

// GET /api/player/fixtures/ - Get player fixtures
router.get(
  "/fixtures/",
  validateRequest(playersValidationSchemas.getPlayerFixtures, "query"),
  playersController.getPlayerFixtures,
);

// GET /api/player/heatmap/ - Get player heatmap
router.get(
  "/heatmap/",
  validateRequest(playersValidationSchemas.getPlayerHeatmap, "query"),
  playersController.getPlayerHeatmap,
);

// GET /api/player/info/ - Get player information
router.get(
  "/info/",
  validateRequest(playersValidationSchemas.getPlayerInfo, "query"),
  playersController.getPlayerInfo,
);

// GET /api/player/shotmap/ - Get player shotmap
router.get(
  "/shotmap/",
  validateRequest(playersValidationSchemas.getPlayerShotmap, "query"),
  playersController.getPlayerShotmap,
);

// GET /api/player/stats/ - Get player statistics
router.get(
  "/stats/",
  validateRequest(playersValidationSchemas.getPlayerStats, "query"),
  playersController.getPlayerStats,
);

// GET /api/player/topassists/ - Get top assists
router.get(
  "/topassists/",
  validateRequest(playersValidationSchemas.getTopAssists, "query"),
  playersController.getTopAssists,
);

// GET /api/player/topscorers/ - Get top scorers
router.get(
  "/topscorers/",
  validateRequest(playersValidationSchemas.getTopScorers, "query"),
  playersController.getTopScorers,
);

// GET /api/player/traits/ - Get player traits
router.get(
  "/traits/",
  validateRequest(playersValidationSchemas.getPlayerTraits, "query"),
  playersController.getPlayerTraits,
);

// GET /api/player/transfer/ - Get player transfer data
router.get(
  "/transfer/",
  validateRequest(playersValidationSchemas.getPlayerTransfer, "query"),
  playersController.getPlayerTransfer,
);

// GET /api/player/trophies/ - Get player trophies
router.get(
  "/trophies/",
  validateRequest(playersValidationSchemas.getPlayerTrophies, "query"),
  playersController.getPlayerTrophies,
);

export default router;

