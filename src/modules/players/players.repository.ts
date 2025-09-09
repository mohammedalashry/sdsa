// src/modules/players/players.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { DataCollectorService } from "../../mappers/data-collector.service";
import ApiError from "../../core/app-error";
import {
  PlayerInfo,
  PlayerStatistics,
  PlayerData,
  CoachData,
} from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class PlayersRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  // ========== MAIN PLAYER ENDPOINTS ==========

  /**
   * GET /api/player/career/ - Get player career data
   */
  async getPlayerCareer(playerId: number): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_career_${playerId}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player stats from MongoDB
      const playerStats = await Models.PlayerStats.find({
        player_id: playerId.toString(),
      })
        .sort({ season: -1 })
        .limit(50);

      if (playerStats.length === 0) {
        // Try to collect data from Korastats if not found
        console.log(
          `📦 No player career data found in MongoDB, attempting to collect from Korastats`,
        );
        try {
          // await DataCollectorService.collectPlayerData(playerId);
          // Retry query after collection
          const retryStats = await Models.PlayerStats.find({
            player_id: playerId.toString(),
          })
            .sort({ season: -1 })
            .limit(50);

          if (retryStats.length > 0) {
            const career = this.mapPlayerStatsToCareer(retryStats);
            this.cacheService.set(cacheKey, career, 30 * 60 * 1000); // Cache for 30 minutes
            return career;
          }
        } catch (collectError) {
          console.error("Failed to collect player career data:", collectError);
        }

        return [];
      }

      const career = this.mapPlayerStatsToCareer(playerStats);
      this.cacheService.set(cacheKey, career, 30 * 60 * 1000); // Cache for 30 minutes
      return career;
    } catch (error) {
      console.error("Failed to fetch player career:", error);
      return [];
    }
  }

  /**
   * GET /api/player/comparison/stats/ - Compare player statistics
   */
  async getPlayerComparisonStats(playerId: number): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_comparison_stats_${playerId}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player stats for comparison
      const playerStats = await Models.PlayerStats.find({
        player_id: playerId.toString(),
      })
        .sort({ season: -1 })
        .limit(10);

      if (playerStats.length === 0) {
        throw new ApiError("Player not found", 404);
      }

      const comparison = this.mapPlayerStatsToCareer(playerStats);
      this.cacheService.set(cacheKey, comparison, 30 * 60 * 1000); // Cache for 30 minutes
      return comparison;
    } catch (error) {
      console.error("Failed to fetch player comparison stats:", error);
      return [];
    }
  }

  /**
   * GET /api/player/fixtures/ - Get player fixtures
   */
  async getPlayerFixtures(options: {
    id: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `player_fixtures_${options.id}_${options.league}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get matches where player participated
      const matches = await Models.Match.find({
        tournament_id: options.league,
        $or: [
          { "teams.home.players": { $elemMatch: { id: options.id } } },
          { "teams.away.players": { $elemMatch: { id: options.id } } },
        ],
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch player fixtures:", error);
      return [];
    }
  }

  /**
   * GET /api/player/heatmap/ - Get player heatmap
   */
  async getPlayerHeatmap(options: {
    league: number;
    player: number;
    season: number;
  }): Promise<any[]> {
    try {
      const cacheKey = `player_heatmap_${options.player}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex heatmap calculation
      // For now, return empty array
      const heatmap: any[] = [];

      this.cacheService.set(cacheKey, heatmap, 60 * 60 * 1000); // Cache for 1 hour
      return heatmap;
    } catch (error) {
      console.error("Failed to fetch player heatmap:", error);
      return [];
    }
  }

  /**
   * GET /api/player/info/ - Get player information
   */
  async getPlayerInfo(playerId: number): Promise<PlayerInfo> {
    try {
      const cacheKey = `player_info_${playerId}`;

      const cached = this.cacheService.get<PlayerInfo>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from MongoDB
      const player = await Models.Player.findOne({ korastats_id: playerId.toString() });

      if (!player) {
        throw new ApiError("Player not found", 404);
      }

      // Get player statistics
      const playerStats = await Models.PlayerStats.find({
        player_id: playerId.toString(),
      })
        .sort({ season: -1 })
        .limit(10);

      // Map to player info format
      const playerInfo: PlayerInfo = {
        id: player.korastats_id,
        name: player.name,
        firstname: null, // Not available in current schema
        lastname: null, // Not available in current schema
        age: player.age || null,
        birth: {
          date: player.date_of_birth?.toISOString() || null,
          place: null, // Not available in current schema
          country: player.nationality?.name || null,
        },
        nationality: player.nationality?.name || null,
        height: player.height?.toString() || null,
        weight: player.weight?.toString() || null,
        injured: player.status === "inactive", // Map status to injured
        photo: player.image_url || "",
        statistics: this.mapPlayerStatsToCareer(playerStats),
      };

      this.cacheService.set(cacheKey, playerInfo, 30 * 60 * 1000); // Cache for 30 minutes
      return playerInfo;
    } catch (error) {
      console.error("Failed to fetch player info:", error);
      throw new ApiError("Failed to fetch player info", 500);
    }
  }

  /**
   * GET /api/player/shotmap/ - Get player shotmap
   */
  async getPlayerShotmap(playerId: number): Promise<any[]> {
    try {
      const cacheKey = `player_shotmap_${playerId}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex shotmap calculation
      // For now, return empty array
      const shotmap: any[] = [];

      this.cacheService.set(cacheKey, shotmap, 60 * 60 * 1000); // Cache for 1 hour
      return shotmap;
    } catch (error) {
      console.error("Failed to fetch player shotmap:", error);
      return [];
    }
  }

  /**
   * GET /api/player/stats/ - Get player statistics
   */
  async getPlayerStats(options: {
    id: number;
    league: number;
    season: number;
  }): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_stats_${options.id}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player stats for specific league and season
      const playerStats = await Models.PlayerStats.find({
        player_id: options.id.toString(),
        tournament_id: options.league,
        season: options.season.toString(),
      })
        .sort({ date: -1 })
        .limit(50);

      const stats = this.mapPlayerStatsToCareer(playerStats);
      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000); // Cache for 30 minutes
      return stats;
    } catch (error) {
      console.error("Failed to fetch player stats:", error);
      return [];
    }
  }

  /**
   * GET /api/player/topassists/ - Get top assists
   */
  async getTopAssists(options: {
    league: number;
    season: number;
  }): Promise<PlayerData[]> {
    try {
      const cacheKey = `top_assists_${options.league}_${options.season}`;

      const cached = this.cacheService.get<PlayerData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get top assists from player stats
      const topAssists = await Models.PlayerStats.aggregate([
        {
          $match: {
            tournament_id: options.league,
            season: options.season.toString(),
          },
        },
        {
          $group: {
            _id: "$player_id",
            totalAssists: { $sum: "$goals.assists" },
            playerName: { $first: "$player_name" },
          },
        },
        {
          $sort: { totalAssists: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      const assists = this.mapTopPlayersToPlayerData(topAssists);
      this.cacheService.set(cacheKey, assists, 30 * 60 * 1000); // Cache for 30 minutes
      return assists;
    } catch (error) {
      console.error("Failed to fetch top assists:", error);
      return [];
    }
  }

  /**
   * GET /api/player/topscorers/ - Get top scorers
   */
  async getTopScorers(options: {
    league: number;
    season: number;
  }): Promise<PlayerData[]> {
    try {
      const cacheKey = `top_scorers_${options.league}_${options.season}`;

      const cached = this.cacheService.get<PlayerData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get top scorers from player stats
      const topScorers = await Models.PlayerStats.aggregate([
        {
          $match: {
            tournament_id: options.league,
            season: options.season.toString(),
          },
        },
        {
          $group: {
            _id: "$player_id",
            totalGoals: { $sum: "$goals.total" },
            playerName: { $first: "$player_name" },
          },
        },
        {
          $sort: { totalGoals: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      const scorers = this.mapTopPlayersToPlayerData(topScorers);
      this.cacheService.set(cacheKey, scorers, 30 * 60 * 1000); // Cache for 30 minutes
      return scorers;
    } catch (error) {
      console.error("Failed to fetch top scorers:", error);
      return [];
    }
  }

  /**
   * GET /api/player/traits/ - Get player traits
   */
  async getPlayerTraits(playerId: number): Promise<any> {
    try {
      const cacheKey = `player_traits_${playerId}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex traits analysis
      // For now, return empty object
      const traits: any = {};

      this.cacheService.set(cacheKey, traits, 60 * 60 * 1000); // Cache for 1 hour
      return traits;
    } catch (error) {
      console.error("Failed to fetch player traits:", error);
      return {};
    }
  }

  /**
   * GET /api/player/transfer/ - Get player transfer data
   */
  async getPlayerTransfer(playerId: number): Promise<any[]> {
    try {
      const cacheKey = `player_transfer_${playerId}`;

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
      console.error("Failed to fetch player transfers:", error);
      return [];
    }
  }

  /**
   * GET /api/player/trophies/ - Get player trophies
   */
  async getPlayerTrophies(playerId: number): Promise<any[]> {
    try {
      const cacheKey = `player_trophies_${playerId}`;

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
      console.error("Failed to fetch player trophies:", error);
      return [];
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB player stats to PlayerStatistics format
   */
  private mapPlayerStatsToCareer(playerStats: any[]): PlayerStatistics[] {
    return playerStats.map((stat) => ({
      team: {
        id: stat.team_id || 0,
        name: stat.team_name || "Unknown Team",
        code: null,
        country: "",
        founded: null,
        national: false,
        logo: "",
      },
      league: {
        id: stat.tournament_id || 0,
        name: "League Name", // Would need to fetch from tournament
        type: "League",
        logo: "",
      },
      games: {
        appearences: stat.games?.appearences || null,
        lineups: stat.games?.lineups || null,
        minutes: stat.games?.minutes || null,
        number: stat.games?.number || null,
        position: stat.games?.position || null,
        rating: stat.games?.rating || null,
        captain: stat.games?.captain || false,
      },
      substitutes: {
        in: stat.substitutes?.in || null,
        out: stat.substitutes?.out || null,
        bench: stat.substitutes?.bench || null,
      },
      shots: {
        total: stat.shots?.total || null,
        on: stat.shots?.on || null,
      },
      goals: {
        total: stat.goals?.total || null,
        conceded: stat.goals?.conceded || null,
        assists: stat.goals?.assists || null,
        saves: stat.goals?.saves || null,
      },
      passes: {
        total: stat.passes?.total || null,
        key: stat.passes?.key || null,
        accuracy: stat.passes?.accuracy || null,
      },
      tackles: {
        total: stat.tackles?.total || null,
        blocks: stat.tackles?.blocks || null,
        interceptions: stat.tackles?.interceptions || null,
      },
      duels: {
        total: stat.duels?.total || null,
        won: stat.duels?.won || null,
      },
      dribbles: {
        attempts: stat.dribbles?.attempts || null,
        success: stat.dribbles?.success || null,
        past: stat.dribbles?.past || null,
      },
      fouls: {
        drawn: stat.fouls?.drawn || null,
        committed: stat.fouls?.committed || null,
      },
      cards: {
        yellow: stat.cards?.yellow || null,
        yellowred: stat.cards?.yellowred || null,
        red: stat.cards?.red || null,
      },
      penalty: {
        won: stat.penalty?.won || null,
        commited: stat.penalty?.commited || null,
        scored: stat.penalty?.scored || null,
        missed: stat.penalty?.missed || null,
        saved: stat.penalty?.saved || null,
      },
    }));
  }

  /**
   * Map top players aggregation to PlayerData format
   */
  private mapTopPlayersToPlayerData(topPlayers: any[]): PlayerData[] {
    return topPlayers.map((player) => ({
      id: parseInt(player._id) || 0,
      name: player.playerName || "Unknown Player",
      firstname: null,
      lastname: null,
      age: null,
      birth: {
        date: null,
        place: null,
        country: null,
      },
      nationality: null,
      height: null,
      weight: null,
      injured: false,
      photo: "",
    }));
  }

  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(matches: any[]): FixtureDataResponse {
    return matches.map((match) => ({
      fixture: {
        id: match.korastats_id,
        referee: match.officials.referee.name,
        timezone: "UTC",
        date: match.date.toISOString(),
        timestamp: Math.floor(match.date.getTime() / 1000),
        periods: {
          first: null,
          second: null,
        },
        venue: {
          id: match.venue.id,
          name: match.venue.name,
          city: match.venue.city || "",
        },
        status: {
          long: match.status.name,
          short: match.status.short,
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
        round: match.round.toString(),
      },
      teams: {
        home: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: "",
          winner: match.teams.home.score > match.teams.away.score,
        },
        away: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: "",
          winner: match.teams.away.score > match.teams.home.score,
        },
      },
      goals: {
        home: match.teams.home.score,
        away: match.teams.away.score,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: {
          home: match.teams.home.score,
          away: match.teams.away.score,
        },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      tablePosition: match.table_position || null,
      averageTeamRating: match.average_team_rating || null,
    }));
  }
}

