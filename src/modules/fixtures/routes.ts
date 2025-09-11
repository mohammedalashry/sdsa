// src/modules/fixtures/routes.ts
import { Router } from "express";
import { FixturesController } from "./fixtures.controller";
import { FixturesService } from "./fixtures.service";
import { FixturesRepository } from "./fixtures.repository";

import { validateRequest } from "../../core/middleware/validation.middleware";
import { fixturesValidationSchemas } from "./fixtures.validator";

const router = Router();

// // ===== DEPENDENCY INJECTION SETUP =====

// // Core Korastats client
// const korastatsClient = new KorastatsClient();

// // Korastats services
// const fixtureKorastatsService = new FixtureKorastatsService(korastatsClient);
// const leagueKorastatsService = new LeagueKorastatsService(korastatsClient); // Needed for tournament mapping

// // Cache service
// const cacheService = new CacheService();

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
// /**
//  * GET /fixture/upcoming/
//  * Django: FixtureViewSet.get_upcoming_fixture()
//  * Params: league (required), season (required)
//  * Returns: List[FixtureData]
//  */
// router.get("/upcoming", fixturesController.getUpcomingFixtures);

// /**
//  * GET /fixture/results/
//  * Django: FixtureViewSet.get_last_ten_fixtures_by_rounds()
//  * Params: league (required), season (required), round (required)
//  * Returns: List[FixtureData] (sorted by timestamp desc)
//  */
// router.get("/results", fixturesController.getResults);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/details/
//  * Django: FixtureViewSet.get_fixture_detail()
//  * Params: id (required)
//  * Returns: FixtureDetailed (comprehensive match data)
//  *
//  * WARNING: This endpoint requires multiple Korastats API calls:
//  * - MatchEventList (events/timeline)
//  * - MatchPlayerStats (player statistics)
//  * - Tournament structure (for team/league mapping)
//  * - Potentially 5-10 API calls per request
//  */
// router.get("/details", fixturesController.getFixtureDetails);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/prediction/
//  * Django: FixtureViewSet.get_prediction()
//  * Params: fixture (required)
//  * Returns: Predictions | {} (empty object if no data)
//  *
//  * NOTE: Korastats may not have prediction data
//  * Consider implementing custom prediction logic or external service
//  */
// router.get("/prediction", fixturesController.getFixturePredictions);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/comparison/
//  * Django: FixtureViewSet.get_comparison()
//  * Params: fixture (required)
//  * Returns: List[ComparisonData]
//  *
//  * CHALLENGE: Requires team performance analysis and soccer expertise
//  * Need to compare key metrics between teams
//  */
// router.get("/comparison", fixturesController.getFixtureComparison);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/momentum/
//  * Django: FixtureViewSet.get_momentum()
//  * Params: fixture (required)
//  * Returns: MomentumResponse
//  *
//  * CHALLENGE: Requires soccer analysis to calculate momentum from events
//  * Need expertise in how different events affect team momentum
//  */
// router.get("/momentum", fixturesController.getFixtureMomentum);

// /**
//  * GET /fixture/highlights/
//  * Django: FixtureViewSet.get_highlight()
//  * Params: fixture (required)
//  * Returns: MatchHighlights
//  *
//  * NOTE: Falls back to default YouTube channel if no specific highlights
//  */
// router.get("/highlights", fixturesController.getFixtureHighlights);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/heatmap/
//  * Django: FixtureViewSet.get_fixture_heatmap()
//  * Params: fixture (required)
//  * Returns: List[FixtureTeamHeatmap]
//  *
//  * MAJOR CHALLENGE: Coordinate system conversion
//  * - Korastats uses A1-E8 grid system (from MatchLocationAttempts)
//  * - Need to convert to standard football field coordinates
//  * - Requires understanding of field dimensions and player positioning
//  */
// router.get("/heatmap", fixturesController.getFixtureHeatmap);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/shotmap/
//  * Django: FixtureViewSet.get_fixture_shotmap()
//  * Params: fixture (required)
//  * Returns: List[TeamShotmapData]
//  *
//  * MAJOR CHALLENGE: Shot analysis and coordinate mapping
//  * - Convert Korastats location data to shot coordinates
//  * - Classify shot types (on target, off target, blocked, etc.)
//  * - Determine shot situations (regular play, set piece, counter attack)
//  * - Requires soccer analysis expertise
//  */
// router.get("/shotmap", fixturesController.getFixtureShotmap);

// /**
//  * COMPLEX ENDPOINT: GET /fixture/top-performers/
//  * Django: FixtureViewSet.get_top_performers()
//  * Params: fixture (required)
//  * Returns: FixtureTopPerformers
//  *
//  * MAJOR CHALLENGE: Player performance analysis
//  * - Analyze player statistics to determine top performers
//  * - Calculate ratings for different categories (scorer, assister, keeper)
//  * - Requires soccer statistics expertise and rating algorithms
//  */
// router.get("/top-performers", fixturesController.getFixtureTopPerformers);

export default router;

// // ===== ROUTE CONFIGURATION NOTES =====

// /**
//  * IMPLEMENTATION STRATEGY:
//  *
//  * Phase 1 - Basic Endpoints (IMMEDIATE):
//  * ✅ GET /fixture/ - Primary fixture listing
//  * ✅ GET /fixture/upcoming/ - Upcoming matches
//  * ✅ GET /fixture/results/ - Match results
//  * ✅ GET /fixture/highlights/ - Video highlights (with fallback)
//  *
//  * Phase 2 - Detailed Data (NEXT):
//  * 🔄 GET /fixture/details/ - Comprehensive match data
//  * 🔄 GET /fixture/prediction/ - Match predictions (may return empty)
//  * 🔄 GET /fixture/comparison/ - Team comparison
//  *
//  * Phase 3 - Advanced Analysis (LATER):
//  * ⚠️  GET /fixture/momentum/ - Momentum calculation
//  * ⚠️  GET /fixture/heatmap/ - Player positioning
//  * ⚠️  GET /fixture/shotmap/ - Shot analysis
//  * ⚠️  GET /fixture/top-performers/ - Performance analysis
//  *
//  * PRIORITY RECOMMENDATIONS:
//  *
//  * 1. **Start with Phase 1** - Get basic fixture data flowing
//  * 2. **Implement robust error handling** - Many endpoints will fail initially
//  * 3. **Add comprehensive logging** - Track which endpoints are working
//  * 4. **Use graceful degradation** - Return partial data when some calls fail
//  * 5. **Monitor performance** - Complex endpoints may be slow
//  *
//  * EXPERT CONSULTATION NEEDED:
//  *
//  * 1. **Soccer Analyst** - For momentum, comparison, and performance calculations
//  * 2. **Sports Data Engineer** - For coordinate system mapping
//  * 3. **Frontend Developer** - To understand exact data requirements
//  * 4. **Performance Engineer** - For optimization and caching strategies
//  *
//  * TECHNICAL DEBT TO TRACK:
//  *
//  * 1. **ID Mapping System** - Need robust league/tournament ID mapping
//  * 2. **Coordinate Conversion** - Grid system to field coordinates
//  * 3. **Performance Optimization** - Multiple API calls per request
//  * 4. **Rate Limiting** - Korastats API limits and backoff strategies
//  * 5. **Cache Strategy** - Balance freshness vs performance
//  * 6. **Error Recovery** - Fallback strategies when Korastats unavailable
//  */

