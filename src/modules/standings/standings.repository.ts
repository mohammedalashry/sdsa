// src/modules/standings/standings.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import { StandingsEntry, StandingsResponse } from "../../legacy-types/standings.types";

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

      if (!seasonData?.standings) {
        return this.getEmptyStandings(leagueId, season);
      }

      // Calculate form for each team based on last 5 matches
      const standingsWithForm = await this.calculateTeamForms(
        seasonData.standings,
        leagueId,
      );

      const mappedStandings = {
        league: {
          id: standings?.korastats_id,
          name: standings?.name,
          country: standings?.country,
          logo: standings?.logo,
          flag: standings?.flag,
          season: seasonData?.year,
          standings: [standingsWithForm],
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
  private async calculateTeamForms(
    standings: StandingsEntry[],
    leagueId: number,
  ): Promise<StandingsEntry[]> {
    standings.forEach(async (standing) => {
      standing.form = await this.calculateTeamFormFromMatches(standing.team.id, leagueId);
    });
    return standings;
  }
  private async calculateTeamFormFromMatches(
    teamId: number,
    leagueId: number,
  ): Promise<string> {
    let form = "";
    let query = {
      $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
      tournament_id: leagueId,
    };
    const matches = await Models.Match.find(query).sort({ date: -1 }).limit(5);

    if (matches.length === 0) {
      return "WDLWD";
    }
    matches.forEach((match) => {
      if (match.teams.home.id === teamId) {
        form +=
          match.goals.home > match.goals.away
            ? "W"
            : match.goals.home === match.goals.away
              ? "D"
              : "L";
      } else {
        form +=
          match.goals.away > match.goals.home
            ? "W"
            : match.goals.away === match.goals.home
              ? "D"
              : "L";
      }
    });
    return form;
  }
}

