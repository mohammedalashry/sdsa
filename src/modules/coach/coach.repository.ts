// src/modules/coach/coach.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { DataCollectorService } from "../../mappers/data-collector.service";
import ApiError from "../../core/app-error";
import { CoachData } from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/coach/ - Get coaches
   */
  async getCoaches(options: { league: number; season: number }): Promise<CoachData[]> {
    try {
      const cacheKey = `coaches_${options.league}_${options.season}`;

      const cached = this.cacheService.get<CoachData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coaches from MongoDB
      const coaches = await Models.Coach.find({
        current_team: { $exists: true },
      }).limit(50);

      const coachData = coaches.map((coach) => this.mapCoachToCoachData(coach));

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coaches:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/career/ - Get coach career
   */
  async getCoachCareer(coachId: number): Promise<CoachData[]> {
    try {
      const cacheKey = `coach_career_${coachId}`;

      const cached = this.cacheService.get<CoachData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId.toString() });

      if (!coach) {
        throw new ApiError("Coach not found", 404);
      }

      const coachData = [this.mapCoachToCoachData(coach)];

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coach career:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/fixtures/ - Get coach fixtures
   */
  async getCoachFixtures(options: {
    coach: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `coach_fixtures_${options.coach}_${options.league}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get matches where coach's team participated
      const matches = await Models.Match.find({
        tournament_id: options.league,
        $or: [
          { "teams.home.coach_id": options.coach },
          { "teams.away.coach_id": options.coach },
        ],
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = this.mapMatchesToFixtureData(matches);

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch coach fixtures:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/info/ - Get coach info
   */
  async getCoachInfo(coachId: number): Promise<CoachData> {
    try {
      const cacheKey = `coach_info_${coachId}`;

      const cached = this.cacheService.get<CoachData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId.toString() });

      if (!coach) {
        throw new ApiError("Coach not found", 404);
      }

      const coachData = this.mapCoachToCoachData(coach);

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coach info:", error);
      throw new ApiError("Failed to fetch coach info", 500);
    }
  }

  /**
   * GET /api/coach/statistics/ - Get coach statistics
   */
  async getCoachStatistics(options: {
    coach: number;
    league: number;
    season: number;
  }): Promise<any> {
    try {
      const cacheKey = `coach_statistics_${options.coach}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex statistics calculation
      // For now, return empty object
      const statistics: any = {};

      this.cacheService.set(cacheKey, statistics, 60 * 60 * 1000); // Cache for 1 hour
      return statistics;
    } catch (error) {
      console.error("Failed to fetch coach statistics:", error);
      return {};
    }
  }

  /**
   * GET /api/coach/transfer/ - Get coach transfers
   */
  async getCoachTransfers(coachId: number): Promise<any[]> {
    try {
      const cacheKey = `coach_transfers_${coachId}`;

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
      console.error("Failed to fetch coach transfers:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/trophies/ - Get coach trophies
   */
  async getCoachTrophies(coachId: number): Promise<any[]> {
    try {
      const cacheKey = `coach_trophies_${coachId}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve trophy history
      // For now, return empty array
      const trophies: any[] = [];

      this.cacheService.set(cacheKey, trophies, 60 * 60 * 1000); // Cache for 1 hour
      return trophies;
    } catch (error) {
      console.error("Failed to fetch coach trophies:", error);
      return [];
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB coach to CoachData format
   */
  private mapCoachToCoachData(coach: any): CoachData {
    return {
      id: coach.korastats_id,
      name: coach.name,
      firstname: null, // Not available in current schema
      lastname: null, // Not available in current schema
      age: coach.age || null,
      birth: {
        date: coach.date_of_birth?.toISOString() || null,
        place: null, // Not available in current schema
        country: coach.nationality?.name || null,
      },
      nationality: coach.nationality?.name || null,
      height: null, // Not available for coaches
      weight: null, // Not available for coaches
      photo: coach.image_url || "",
      team: {
        id: coach.current_team?.id || 0,
        name: coach.current_team?.name || "Unknown Team",
        code: null,
        country: "",
        founded: null,
        national: false,
        logo: "",
      },
      career: [], // Would need to fetch from career history
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

