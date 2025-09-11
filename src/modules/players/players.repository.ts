// src/modules/players/players.repository.ts
// Players repository that extracts data from match comprehensive data

import { Models } from "@/db/mogodb/models";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { ApiError } from "@/core/middleware/error.middleware";
import {
  PlayerInfo,
  PlayerStatistics,
  PlayerData,
  CoachData,
} from "@/legacy-types/players.types";
import { FixtureDataResponse } from "@/legacy-types/fixtures.types";

export class PlayersRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Get player career data from match data
   */
  async getPlayerCareer(playerId: number): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_career_${playerId}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player data from match comprehensive data
      const matches = await Models.Match.find({
        "playersStats.player.id": playerId,
      })
        .sort({ date: -1 })
        .limit(50);

      if (matches.length === 0) {
        console.log(`📦 No player data found in matches for player ${playerId}`);
        return [];
      }

      const career = await this.mapMatchDataToPlayerCareer(matches, playerId);
      this.cacheService.set(cacheKey, career, 30 * 60 * 1000); // Cache for 30 minutes
      return career;
    } catch (error) {
      console.error("Failed to fetch player career:", error);
      return [];
    }
  }

  /**
   * Get player comparison stats
   */
  async getPlayerComparisonStats(playerId: number): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_comparison_${playerId}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player data from matches
      const matches = await Models.Match.find({
        "playersStats.player.id": playerId,
      })
        .sort({ date: -1 })
        .limit(20);

      if (matches.length === 0) {
        return [];
      }

      const comparison = await this.mapMatchDataToPlayerCareer(matches, playerId);
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

      // Get matches where player participated
      const matches = await Models.Match.find({
        "playersStats.player.id": playerId,
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = matches.map((match) => ({
        fixture: {
          id: match.korastats_id,
          referee: match.officials?.referee?.name || null,
          timezone: "UTC",
          date: match.date,
          timestamp: Math.floor(new Date(match.date).getTime() / 1000),
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
            long: match.status?.long || "Finished",
            short: match.status?.short || "FT",
            elapsed: match.status?.elapsed || null,
          },
        },
        league: {
          id: match.league?.id || 0,
          name: match.league?.name || "",
          country: match.league?.country || "Saudi Arabia",
          logo: "",
          flag: null,
          season: match.season || "",
          round: match.round || "",
        },
        teams: {
          home: {
            id: match.teams?.home?.id || 0,
            name: match.teams?.home?.name || "",
            logo: "",
            winner: match.teams?.home?.winner || false,
          },
          away: {
            id: match.teams?.away?.id || 0,
            name: match.teams?.away?.name || "",
            logo: "",
            winner: match.teams?.away?.winner || false,
          },
        },
        goals: {
          home: match.score?.home || null,
          away: match.score?.away || null,
        },
        score: {
          halftime: {
            home: null,
            away: null,
          },
          fulltime: {
            home: match.score?.home || null,
            away: match.score?.away || null,
          },
          extratime: {
            home: null,
            away: null,
          },
          penalty: {
            home: null,
            away: null,
          },
        },
      }));

      const response: FixtureDataResponse = {
        fixtures,
        pagination: {
          page: 1,
          pageSize: fixtures.length,
          total: fixtures.length,
        },
      };

      this.cacheService.set(cacheKey, response, 15 * 60 * 1000);
      return response;
    } catch (error) {
      console.error("Failed to fetch player fixtures:", error);
      throw new ApiError(500, "Failed to fetch player fixtures");
    }
  }

  /**
   * Get player info
   */
  async getPlayerInfo(playerId: number): Promise<PlayerInfo> {
    try {
      const cacheKey = `player_info_${playerId}`;

      const cached = this.cacheService.get<PlayerInfo>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player data from matches
      const matches = await Models.Match.find({
        "playersStats.player.id": playerId,
      })
        .sort({ date: -1 })
        .limit(10);

      if (matches.length === 0) {
        throw new ApiError(404, "Player not found");
      }

      // Get player data from first match
      const firstMatch = matches[0];
      const playerStats = firstMatch.playersStats.find(
        (p: any) => p.player.id === playerId,
      );

      if (!playerStats) {
        throw new ApiError(404, "Player data not found");
      }

      const playerInfo: PlayerInfo = {
        player: {
          id: playerStats.player.id,
          name: playerStats.player.name,
          firstname: playerStats.player.name.split(" ")[0] || "",
          lastname: playerStats.player.name.split(" ").slice(1).join(" ") || "",
          age: null, // Would need to calculate from birth date
          birth: {
            date: null,
            place: null,
            country: null,
          },
          nationality: null, // Would need to get from player data
          height: null,
          weight: null,
          injured: false,
          photo: "", // Would need to get from ImageLoad
        },
        statistics: await this.mapMatchDataToPlayerCareer(matches, playerId),
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
   * Get player statistics
   */
  async getPlayerStats(playerId: number): Promise<PlayerStatistics[]> {
    try {
      const cacheKey = `player_stats_${playerId}`;

      const cached = this.cacheService.get<PlayerStatistics[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get player data from matches
      const matches = await Models.Match.find({
        "playersStats.player.id": playerId,
      })
        .sort({ date: -1 })
        .limit(50);

      if (matches.length === 0) {
        return [];
      }

      const stats = await this.mapMatchDataToPlayerCareer(matches, playerId);
      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000);
      return stats;
    } catch (error) {
      console.error("Failed to fetch player stats:", error);
      return [];
    }
  }

  /**
   * Map match data to player career format
   */
  private async mapMatchDataToPlayerCareer(
    matches: any[],
    playerId: number,
  ): Promise<PlayerStatistics[]> {
    const careerMap = new Map<string, any>();

    matches.forEach((match) => {
      const playerStats = match.playersStats.find((p: any) => p.player.id === playerId);
      if (playerStats) {
        const season = match.season;
        if (!careerMap.has(season)) {
          careerMap.set(season, {
            season: season,
            team: {
              id: match.teams.home.id,
              name: match.teams.home.name,
            },
            league: {
              id: match.league.id,
              name: match.league.name,
            },
            games: {
              appearences: 0,
              lineups: 0,
              minutes: 0,
              number: playerStats.player.number,
              position: playerStats.player.statistics.games.position,
              rating: playerStats.player.statistics.games.rating,
              captain: playerStats.player.statistics.games.captain,
            },
            substitutes: {
              in: 0,
              out: 0,
              bench: 0,
            },
            shots: {
              total: 0,
              on: 0,
            },
            goals: {
              total: 0,
              conceded: 0,
              assists: 0,
              saves: 0,
            },
            passes: {
              total: 0,
              key: 0,
              accuracy: 0,
            },
            tackles: {
              total: 0,
              blocks: 0,
              interceptions: 0,
            },
            duels: {
              total: 0,
              won: 0,
            },
            dribbles: {
              attempts: 0,
              success: 0,
              past: 0,
            },
            fouls: {
              drawn: 0,
              committed: 0,
            },
            cards: {
              yellow: 0,
              yellowred: 0,
              red: 0,
            },
          });
        }

        const seasonData = careerMap.get(season);
        // Aggregate stats
        seasonData.games.appearences += 1;
        seasonData.games.minutes += playerStats.player.statistics.games.minutes;
        seasonData.shots.total += playerStats.player.statistics.shots.total;
        seasonData.shots.on += playerStats.player.statistics.shots.on;
        seasonData.goals.total += playerStats.player.statistics.goals.total;
        seasonData.goals.assists += playerStats.player.statistics.goals.assists;
        seasonData.passes.total += playerStats.player.statistics.passes.total;
        seasonData.passes.key += playerStats.player.statistics.passes.key;
        seasonData.cards.yellow += playerStats.player.statistics.cards.yellow;
        seasonData.cards.red += playerStats.player.statistics.cards.red;
      }
    });

    return Array.from(careerMap.values());
  }
}
