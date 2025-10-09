// src/modules/standings/standings.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import { StandingsResponse } from "../../legacy-types/standings.types";

export class StandingsRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/standings/ - Get standings
   */
  async getStandings(leagueId: number, season?: number): Promise<StandingsResponse> {
    try {
      const cacheKey = `standings_${leagueId}_${season || "current"}`;

      const cached = this.cacheService.get<StandingsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get standings from MongoDB Team collection (stats are embedded)
      // Sort by current_rank if available, otherwise by goal difference
      const standings = await Models.Standings.findOne({
        korastats_id: leagueId,
      });
      const seasonData = standings?.seasons.find((s: any) => s.year === season);
      const mappedStandings = {
        league: {
          id: standings?.korastats_id,
          name: standings?.name,
          country: standings?.country,
          logo: standings?.logo,
          flag: standings?.flag,
          season: seasonData?.year,
          standings: [seasonData?.standings],
        },
      };

      this.cacheService.set(cacheKey, mappedStandings, 30 * 60 * 1000); // Cache for 30 minutes
      return mappedStandings;
    } catch (error) {
      console.error("Failed to fetch standings:", error);
      return this.getEmptyStandings(leagueId, season);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Get empty standings when no data is available
   */
  private getEmptyStandings(leagueId: number, season?: number): StandingsResponse {
    return {
      league: {
        id: leagueId,
        name: "League Name",
        country: "Saudi Arabia",
        logo: "",
        flag: "",
        season: season || new Date().getFullYear(),
        standings: [],
      },
    };
  }
}

