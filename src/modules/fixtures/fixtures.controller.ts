// src/modules/fixtures/controllers/fixtures.controller.ts
import { Request, Response } from "express";
import { FixturesService } from "./fixtures.service";
import { catchAsync } from "../../core/utils/catch-async";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { fixturesValidationSchemas } from "./fixtures.validator";
import {
  FixtureDataResponse,
  FixtureDetailedResponse,
  FixtureComparisonResponse,
  FixturePredictionsResponse,
  FixtureMomentumResponse,
  FixtureHighlightsResponse,
  FixtureHeatmapResponse,
  FixtureShotmapResponse,
  FixtureTopPerformersResponse,
} from "../../legacy-types/fixtures.types";

export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  /**
   * GET /api/fixture/
   * Get fixtures with filters (date, league, round, season)
   */
  retrieve = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season, round, date } = req.query;

    const fixtures: FixtureDataResponse = await this.fixturesService.getFixtures({
      league: Number(league),
      season: Number(season),
      round: round as string,
      date: date as string,
    });

    res.json(fixtures);
  });

  /**
   * GET /api/fixture/comparison/
   * Compare two fixtures
   */
  getFixtureComparison = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fixture } = req.query;

      const comparison: FixtureComparisonResponse =
        await this.fixturesService.getFixtureComparison(Number(fixture));

      res.json(comparison);
    },
  );

  /**
   * GET /api/fixture/details/
   * Get detailed fixture information
   */
  getFixtureDetails = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.query;

    const fixtureDetails: FixtureDetailedResponse =
      await this.fixturesService.getFixtureDetails(Number(id));

    res.json(fixtureDetails);
  });

  /**
   * GET /api/fixture/heatmap/
   * Get fixture heatmap data
   */
  getFixtureHeatmap = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fixture } = req.query;

    const heatmap: FixtureHeatmapResponse = await this.fixturesService.getFixtureHeatmap(
      Number(fixture),
    );

    res.json(heatmap);
  });

  /**
   * GET /api/fixture/landing-live/
   * Get live fixtures for landing page
   */
  getLandingLiveFixtures = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const fixtures: FixtureDataResponse =
        await this.fixturesService.getLandingLiveFixtures();

      res.json(fixtures);
    },
  );

  /**
   * GET /api/fixture/live/
   * Get live fixtures
   */
  getLiveFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league } = req.query;

    const fixtures: FixtureDataResponse = await this.fixturesService.getLiveFixtures(
      Number(league),
    );

    res.json(fixtures);
  });

  /**
   * GET /api/fixture/momentum/
   * Get fixture momentum data
   */
  getFixtureMomentum = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fixture } = req.query;

    const momentum: FixtureMomentumResponse =
      await this.fixturesService.getFixtureMomentum(Number(fixture));

    res.json(momentum);
  });

  /**
   * GET /api/fixture/prediction/
   * Get fixture prediction
   */
  getFixturePrediction = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fixture } = req.query;

      const prediction: FixturePredictionsResponse =
        await this.fixturesService.getFixturePrediction(Number(fixture));

      res.json(prediction);
    },
  );

  /**
   * GET /api/fixture/results/
   * Get fixture results
   */
  getFixtureResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, round, season } = req.query;

    const results: FixtureDataResponse = await this.fixturesService.getFixtureResults({
      league: Number(league),
      round: round as string,
      season: Number(season),
    });

    res.json(results);
  });

  /**
   * GET /api/fixture/shotmap/
   * Get fixture shotmap
   */
  getFixtureShotmap = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fixture } = req.query;

    const shotmap: FixtureShotmapResponse = await this.fixturesService.getFixtureShotmap(
      Number(fixture),
    );

    res.json(shotmap);
  });

  /**
   * GET /api/fixture/top-performers/
   * Get top performers for fixture
   */
  getFixtureTopPerformers = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fixture } = req.query;

      const topPerformers: FixtureTopPerformersResponse =
        await this.fixturesService.getFixtureTopPerformers(Number(fixture));

      res.json(topPerformers);
    },
  );

  /**
   * GET /api/fixture/upcoming/
   * Get upcoming fixtures
   */
  getUpcomingFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const fixtures: FixtureDataResponse = await this.fixturesService.getUpcomingFixtures({
      league: Number(league),
      season: Number(season),
    });

    res.json(fixtures);
  });

  /**
   * GET /api/fixture/:id
   * Get fixture by ID (legacy route)
   */
  getFixtureById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const fixture: FixtureDetailedResponse = await this.fixturesService.getFixtureById(
      Number(id),
    );

    res.json(fixture);
  });

  /**
   * GET /api/fixture/highlights/
   * Get fixture highlights
   */
  getFixtureHighlights = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fixture } = req.query;

      const highlights: FixtureHighlightsResponse =
        await this.fixturesService.getFixtureHighlights(Number(fixture));

      res.json(highlights);
    },
  );
}
//   /**
//    * GET /fixture/upcoming/
//    * Get upcoming fixtures for a league/season
//    * Query params: league (required), season (required)
//    */
//   getUpcomingFixtures = catchAsync(async (req: Request, res: Response) => {
//     const { league, season } = req.query;

//     console.log(`📅 GET /fixture/upcoming/ - league: ${league}, season: ${season}`);

//     const leagueId = parseInt(league as string, 10);
//     const seasonYear = parseInt(season as string, 10);

//     if (isNaN(leagueId) || isNaN(seasonYear)) {
//       return res.status(400).json({
//         error: "Invalid parameters",
//         message: "League and season must be valid integers",
//       });
//     }

//     const fixtures = await this.fixturesService.getUpcomingFixtures(leagueId, seasonYear);

//     console.log(
//       `✅ Returning ${fixtures.length} upcoming fixtures for league ${leagueId}`,
//     );
//     res.json(fixtures);
//   });

//   /**
//    * GET /fixture/results/
//    * Get match results for a specific round
//    * Query params: league (required), season (required), round (required)
//    */
//   getResults = catchAsync(async (req: Request, res: Response) => {
//     const { league, season, round } = req.query;

//     console.log(
//       `🏁 GET /fixture/results/ - league: ${league}, season: ${season}, round: ${round}`,
//     );

//     const leagueId = parseInt(league as string, 10);
//     const seasonYear = parseInt(season as string, 10);
//     const roundParam = round as string;

//     if (isNaN(leagueId) || isNaN(seasonYear) || !roundParam) {
//       return res.status(400).json({
//         error: "Invalid parameters",
//         message: "League, season, and round are required",
//       });
//     }

//     const fixtures = await this.fixturesService.getResults(
//       leagueId,
//       seasonYear,
//       roundParam,
//     );

//     console.log(
//       `✅ Returning ${fixtures.length} results for league ${leagueId}, round ${roundParam}`,
//     );
//     res.json(fixtures);
//   });

//   /**
//    * GET /fixture/details/
//    * Get detailed fixture information including events, lineups, stats
//    * Query params: id (required)
//    */
//   getFixtureDetails = catchAsync(async (req: Request, res: Response) => {
//     const { id } = req.query;

//     console.log(`🔍 GET /fixture/details/ - id: ${id}`);

//     const fixtureId = parseInt(id as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(
//       `⚠️  WARNING: Detailed fixture data requires complex mapping and multiple API calls`,
//     );

//     const fixtureDetails = await this.fixturesService.getFixtureDetails(fixtureId);

//     console.log(`✅ Returning detailed fixture data for fixture ${fixtureId}`);
//     res.json(fixtureDetails);
//   });

//   /**
//    * GET /fixture/prediction/
//    * Get match predictions and analysis
//    * Query params: fixture (required)
//    */
//   getFixturePredictions = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`🔮 GET /fixture/prediction/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(`⚠️  NOTE: Predictions may not be available in Korastats API`);

//     const predictions = await this.fixturesService.getFixturePredictions(fixtureId);

//     // Django returns empty object {} when no predictions found
//     if (!predictions) {
//       console.log(
//         `📭 No predictions found for fixture ${fixtureId} - returning empty object`,
//       );
//       res.json({});
//     } else {
//       console.log(`✅ Returning predictions for fixture ${fixtureId}`);
//       res.json(predictions);
//     }
//   });

//   /**
//    * GET /fixture/comparison/
//    * Get team comparison data
//    * Query params: fixture (required)
//    */
//   getFixtureComparison = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`⚖️  GET /fixture/comparison/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(`⚠️  NOTE: Comparison requires complex team performance analysis`);

//     const comparison = await this.fixturesService.getFixtureComparison(fixtureId);

//     console.log(
//       `✅ Returning ${comparison.length} comparison items for fixture ${fixtureId}`,
//     );
//     res.json(comparison);
//   });

//   /**
//    * GET /fixture/momentum/
//    * Get momentum analysis throughout the match
//    * Query params: fixture (required)
//    */
//   getFixtureMomentum = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`📈 GET /fixture/momentum/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(`⚠️  NOTE: Momentum calculation requires soccer analysis expertise`);

//     const momentum = await this.fixturesService.getFixtureMomentum(fixtureId);

//     console.log(`✅ Returning momentum data for fixture ${fixtureId}`);
//     res.json(momentum);
//   });

//   /**
//    * GET /fixture/highlights/
//    * Get match highlights video links
//    * Query params: fixture (required)
//    */
//   getFixtureHighlights = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`🎥 GET /fixture/highlights/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     const highlights = await this.fixturesService.getFixtureHighlights(fixtureId);

//     console.log(
//       `✅ Returning highlights for fixture ${fixtureId}: ${highlights.host} - ${highlights.url}`,
//     );
//     res.json(highlights);
//   });

//   /**
//    * GET /fixture/heatmap/
//    * Get player heatmap data showing positioning and movement
//    * Query params: fixture (required)
//    */
//   getFixtureHeatmap = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`🗺️  GET /fixture/heatmap/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(`⚠️  WARNING: Heatmap requires coordinate system expertise`);
//     console.log(`⚠️  Need to convert Korastats grid system to field coordinates`);

//     const heatmap = await this.fixturesService.getFixtureHeatmap(fixtureId);

//     console.log(`✅ Returning heatmap data for fixture ${fixtureId}`);
//     res.json(heatmap);
//   });

//   /**
//    * GET /fixture/shotmap/
//    * Get shot map showing all shots and their locations
//    * Query params: fixture (required)
//    */
//   getFixtureShotmap = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`🎯 GET /fixture/shotmap/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(
//       `⚠️  WARNING: Shot map requires coordinate system and shot analysis expertise`,
//     );

//     const shotmap = await this.fixturesService.getFixtureShotmap(fixtureId);

//     console.log(`✅ Returning shot map data for fixture ${fixtureId}`);
//     res.json(shotmap);
//   });

//   /**
//    * GET /fixture/top-performers/
//    * Get top performing players in the match
//    * Query params: fixture (required)
//    */
//   getFixtureTopPerformers = catchAsync(async (req: Request, res: Response) => {
//     const { fixture } = req.query;

//     console.log(`🏆 GET /fixture/top-performers/ - fixture: ${fixture}`);

//     const fixtureId = parseInt(fixture as string, 10);

//     if (isNaN(fixtureId)) {
//       return res.status(400).json({
//         error: "Invalid fixture ID",
//         message: "Fixture ID must be a valid integer",
//       });
//     }

//     console.log(
//       `⚠️  WARNING: Top performers analysis requires soccer statistics expertise`,
//     );

//     const topPerformers = await this.fixturesService.getFixtureTopPerformers(fixtureId);

//     console.log(`✅ Returning top performers for fixture ${fixtureId}`);
//     res.json(topPerformers);
//   });
// }

// // ===== CONTROLLER NOTES =====

// /**
//  * CONTROLLER IMPLEMENTATION NOTES:
//  *
//  * 1. **Error Handling**:
//  *    - Uses catchAsync wrapper for automatic error handling
//  *    - Validates parameters before service calls
//  *    - Returns appropriate HTTP status codes
//  *
//  * 2. **Parameter Validation**:
//  *    - Required parameters checked for presence and type
//  *    - Date format validation for YYYY-MM-DD
//  *    - Numeric parameter parsing with error handling
//  *
//  * 3. **Logging Strategy**:
//  *    - Request logging with parameters
//  *    - Warning logs for complex endpoints
//  *    - Success logs with result counts
//  *
//  * 4. **Response Handling**:
//  *    - Direct JSON responses matching Django format
//  *    - Empty object {} for missing predictions (Django behavior)
//  *    - Empty arrays [] for missing comparison data
//  *
//  * 5. **Performance Considerations**:
//  *    - No response transformation in controller (done in mapper)
//  *    - Minimal processing in controller layer
//  *    - Caching handled in repository layer
//  *
//  * CHALLENGES TO MONITOR:
//  *
//  * 1. **Response Time**:
//  *    - Complex endpoints may be slow due to multiple API calls
//  *    - Monitor response times and add timeouts if needed
//  *
//  * 2. **Memory Usage**:
//  *    - Large fixture datasets could impact memory
//  *    - Consider pagination for large result sets
//  *
//  * 3. **Rate Limiting**:
//  *    - Korastats API may have rate limits
//  *    - Implement circuit breakers and backoff strategies
//  *
//  * 4. **Data Freshness**:
//  *    - Live match data needs frequent updates
//  *    - Balance cache duration vs data freshness
//  */

