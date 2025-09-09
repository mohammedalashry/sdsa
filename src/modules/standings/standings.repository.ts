// src/modules/standings/standings.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { DataCollectorService } from "../../mappers/data-collector.service";
import ApiError from "../../core/app-error";
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

      // Get standings from MongoDB TeamStats collection
      const teamStats = await Models.TeamStats.find({
        tournament_id: leagueId,
        season: season?.toString() || new Date().getFullYear().toString(),
      })
        .sort({ "stats.points": -1, "stats.goal_difference": -1 })
        .limit(20);

      if (teamStats.length === 0) {
        // Try to collect data from Korastats if not found
        console.log(
          `📦 No standings data found in MongoDB, attempting to collect from Korastats`,
        );
        try {
          // await DataCollectorService.collectTournamentCompleteData(leagueId);
          // Retry query after collection
          const retryStats = await Models.TeamStats.find({
            tournament_id: leagueId,
            season: season?.toString() || new Date().getFullYear().toString(),
          })
            .sort({ "stats.points": -1, "stats.goal_difference": -1 })
            .limit(20);

          if (retryStats.length > 0) {
            const standings = this.mapTeamStatsToStandings(retryStats, leagueId, season);
            this.cacheService.set(cacheKey, standings, 30 * 60 * 1000); // Cache for 30 minutes
            return standings;
          }
        } catch (collectError) {
          console.error("Failed to collect standings data:", collectError);
        }

        // Return empty standings if no data found
        return this.getEmptyStandings(leagueId, season);
      }

      const standings = this.mapTeamStatsToStandings(teamStats, leagueId, season);
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
  private mapTeamStatsToStandings(
    teamStats: any[],
    leagueId: number,
    season?: number,
  ): StandingsResponse {
    const standingsEntries = teamStats.map((stat, index) => ({
      rank: index + 1,
      team: {
        id: stat.team_id || 0,
        name: stat.team_name || "Unknown Team",
        logo: "",
      },
      points: stat.stats?.points || 0,
      goalsDiff: stat.stats?.goal_difference || 0,
      group: "Main",
      form: stat.form?.form_string || "-----",
      status: this.getStatus(index + 1),
      description: this.getDescription(index + 1),
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
    }));

    return {
      league: {
        id: leagueId,
        name: "League Name", // Would need to fetch from tournament
        country: "Saudi Arabia",
        logo: "",
        flag: "",
        season: season || new Date().getFullYear(),
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
}

