// src/modules/referee/referee.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { DataCollectorService } from "../../mappers/data-collector.service";
import ApiError from "../../core/app-error";
import { RefereeData } from "./referee.service";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class RefereeRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/referee/ - Get referees
   */
  async getReferees(options: { league: number; season: number }): Promise<RefereeData[]> {
    try {
      const cacheKey = `referees_${options.league}_${options.season}`;

      const cached = this.cacheService.get<RefereeData[]>(cacheKey);
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
          nationality: referee.nationality.name,
          photo: null, // Would need to add photo field to schema
        }));

        this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
        return refereeData;
      }

      // If no data in MongoDB, fallback to mock data
      const refereeData: RefereeData[] = [
        {
          id: 1,
          name: "Ahmed Al-Kassar",
          nationality: "Saudi Arabia",
          photo: null,
        },
        {
          id: 2,
          name: "Mohammed Al-Hoaish",
          nationality: "Saudi Arabia",
          photo: null,
        },
      ];

      this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
      return refereeData;
    } catch (error) {
      console.error("Failed to fetch referees:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/available-seasons/ - Get available seasons
   */
  async getAvailableSeasons(refereeId: number): Promise<number[]> {
    try {
      const cacheKey = `referee_seasons_${refereeId}`;

      const cached = this.cacheService.get<number[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get seasons from matches where referee participated
      const matches = await Models.Match.find({
        "officials.referee.id": refereeId,
      }).distinct("season");

      const seasons = matches.map((season) => parseInt(season)).sort((a, b) => b - a);

      this.cacheService.set(cacheKey, seasons, 60 * 60 * 1000); // Cache for 1 hour
      return seasons;
    } catch (error) {
      console.error("Failed to fetch referee seasons:", error);
      return [];
    }
  }

  /**
   * GET /api/referee/career/ - Get referee career
   */
  async getRefereeCareer(refereeId: number): Promise<RefereeData[]> {
    try {
      const cacheKey = `referee_career_${refereeId}`;

      const cached = this.cacheService.get<RefereeData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Mock referee data since Referee collection doesn't exist yet
      const refereeData: RefereeData[] = [
        {
          id: refereeId,
          name: `Referee ${refereeId}`,
          nationality: "Saudi Arabia",
          photo: null,
        },
      ];

      this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
      return refereeData;
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
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `referee_fixtures_${options.referee}_${options.league}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get matches where referee officiated
      const matches = await Models.Match.find({
        tournament_id: options.league,
        "officials.referee.id": options.referee,
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = this.mapMatchesToFixtureData(matches);

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
  async getRefereeInfo(refereeId: number): Promise<RefereeData> {
    try {
      const cacheKey = `referee_info_${refereeId}`;

      const cached = this.cacheService.get<RefereeData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Mock referee data since Referee collection doesn't exist yet
      const refereeData: RefereeData = {
        id: refereeId,
        name: `Referee ${refereeId}`,
        nationality: "Saudi Arabia",
        photo: null,
      };

      this.cacheService.set(cacheKey, refereeData, 30 * 60 * 1000); // Cache for 30 minutes
      return refereeData;
    } catch (error) {
      console.error("Failed to fetch referee info:", error);
      throw new ApiError("Failed to fetch referee info", 500);
    }
  }

  /**
   * GET /api/referee/statistics/ - Get referee statistics
   */
  async getRefereeStatistics(options: {
    referee: number;
    league: number;
    season: number;
  }): Promise<any> {
    try {
      const cacheKey = `referee_statistics_${options.referee}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get referee statistics from matches
      const matches = await Models.Match.find({
        tournament_id: options.league,
        season: options.season.toString(),
        "officials.referee.id": options.referee,
      });

      const statistics = {
        total_matches: matches.length,
        yellow_cards: 0, // Would need to calculate from match events
        red_cards: 0, // Would need to calculate from match events
        penalties: 0, // Would need to calculate from match events
      };

      this.cacheService.set(cacheKey, statistics, 60 * 60 * 1000); // Cache for 1 hour
      return statistics;
    } catch (error) {
      console.error("Failed to fetch referee statistics:", error);
      return {};
    }
  }

  /**
   * GET /api/referee/transfer/ - Get referee transfers
   */
  async getRefereeTransfers(refereeId: number): Promise<any[]> {
    try {
      const cacheKey = `referee_transfers_${refereeId}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve transfer history
      // For now, return empty array
      const transfers: any[] = [];

      this.cacheService.set(cacheKey, transfers, 60 * 60 * 1000); // Cache for 1 hour
      return transfers;
    } catch (error) {
      console.error("Failed to fetch referee transfers:", error);
      return [];
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB referee to RefereeData format
   */
  private mapRefereeToRefereeData(referee: any): RefereeData {
    return {
      id: referee.korastats_id,
      name: referee.name,
      nationality: referee.nationality?.name || null,
      photo: referee.image_url || null,
    };
  }

  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(matches: any[]): FixtureDataResponse {
    return matches.map((match) => ({
      fixture: {
        id: match.korastats_id,
        referee: match.officials?.referee?.name || null,
        timezone: "UTC",
        date: match.date.toISOString(),
        timestamp: Math.floor(match.date.getTime() / 1000),
        periods: {
          first: null,
          second: null,
        },
        venue: {
          id: match.venue?.id || null,
          name: match.venue?.name || null,
          city: match.venue?.city || null,
        },
        status: {
          long: match.status?.name || "Unknown",
          short: match.status?.short || "UNK",
          elapsed: null,
        },
      },
      league: {
        id: match.tournament_id,
        name: "League Name", // Would need to fetch from tournament
        country: "",
        logo: "",
        flag: null,
        season: parseInt(match.season),
        round: match.round?.toString() || "",
      },
      teams: {
        home: {
          id: match.teams?.home?.id || 0,
          name: match.teams?.home?.name || "Home Team",
          logo: "",
          winner: match.teams?.home?.score > match.teams?.away?.score,
        },
        away: {
          id: match.teams?.away?.id || 0,
          name: match.teams?.away?.name || "Away Team",
          logo: "",
          winner: match.teams?.away?.score > match.teams?.home?.score,
        },
      },
      goals: {
        home: match.teams?.home?.score || 0,
        away: match.teams?.away?.score || 0,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: {
          home: match.teams?.home?.score || 0,
          away: match.teams?.away?.score || 0,
        },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      tablePosition: match.table_position || null,
      averageTeamRating: match.average_team_rating || null,
    }));
  }
}

