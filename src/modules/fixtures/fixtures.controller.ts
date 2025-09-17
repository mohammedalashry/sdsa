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

