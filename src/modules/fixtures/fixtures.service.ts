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
    return await this.fixturesRepository.getFixturePrediction(fixtureId);
  }

  /**
   * GET /fixture/results/ - Get fixture results
   */
  async getFixtureResults(options: {
    league: number;
    round: string;
    season: number;
  }): Promise<FixtureDataResponse> {
    return await this.fixturesRepository.getFixtureResults(options);
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
   * GET /fixture/:id - Get fixture by ID (legacy route)
   */
  async getFixtureById(fixtureId: number): Promise<FixtureDetailedResponse> {
    return await this.fixturesRepository.getFixtureById(fixtureId);
  }

  /**
   * GET /fixture/highlights/ - Get fixture highlights
   */
  async getFixtureHighlights(fixtureId: number): Promise<FixtureHighlightsResponse> {
    return await this.fixturesRepository.getFixtureHighlights(fixtureId);
  }

  // /**
  //  * GET /fixture/upcoming/ - Upcoming matches
  //  */
  // async getUpcomingFixtures(params: {
  //   league: number;
  //   season: number;
  // }): Promise<FixtureData[]> {
  //   console.log(`📅 Getting upcoming fixtures for league ${params.league}`);

  //   try {
  //     const fixtures =
  //       await this.fixturesRepository.getUpcomingFixturesFromMongoDB(params);
  //     console.log(`✅ Found ${fixtures.length} upcoming fixtures`);
  //     return fixtures;
  //   } catch (error) {
  //     console.error("❌ Failed to get upcoming fixtures:", error);
  //     return [];
  //   }
  // }

  // /**
  //  * GET /fixture/results/ - Match results
  //  */
  // async getFixtureResults(params: {
  //   league: number;
  //   season: number;
  //   last?: number;
  // }): Promise<FixtureData[]> {
  //   console.log(`📊 Getting fixture results for league ${params.league}`);

  //   try {
  //     const fixtures =
  //       await this.fixturesRepository.getFinishedFixturesFromMongoDB(params);
  //     console.log(`✅ Found ${fixtures.length} finished fixtures`);
  //     return fixtures;
  //   } catch (error) {
  //     console.error("❌ Failed to get fixture results:", error);
  //     return [];
  //   }
  // }

  // /**
  //  * GET /fixture/details/ - Detailed fixture information
  //  */
  // async getFixtureDetails(fixtureId: number): Promise<FixtureDetailed | null> {
  //   console.log(`📋 Getting detailed info for fixture ${fixtureId}`);

  //   try {
  //     const details =
  //       await this.fixturesRepository.getFixtureDetailsFromMongoDB(fixtureId);

  //     if (!details) {
  //       console.warn(`⚠️ No details found for fixture ${fixtureId}`);
  //       return null;
  //     }

  //     console.log(`✅ Found detailed info for fixture ${fixtureId}`);
  //     return details;
  //   } catch (error) {
  //     console.error(`❌ Failed to get fixture details:`, error);
  //     return null;
  //   }
  // }

  // // Keep other methods as placeholders for now
  // async getFixturePredictions(fixtureId: number): Promise<Predictions | null> {
  //   console.log(`⚠️ Predictions not available - returning empty object`);
  //   return null; // Return null to match Django behavior
  // }

  // async getFixtureComparison(fixtureId: number): Promise<ComparisonData[]> {
  //   console.log(`⚠️ Comparison not yet implemented`);
  //   return []; // Return empty array
  // }

  // async getFixtureMomentum(fixtureId: number): Promise<MomentumResponse | null> {
  //   console.log(`⚠️ Momentum analysis not yet implemented`);
  //   return null;
  // }

  // async getFixtureHighlights(fixtureId: number): Promise<MatchHighlights | null> {
  //   console.log(`⚠️ Highlights not available`);
  //   return null;
  // }

  // async getFixtureHeatmap(fixtureId: number): Promise<FixtureTeamHeatmap[]> {
  //   console.log(`⚠️ Heatmap not yet implemented`);
  //   return [];
  // }

  // async getFixtureShotmap(fixtureId: number): Promise<TeamShotmapData[]> {
  //   console.log(`⚠️ Shot map not yet implemented`);
  //   return [];
  // }

  // async getFixtureTopPerformers(fixtureId: number): Promise<FixtureTopPerformers | null> {
  //   console.log(`⚠️ Top performers not yet implemented`);
  //   return null;
  // }
}

