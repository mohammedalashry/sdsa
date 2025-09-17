import { Router } from "express";
import { FixturesController } from "./fixtures.controller";
import { FixturesService } from "./fixtures.service";
import { FixturesRepository } from "./fixtures.repository";

import { validateRequest } from "../../core/middleware/validation.middleware";
import { fixturesValidationSchemas } from "./fixtures.validator";

const router = Router();

// // ===== DEPENDENCY INJECTION SETUP =====

// // Repository layer
const fixturesRepository = new FixturesRepository();

// // Service layer
const fixturesService = new FixturesService(fixturesRepository);

// Controller layer
const fixturesController = new FixturesController(fixturesService);

// ===== ROUTE DEFINITIONS =====
// Based on Excel sheet endpoints

// GET /api/fixture/ - Get fixtures with filters (date, league, round, season)
router.get(
  "/",
  validateRequest(fixturesValidationSchemas.getFixtures, "query"),
  fixturesController.retrieve,
);

// GET /api/fixture/comparison/ - Compare two fixtures
router.get(
  "/comparison/",
  validateRequest(fixturesValidationSchemas.getFixtureComparison, "query"),
  fixturesController.getFixtureComparison,
);

// GET /api/fixture/details/ - Get detailed fixture information
router.get(
  "/details/",
  validateRequest(fixturesValidationSchemas.getFixtureDetails, "query"),
  fixturesController.getFixtureDetails,
);

// GET /api/fixture/heatmap/ - Get fixture heatmap data
router.get(
  "/heatmap/",
  validateRequest(fixturesValidationSchemas.getFixtureHeatmap, "query"),
  fixturesController.getFixtureHeatmap,
);

// GET /api/fixture/highlights/ - Get fixture highlights
router.get(
  "/highlights/",
  validateRequest(fixturesValidationSchemas.getFixtureHighlights, "query"),
  fixturesController.getFixtureHighlights,
);

// GET /api/fixture/landing-live/ - Get live fixtures for landing page
router.get("/landing-live/", fixturesController.getLandingLiveFixtures);

// GET /api/fixture/live/ - Get live fixtures
router.get(
  "/live/",
  validateRequest(fixturesValidationSchemas.getLiveFixtures, "query"),
  fixturesController.getLiveFixtures,
);

// GET /api/fixture/momentum/ - Get fixture momentum data
router.get(
  "/momentum/",
  validateRequest(fixturesValidationSchemas.getFixtureMomentum, "query"),
  fixturesController.getFixtureMomentum,
);
// FOR FRONTEND And Not Found or needed
// GET /api/fixture/prediction/ - Get fixture prediction
router.get(
  "/prediction/",
  validateRequest(fixturesValidationSchemas.getFixturePrediction, "query"),
  fixturesController.getFixturePrediction,
);

// GET /api/fixture/results/ - Get fixture results
router.get(
  "/results/",
  validateRequest(fixturesValidationSchemas.getFixtureResults, "query"),
  fixturesController.getFixtureResults,
);

// GET /api/fixture/shotmap/ - Get fixture shotmap
router.get(
  "/shotmap/",
  validateRequest(fixturesValidationSchemas.getFixtureShotmap, "query"),
  fixturesController.getFixtureShotmap,
);

// GET /api/fixture/top-performers/ - Get top performers for fixture
router.get(
  "/top-performers/",
  validateRequest(fixturesValidationSchemas.getFixtureTopPerformers, "query"),
  fixturesController.getFixtureTopPerformers,
);

// GET /api/fixture/upcoming/ - Get upcoming fixtures
router.get(
  "/upcoming/",
  validateRequest(fixturesValidationSchemas.getUpcomingFixtures, "query"),
  fixturesController.getUpcomingFixtures,
);

export default router;

