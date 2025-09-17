// src/modules/referee/referee.repository.ts
import { MatchDetailsInterface, MatchInterface, Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  RefereeResponse,
  RefereeInfoResponse,
  RefereeMatchStatsResponse,
  RefereeCareerStats,
  RefereeCareerStatsResponse,
} from "../../legacy-types/referee.types";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";
import { RefereeData } from "./referee.service";
import { log } from "console";

export class RefereeRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/referee/ - Get referees
   */
  async getReferees(options: {
    league: number;
    season?: number;
  }): Promise<RefereeResponse> {
    try {
      const cacheKey = `referees_${options.league}_${options.season}`;

      const cached = this.cacheService.get<RefereeResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Try to get referees from MongoDB first
      const mongoReferees = await Models.Referee.find({
        status: "active",
      }).limit(50);

      if (mongoReferees.length > 0) {
        console.log(`📦 Found ${mongoReferees.length} referees in MongoDB`);

        // Transform MongoDB referees to legacy format
        const refereeData = mongoReferees.map((referee) => ({
          id: referee.korastats_id,
          name: referee.name,
          image: referee.photo || "",
          country: referee.country,
          bithDate: referee.birthDate,
          age: referee.age || 0,
          matches: referee.matches,
        }));

        this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
        return refereeData;
      }

      // If no data in MongoDB, return empty array
      console.log(
        `📦 No referees found in MongoDB for league ${options.league}, season ${options.season}`,
      );
      return [];
    } catch (error) {
      console.error("Failed to fetch referees:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/available-seasons/ - Get available seasons
   */
  async getAvailableSeasons(refereeId: number): Promise<any[]> {
    try {
      const cacheKey = `referee_seasons_${refereeId}`;

      const cached = this.cacheService.get<number[]>(cacheKey);
      if (cached) {
        return cached;
      }
      const referee = await Models.Referee.findOne({
        korastats_id: refereeId,
      });
      // Get seasons from matches where referee participated
      const seasons = await Models.Match.find({
        "fixture.referee": referee.name,
      }).distinct("league.season");

      const league = await Models.League.findOne({});

      const result = [
        {
          league: {
            id: league.korastats_id,
            name: league.name,
            logo: league.logo,
            type: "League",
          },
          seasons:
            seasons.length > 0
              ? seasons.map((year) => ({
                  year: year,
                  start_date: new Date(year, 6, 1),
                  end_date: new Date(year + 1, 6, 1),
                }))
              : [
                  {
                    year: 2024,
                    start_date: new Date(2024, 6, 1),
                    end_date: new Date(2025, 6, 1),
                  },
                ],
        },
      ];
      this.cacheService.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error("Failed to fetch referee seasons:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/career-stats/ - Get referee career stats
   */
  async getRefereeCareer(refereeId: number): Promise<RefereeCareerStatsResponse> {
    try {
      const cacheKey = `referee_career_${refereeId}`;

      const cached = this.cacheService.get<RefereeCareerStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get referee from MongoDB
      const referee = await Models.Referee.findOne({
        korastats_id: refereeId,
      });

      if (referee) {
        const refereeData = referee.career_stats;

        this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
        return refereeData;
      }

      console.log(`📦 No referee found in MongoDB for referee ${refereeId}`);
      return [];
    } catch (error) {
      console.error("Failed to fetch referee career:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/fixtures/ - Get referee fixtures
   */
  async getRefereeFixtures(options: {
    referee: number;
    league: number;
  }): Promise<RefereeMatchStatsResponse> {
    try {
      const cacheKey = `referee_fixtures_${options.referee}_${options.league}`;

      const cached = this.cacheService.get<RefereeMatchStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }
      const referee = await Models.Referee.findOne({
        korastats_id: options.referee,
      });
      // Get matches where referee officiated
      const matches = await Models.Match.find({
        tournament_id: options.league,
        "fixture.referee": referee.name,
      })
        .sort({ date: -1 })
        .limit(20);
      const matchDetails = await Models.MatchDetails.find({
        tournament_id: options.league,
        "fixture.referee": referee.name,
      });
      const fixtures = matches.map((match) => ({
        yellow_cards: this.calculateYellowCards(matchDetails),
        red_cards: this.calculateRedCards(matchDetails),
        fixture_data: this.mapMatchesToFixtureData(match),
      }));

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch referee fixtures:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/info/ - Get referee info
   */
  async getRefereeInfo(refereeId: number): Promise<RefereeInfoResponse> {
    try {
      const cacheKey = `referee_info_${refereeId}`;

      const cached = this.cacheService.get<RefereeInfoResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get referee from MongoDB
      const referee = await Models.Referee.findOne({
        korastats_id: refereeId,
      });

      if (!referee) {
        throw new ApiError(404, "Referee not found");
      }

      const refereeData: RefereeInfoResponse = {
        id: referee.korastats_id,
        name: referee.name,
        image: referee.photo || null,
        country: referee.country,
        bithDate: referee.birthDate,
        age: referee.age || 0,
        matches: referee.matches,
      };

      this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
      return refereeData;
    } catch (error) {
      console.error("Failed to fetch referee info:", error);
      throw new ApiError(500, "Failed to fetch referee info");
    }
  }
  async getRefereeLastMatch(refereeId: number): Promise<FixtureData> {
    try {
      const cacheKey = `referee_last_match_${refereeId}`;

      const cached = this.cacheService.get<FixtureData>(cacheKey);
      if (cached) {
        return cached;
      }
      const referee = await Models.Referee.findOne({
        korastats_id: refereeId,
      });
      const match = await Models.Match.findOne({
        "fixture.referee": referee.name,
      })
        .sort({ date: -1 })
        .limit(1);
      console.log("🔍 Match:", match);
      return this.mapMatchesToFixtureData(match);
    } catch (error) {
      console.error("Failed to fetch referee last match:", error);
      return null;
    }
  }
  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(match: MatchInterface): FixtureData {
    return {
      fixture: match.fixture,
      league: match.league,
      teams: match.teams,
      goals: match.goals,
      score: match.score,
      tablePosition: match.tablePosition || null,
      averageTeamRating: match.averageTeamRating || null,
    };
  }

  calculateYellowCards(matches: MatchDetailsInterface[]): number {
    return matches.reduce(
      (acc, match) =>
        acc + match.timelineData.filter((event) => event.type === "yellow_card").length,
      0,
    );
  }

  calculateRedCards(matches: MatchDetailsInterface[]): number {
    return matches.reduce(
      (acc, match) =>
        acc + match.timelineData.filter((event) => event.type === "red_card").length,
      0,
    );
  }
}

