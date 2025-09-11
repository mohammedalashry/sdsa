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
      const teamStats = await Models.Team.find({
        // Add any filters based on league/season if needed
        "stats_summary.current_rank": { $exists: true, $ne: null }
      })
        .sort({ "stats_summary.current_rank": 1 }) // Sort by rank ascending (1st, 2nd, 3rd...)
        .limit(20);

      if (teamStats.length === 0) {
        console.log(
          `📦 No standings data found in MongoDB for league ${leagueId}, season ${season || "current"}`,
        );
        return this.getEmptyStandings(leagueId, season);
      }

      const standings = await this.mapTeamStatsToStandings(teamStats, leagueId, season);
      this.cacheService.set(cacheKey, standings, 30 * 60 * 1000); // Cache for 30 minutes
      return standings;
    } catch (error) {
      console.error("Failed to fetch standings:", error);
      return this.getEmptyStandings(leagueId, season);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB team stats to StandingsResponse format
   */
  private async mapTeamStatsToStandings(
    teamStats: any[],
    leagueId: number,
    season?: number,
  ): Promise<StandingsResponse> {
    // Get tournament and team data for enrichment
    const [tournament, teams] = await Promise.all([
      Models.Tournament.findOne({ korastats_id: leagueId }),
      Models.Team.find({
        korastats_id: { $in: teamStats.map((s) => s.team_id) },
      }),
    ]);

    const standingsEntries = teamStats.map((stat, index) => {
      const team = teams.find((t) => t.korastats_id === stat.team_id);

      return {
        rank: stat.stats_summary?.current_rank || (index + 1), // Use ranking from Korastats if available
        team: {
          id: stat.team_id || 0,
          name: team?.name || stat.team_name || "Unknown Team",
          logo: team?.logo || "",
        },
        points: stat.stats?.points || 0,
        goalsDiff: stat.stats?.goal_difference || 0,
        group: stat.stats_summary?.current_group || "Main", // Use group from Korastats if available
        form: stat.form?.form_string || "-----",
        status: this.getStatus(stat.stats_summary?.current_rank || (index + 1)),
        description: this.getDescription(stat.stats_summary?.current_rank || (index + 1)),
        all: {
          played: stat.stats?.matches_played || 0,
          win: stat.stats?.wins || 0,
          draw: stat.stats?.draws || 0,
          lose: stat.stats?.losses || 0,
          goals: {
            for_: stat.stats?.goals_for || 0,
            against: stat.stats?.goals_against || 0,
          },
        },
        home: {
          played: Math.floor((stat.stats?.matches_played || 0) / 2),
          win: Math.floor((stat.stats?.wins || 0) / 2),
          draw: Math.floor((stat.stats?.draws || 0) / 2),
          lose: Math.floor((stat.stats?.losses || 0) / 2),
          goals: {
            for_: stat.goals?.home_for || 0,
            against: stat.goals?.home_against || 0,
          },
        },
        away: {
          played: Math.ceil((stat.stats?.matches_played || 0) / 2),
          win: Math.ceil((stat.stats?.wins || 0) / 2),
          draw: Math.ceil((stat.stats?.draws || 0) / 2),
          lose: Math.ceil((stat.stats?.losses || 0) / 2),
          goals: {
            for_: stat.goals?.away_for || 0,
            against: stat.goals?.away_against || 0,
          },
        },
        update: new Date().toISOString(),
      };
    });

    return {
      league: {
        id: leagueId,
        name: tournament?.name || "Unknown League",
        country: tournament?.country?.name || "Saudi Arabia",
        logo: tournament?.logo || "",
        flag: "",
        season: season || this.extractYearFromSeason(tournament?.season || ""),
        standings: [standingsEntries], // Grouped in arrays
      },
    };
  }

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

  /**
   * Get status based on position
   */
  private getStatus(rank: number): string {
    if (rank <= 3) return "Champions League";
    if (rank <= 6) return "Europa League";
    if (rank <= 10) return "Conference League";
    if (rank >= 15) return "Relegation";
    return "Mid Table";
  }

  /**
   * Get description based on position
   */
  private getDescription(rank: number): string {
    if (rank <= 3) return "Champions League";
    if (rank <= 6) return "Europa League";
    if (rank <= 10) return "Conference League";
    if (rank >= 15) return "Relegation";
    return "Mid Table";
  }

  /**
   * Extract year from season string
   */
  private extractYearFromSeason(season: string): number {
    const match = season?.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  }
}

