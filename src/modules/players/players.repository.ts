// src/modules/players/players.repository.ts
// Players repository aligned with new PlayerInterface schema

import { Models } from "@/db/mogodb/models";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { ApiError } from "@/core/middleware/error.middleware";
import { PlayerInterface } from "@/db/mogodb/schemas/player.schema";
import {
  PlayerInfo,
  PlayerStatistics,
  PlayerData,
  PlayerInfoResponse,
  TopScorersResponse,
  TopAssistsResponse,
  PlayerCareerResponse,
  PlayerStatsResponse,
  TrophiesResponse,
  PlayerComparisonsResponse,
  PlayerFixturesResponse,
  PlayerTransfersResponse,
  PlayerHeatMapResponse,
  PlayerShotMapResponse,
} from "@/legacy-types/players.types";
import { FixtureDataResponse } from "@/legacy-types/fixtures.types";
import { Team } from "@/legacy-types";

export class PlayersRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get player career data from new Player schema
   */
  async getPlayerCareer(playerId: number): Promise<PlayerCareerResponse> {
    try {
      const cacheKey = `player_career_${playerId}`;

      const cached = this.cacheService.get<PlayerCareerResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();
      const team = await Models.Team.findOne({
        korastats_id: player.stats[0].team.id,
      }).lean();
      if (!player) {
        console.log(`📦 No player found for ID ${playerId}`);
        return [];
      }

      // Map career data to proper format
      const career = player.career_summary.careerData.map((careerItem) => ({
        team: {
          id: team.korastats_id,
          name: team.name,
          code: team.code || null,
          country: team.country,
          founded: team.founded || null,
          national: team.national,
          logo: team.logo,
        },
        season: careerItem.season,
        goals: careerItem.goals,
      }));

      this.cacheService.set(cacheKey, career, 30 * 60 * 1000); // Cache for 30 minutes
      return career;
    } catch (error) {
      console.error("Failed to fetch player career:", error);
      return [];
    }
  }

  /**
   * Get player comparison stats from new Player schema
   */
  async getPlayerComparisonStats(playerId: number): Promise<PlayerStatsResponse> {
    try {
      const cacheKey = `player_comparison_${playerId}`;

      const cached = this.cacheService.get<PlayerStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        return [];
      }

      // Map to PlayerData format for comparison
      const playerData: PlayerData = {
        player: {
          id: player.korastats_id,
          name: player.name,
          firstname: player.firstname || null,
          lastname: player.lastname || null,
          age: player.age,
          birth: {
            date: player.birth.date
              ? player.birth.date.toISOString().split("T")[0]
              : null,
            place: player.birth.place || null,
            country: player.birth.country || null,
          },
          nationality: player.nationality || null,
          height: player.height?.toString() || null,
          weight: player.weight?.toString() || null,
          injured: player.injured,
          photo: player.photo,
        },
        statistics: player.stats,
      };

      const comparison = [playerData];
      this.cacheService.set(cacheKey, comparison, 30 * 60 * 1000);
      return comparison;
    } catch (error) {
      console.error("Failed to fetch player comparison stats:", error);
      return [];
    }
  }

  /**
   * Get player fixtures
   */
  async getPlayerFixtures(playerId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `player_fixtures_${playerId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection to find their teams
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        return [];
      }

      // Get team IDs from player's statistics
      const teamIds = player.stats.map((stat) => stat.team.id);

      // Get matches where player's teams participated
      const matches = await Models.Match.find({
        $or: [
          { "teams.home.id": { $in: teamIds } },
          { "teams.away.id": { $in: teamIds } },
        ],
      })
        .sort({ "fixture.date": -1 })
        .limit(20)
        .lean();

      const fixtures = matches.map((match) => {
        return {
          fixture: match.fixture,
          league: match.league,
          teams: match.teams,
          goals: match.goals,
          score: match.score,
          tablePosition: match.tablePosition, // Will be calculated from standings
          averageTeamRating: match.averageTeamRating, // Will be calculated from team ratings
        };
      });

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000);
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch player fixtures:", error);
      throw new ApiError(500, "Failed to fetch player fixtures");
    }
  }

  /**
   * Get player info from new Player schema
   */
  async getPlayerInfo(playerId: number): Promise<PlayerInfoResponse> {
    try {
      const cacheKey = `player_info_${playerId}`;

      const cached = this.cacheService.get<PlayerInfoResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        throw new ApiError(404, "Player not found");
      }

      // Map PlayerInterface to PlayerInfo response
      const playerInfo: PlayerInfoResponse = {
        id: player.korastats_id,
        name: player.name,
        firstname: player.firstname || null,
        lastname: player.lastname || null,
        age: player.age,
        birth: {
          date: player.birth.date ? player.birth.date.toISOString().split("T")[0] : null,
          place: player.birth.place || null,
          country: player.birth.country || null,
        },
        nationality: player.nationality || null,
        height: player.height?.toString() || null,
        weight: player.weight?.toString() || null,
        injured: player.injured,
        photo: player.photo,
      };

      this.cacheService.set(cacheKey, playerInfo, 30 * 60 * 1000);
      return playerInfo;
    } catch (error) {
      console.error("Failed to fetch player info:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to fetch player info");
    }
  }

  /**
   * Get player heatmap from new Player schema
   */
  async getPlayerHeatmap(options: {
    league: number;
    player: number;
    season: number;
  }): Promise<PlayerHeatMapResponse> {
    try {
      const cacheKey = `player_heatmap_${options.player}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<PlayerHeatMapResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: options.player }).lean();

      if (!player) {
        throw new ApiError(404, "Player not found");
      }

      const heatmap = player.playerHeatMap;
      this.cacheService.set(cacheKey, heatmap, 30 * 60 * 1000);
      return heatmap;
    } catch (error) {
      console.error("Failed to fetch player heatmap:", error);
      return { points: [] };
    }
  }

  /**
   * Get player shotmap from new Player schema
   */
  async getPlayerShotmap(playerId: number): Promise<PlayerShotMapResponse> {
    try {
      const cacheKey = `player_shotmap_${playerId}`;

      const cached = this.cacheService.get<PlayerShotMapResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        throw new ApiError(404, "Player not found");
      }

      const shotmap = player.playerShotMap;
      this.cacheService.set(cacheKey, shotmap, 30 * 60 * 1000);
      return shotmap;
    } catch (error) {
      console.error("Failed to fetch player shotmap:", error);
      return { shots: [], accuracy: 0 };
    }
  }

  /**
   * Get top assists from new Player schema
   */
  async getTopAssists(options: {
    league: number;
    season: number;
  }): Promise<TopAssistsResponse> {
    try {
      const cacheKey = `top_assists_${options.league}_${options.season}`;

      const cached = this.cacheService.get<TopAssistsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get players with highest assists from new Player collection
      const players = await Models.Player.find({
        "stats.league.id": options.league,
        //status: "active",
      })
        .sort({ "stats.goals.assists": -1 })
        .limit(20)
        .lean();

      // Map to PlayerData format
      const topAssists = players.map((player) => ({
        player: {
          id: player.korastats_id,
          name: player.name,
          firstname: player.firstname || null,
          lastname: player.lastname || null,
          age: player.age,
          birth: {
            date: player.birth.date
              ? player.birth.date.toISOString().split("T")[0]
              : null,
            place: player.birth.place || null,
            country: player.birth.country || null,
          },
          nationality: player.nationality || null,
          height: player.height?.toString() || null,
          weight: player.weight?.toString() || null,
          injured: player.injured,
          photo: player.photo,
        },
        statistics: player.stats,
      }));

      this.cacheService.set(cacheKey, topAssists, 30 * 60 * 1000);
      return topAssists;
    } catch (error) {
      console.error("Failed to fetch top assists:", error);
      return [];
    }
  }

  /**
   * Get top scorers from new Player schema
   */
  async getTopScorers(options: {
    league: number;
    season: number;
  }): Promise<TopScorersResponse> {
    try {
      const cacheKey = `top_scorers_${options.league}_${options.season}`;

      const cached = this.cacheService.get<TopScorersResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get players with highest goals from new Player collection
      const players = await Models.Player.find({
        "stats.league.id": options.league,
        status: "active",
      })
        .sort({ "stats.goals.total": -1 })
        .limit(20)
        .lean();

      // Map to PlayerData format
      const topScorers = players.map((player) => ({
        player: {
          id: player.korastats_id,
          name: player.name,
          firstname: player.firstname || null,
          lastname: player.lastname || null,
          age: player.age,
          birth: {
            date: player.birth.date
              ? player.birth.date.toISOString().split("T")[0]
              : null,
            place: player.birth.place || null,
            country: player.birth.country || null,
          },
          nationality: player.nationality || null,
          height: player.height?.toString() || null,
          weight: player.weight?.toString() || null,
          injured: player.injured,
          photo: player.photo,
        },
        statistics: player.stats,
      }));

      this.cacheService.set(cacheKey, topScorers, 30 * 60 * 1000);
      return topScorers;
    } catch (error) {
      console.error("Failed to fetch top scorers:", error);
      return [];
    }
  }

  /**
   * Get player traits from new Player schema
   */
  async getPlayerTraits(playerId: number): Promise<any> {
    try {
      const cacheKey = `player_traits_${playerId}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        throw new ApiError(404, "Player not found");
      }

      const traits = player.playerTraits;
      this.cacheService.set(cacheKey, traits, 30 * 60 * 1000);
      return traits;
    } catch (error) {
      console.error("Failed to fetch player traits:", error);
      return {};
    }
  }

  /**
   * Get player transfer history from new Player schema
   */
  async getPlayerTransfer(playerId: number): Promise<PlayerTransfersResponse> {
    try {
      const cacheKey = `player_transfer_${playerId}`;

      const cached = this.cacheService.get<PlayerTransfersResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        throw new ApiError(404, "Player not found");
      }

      const team = await this.mapTeam(player.stats[0].team.id);

      // Map to transfer response format
      const transferData = {
        player: {
          player: {
            id: player.korastats_id,
            name: player.name,
            firstname: player.firstname || null,
            lastname: player.lastname || null,
            age: player.age,
            birth: {
              date: player.birth.date
                ? player.birth.date.toISOString().split("T")[0]
                : null,
              place: player.birth.place || null,
              country: player.birth.country || null,
            },
            nationality: player.nationality || null,
            height: player.height?.toString() || null,
            weight: player.weight?.toString() || null,
            injured: player.injured,
            photo: player.photo,
          },
          statistics: player.stats,
        },
        update: new Date().toISOString(),
        transfers: player.transfers.map((transfer) => ({
          date: transfer.date,
          type: transfer.type,
          teams: {
            in: {
              id: transfer.teams.in.id,
              name: transfer.teams.in.name,
              code: team.code || null,
              country: team.country,
              founded: team.founded || null,
              national: team.national,
              logo: transfer.teams.in.logo,
            },
            out: {
              id: transfer.teams.out.id,
              name: transfer.teams.out.name,
              code: team.code || null,
              country: team.country,
              founded: team.founded || null,
              national: team.national,
              logo: transfer.teams.out.logo,
            },
          },
        })),
      };

      this.cacheService.set(cacheKey, [transferData], 30 * 60 * 1000);
      return [transferData];
    } catch (error) {
      console.error("Failed to fetch player transfer:", error);
      return [];
    }
  }

  /**
   * Get player trophies from new Player schema
   */
  async getPlayerTrophies(playerId: number): Promise<TrophiesResponse> {
    try {
      const cacheKey = `player_trophies_${playerId}`;

      const cached = this.cacheService.get<TrophiesResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        return [];
      }

      const team = await this.mapTeam(player.trophies.team_id);

      // Map trophies to response format
      const trophies = [
        {
          league: {
            id: 0,
            name: player.trophies.league,
            type: "League",
            logo: "",
          },
          season: player.trophies.season.toString(),
          seasonInt: player.trophies.season,
          team: {
            id: player.trophies.team_id,
            name: player.trophies.team_name,
            code: team.code || null,
            country: team.country,
            founded: team.founded || null,
            national: team.national,
            logo: team.logo,
          },
        },
      ];

      this.cacheService.set(cacheKey, trophies, 30 * 60 * 1000);
      return trophies;
    } catch (error) {
      console.error("Failed to fetch player trophies:", error);
      return [];
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: number): Promise<PlayerStatsResponse> {
    try {
      const cacheKey = `player_stats_${playerId}`;

      const cached = this.cacheService.get<PlayerStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player from new Player collection
      const player = await Models.Player.findOne({ korastats_id: playerId }).lean();

      if (!player) {
        return [];
      }

      // Map to PlayerData format
      const playerData: PlayerData = {
        player: {
          id: player.korastats_id,
          name: player.name,
          firstname: player.firstname || null,
          lastname: player.lastname || null,
          age: player.age,
          birth: {
            date: player.birth.date
              ? player.birth.date.toISOString().split("T")[0]
              : null,
            place: player.birth.place || null,
            country: player.birth.country || null,
          },
          nationality: player.nationality || null,
          height: player.height?.toString() || null,
          weight: player.weight?.toString() || null,
          injured: player.injured,
          photo: player.photo,
        },
        statistics: player.stats,
      };

      this.cacheService.set(cacheKey, [playerData], 30 * 60 * 1000);
      return [playerData];
    } catch (error) {
      console.error("Failed to fetch player stats:", error);
      return [];
    }
  }
  private async mapTeam(teamId: number): Promise<Team> {
    const team = await Models.Team.findOne({ korastats_id: teamId }).lean();
    return {
      id: team.korastats_id,
      name: team.name,
      code: team.code || null,
      country: team.country,
      founded: team.founded || null,
      national: team.national,
      logo: team.logo,
    };
  }
}

