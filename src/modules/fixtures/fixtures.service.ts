// src/modules/fixtures/services/fixtures.service.ts
import { FixturesRepository } from "./fixtures.repository";
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

export class FixturesService {
  constructor(private readonly fixturesRepository: FixturesRepository) {}

  /**
   * GET /fixture/ - Main fixture listing
   */
  async getFixtures(options: {
    league: number;
    season?: number;
    round?: string;
    date?: string;
    status?: string;
  }): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getFixtures(options);
  }

  /**
   * GET /fixture/comparison/ - Compare two fixtures
   */
  async getFixtureComparison(fixtureId: number): Promise<FixtureComparisonResponse> {
    return await this.fixturesRepository.getFixtureComparison(fixtureId);
  }

  /**
   * GET /fixture/details/ - Get detailed fixture information
   */
  async getFixtureDetails(fixtureId: number): Promise<FixtureDetailedResponse> {
    return await this.fixturesRepository.getFixtureDetails(fixtureId);
  }

  /**
   * GET /fixture/heatmap/ - Get fixture heatmap data
   */
  async getFixtureHeatmap(fixtureId: number): Promise<FixtureHeatmapResponse> {
    return await this.fixturesRepository.getFixtureHeatmap(fixtureId);
  }

  /**
   * GET /fixture/landing-live/ - Get live fixtures for landing page
   */
  async getLandingLiveFixtures(): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getLandingLiveFixtures();
  }

  /**
   * GET /fixture/live/ - Get live fixtures
   */
  async getLiveFixtures(league: number): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getLiveFixtures(league);
  }

  /**
   * GET /fixture/momentum/ - Get fixture momentum data
   */
  async getFixtureMomentum(fixtureId: number): Promise<FixtureMomentumResponse> {
    return await this.fixturesRepository.getFixtureMomentum(fixtureId);
  }

  /**
   * GET /fixture/prediction/ - Get fixture prediction
   */
  async getFixturePrediction(fixtureId: number): Promise<FixturePredictionsResponse> {
    return await this.fixturesRepository.getFixturePredictions(fixtureId);
  }

  /**
   * GET /fixture/results/ - Get fixture results
   */
  async getFixtureResults(options: {
    league: number;
    round: string;
    season: number;
  }): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getResults(options);
  }

  /**
   * GET /fixture/shotmap/ - Get fixture shotmap
   */
  async getFixtureShotmap(fixtureId: number): Promise<FixtureShotmapResponse> {
    return await this.fixturesRepository.getFixtureShotmap(fixtureId);
  }

  /**
   * GET /fixture/top-performers/ - Get top performers for fixture
   */
  async getFixtureTopPerformers(
    fixtureId: number,
  ): Promise<FixtureTopPerformersResponse> {
    return await this.fixturesRepository.getFixtureTopPerformers(fixtureId);
  }

  /**
   * GET /fixture/upcoming/ - Get upcoming fixtures
   */
  async getUpcomingFixtures(options: {
    league: number;
    season: number;
  }): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getUpcomingFixtures(options);
  }

  /**
   * GET /fixture/highlights/ - Get fixture highlights
   */
  async getFixtureHighlights(fixtureId: number): Promise<FixtureHighlightsResponse> {
    return await this.fixturesRepository.getFixtureHighlights(fixtureId);
  }
}

