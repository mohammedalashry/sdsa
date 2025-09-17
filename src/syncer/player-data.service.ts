// src/syncer/player-data.service.ts
// Service for collecting comprehensive player data from KoraStats API
// Provides progress tracking, error handling, and integration with main syncer

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { PlayerNew } from "@/mapper/playerNew";
import { PlayerInterface } from "@/db/mogodb/schemas/player.schema";
import { ApiError } from "../core/middleware/error.middleware";
import {
  KorastatsEntityPlayerResponse,
  KorastatsTournamentPlayerStatsResponse,
  KorastatsPlayerInfoResponse,
  KorastatsSeasonPlayerTopStatsResponse,
  StatType,
} from "@/integrations/korastats/types";

export interface PlayerSyncOptions {
  tournamentId: number;
  season?: string;
  limit?: number;
  forceResync?: boolean;
  includeStats?: boolean;
  includeAnalytics?: boolean;
  playerIds?: number[]; // Sync specific players
}

export interface PlayerSyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface PlayerDataResult {
  playerId: number;
  success: boolean;
  data?: PlayerInterface;
  error?: string;
}

export class PlayerDataService {
  private korastatsService: KorastatsService;
  private playerMapper: PlayerNew;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.playerMapper = new PlayerNew();
  }

  // ===================================================================
  // MAIN SYNC METHODS
  // ===================================================================

  /**
   * Sync all players from a tournament with comprehensive data
   * Uses: TournamentPlayerStats + EntityPlayer + PlayerInfo + TopStats → Player Schema
   */
  async syncTournamentPlayers(options: PlayerSyncOptions): Promise<PlayerSyncProgress> {
    const progress: PlayerSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting tournament player sync...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`⚽ Syncing players for tournament ${options.tournamentId}...`);
      // Step 1: Get tournament teams with all their players
      progress.current = "Fetching tournament teams and players...";
      const teamPlayerListResponse =
        await this.korastatsService.getTournamentTeamPlayerList(options.tournamentId);

      if (!teamPlayerListResponse.data || !teamPlayerListResponse.data.teams?.length) {
        console.log(`ℹ️ No teams/players found for tournament ${options.tournamentId}`);
        progress.endTime = new Date();
        return progress;
      }

      const teamPlayerList = teamPlayerListResponse.data;
      console.log(`📊 Found ${teamPlayerList.teams.length} teams in tournament`);

      // Step 2: Collect all unique players from all teams
      const allPlayerIds = new Set<number>();
      const playerTeamMap = new Map<number, number>(); // playerId -> teamId

      teamPlayerList.teams.forEach((team) => {
        if (team.players && team.players.length > 0) {
          team.players.forEach((player) => {
            allPlayerIds.add(player.id);
            playerTeamMap.set(player.id, team.id);
          });
        }
      });

      let playerIdsToSync = Array.from(allPlayerIds);

      // Filter by specific player IDs if provided
      if (options.playerIds && options.playerIds.length > 0) {
        playerIdsToSync = playerIdsToSync.filter((playerId) =>
          options.playerIds.includes(playerId),
        );
        console.log(`📢 Limited to ${options.playerIds.length} specific players`);
      }

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        playerIdsToSync = playerIdsToSync.slice(0, options.limit);
        console.log(`📢 Limited to ${options.limit} players for testing`);
      }

      progress.total = playerIdsToSync.length;

      // Step 2: Get season top stats for achievements (optional)
      let topStatsMap = new Map();
      if (options.includeAnalytics) {
        try {
          progress.current = "Fetching season achievements data...";
          const topStatsPromises = [
            "Goals Scored",
            "Assists",
            "Yellow Card",
            "Red Card",
          ].map((statType) =>
            this.korastatsService.getSeasonPlayerTopStats(
              options.tournamentId,
              statType as any,
            ),
          );

          const topStatsResponses = await Promise.allSettled(topStatsPromises);

          for (const response of topStatsResponses) {
            if (response.status === "fulfilled" && response.value?.data) {
              const statData = response.value.data;
              for (const playerStat of statData.arrData || []) {
                if (!topStatsMap.has(playerStat.intPlayerID)) {
                  topStatsMap.set(playerStat.intPlayerID, []);
                }
                topStatsMap.get(playerStat.intPlayerID).push(statData);
              }
            }
          }
          console.log(`📊 Loaded top statistics for ${topStatsMap.size} players`);
        } catch (error) {
          console.warn(`⚠️ Failed to load top stats: ${error.message}`);
        }
      }

      // Step 3: Process each player individually
      for (const [index, playerId] of playerIdsToSync.entries()) {
        try {
          const teamId = playerTeamMap.get(playerId);
          progress.current = `Processing player ${index + 1}/${playerIdsToSync.length}: ID ${playerId}`;
          console.log(progress.current);

          // Fetch individual player data
          const entityPlayerResponse =
            await this.korastatsService.getEntityPlayer(playerId);
          const entityPlayer = (entityPlayerResponse as any).root?.object;
          console.log("entityPlayerResponse MODA", entityPlayerResponse);
          console.log("entityPlayer MODA", entityPlayer);
          if (!entityPlayer) {
            throw new Error(`No entity data found for player ${playerId}`);
          }
          console.log("options.tournamentId MODA", options.tournamentId);
          console.log("playerId MODA", playerId);
          // Fetch player tournament stats
          const playerStatsResponse =
            await this.korastatsService.getTournamentPlayerStats(
              options.tournamentId,
              playerId,
            );
          console.log("playerStatsResponse MODA", playerStatsResponse);
          // Ensure playerStats is always an array
          const playerStatsData = playerStatsResponse.data;
          const playerStats = Array.isArray(playerStatsData)
            ? playerStatsData
            : playerStatsData
              ? [playerStatsData]
              : [];
          console.log("playerStats MODA", playerStats);
          // Fetch player info if available
          let playerInfo;
          try {
            const playerInfoResponse =
              await this.korastatsService.getPlayerInfo(playerId);
            playerInfo = playerInfoResponse.data;
          } catch (error) {
            console.warn(
              `⚠️ Could not fetch player info for ${playerId}: ${error.message}`,
            );
            playerInfo = { _type: "PLAYER INFO", matches: [] };
          }

          // Map the player data
          console.log("=== MAPPER INPUT DEBUG ===");
          console.log("entityPlayer:", JSON.stringify(entityPlayer, null, 2));
          console.log("playerStats:", JSON.stringify(playerStats, null, 2));
          console.log("playerInfo:", JSON.stringify(playerInfo, null, 2));
          console.log(
            "topStats:",
            JSON.stringify(topStatsMap.get(playerId) || [], null, 2),
          );
          console.log("tournamentId:", options.tournamentId);
          console.log("=== END DEBUG ===");

          // Ensure all parameters are in correct format
          const safePlayerStats = Array.isArray(playerStats) ? playerStats : [];
          const safeTopStats = Array.isArray(topStatsMap.get(playerId))
            ? topStatsMap.get(playerId)
            : [];

          try {
            const mappedPlayer = await this.playerMapper.mapToPlayer(
              entityPlayer,
              safePlayerStats,
              playerInfo,
              safeTopStats,
              options.tournamentId,
            );

            // Store in database
            await Models.Player.findOneAndUpdate(
              { korastats_id: playerId },
              {
                ...mappedPlayer,
                last_synced: new Date(),
                updated_at: new Date(),
              },
              { upsert: true, new: true },
            );

            console.log(`✅ Successfully synced player ${playerId}`);
          } catch (mapperError) {
            console.error(
              `❌ Mapper failed for player ${playerId}:`,
              mapperError.message,
            );
            throw new Error(`Mapper failed: ${mapperError.message}`);
          }

          progress.completed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Player ${playerId}: ${error.message}`);
          console.error(`❌ Failed to sync player ${playerId}:`, error.message);
        }

        // Add small delay to respect API limits
        if (index < playerIdsToSync.length - 1 && index % 10 === 9) {
          console.log("⏱️ Pausing for API rate limiting...");
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay every 10 players
        }
      }

      progress.current = `Player sync completed: ${progress.completed}/${progress.total} players processed`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Player sync failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Player sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync specific players by their IDs
   */
  async syncSpecificPlayers(
    playerIds: number[],
    tournamentId: number,
    forceResync: boolean = false,
  ): Promise<PlayerSyncProgress> {
    return this.syncTournamentPlayers({
      tournamentId,
      playerIds,
      forceResync,
      includeStats: true,
      includeAnalytics: true,
    });
  }

  /**
   * Sync player career data (historical performance)
   */
  async syncPlayerCareerData(
    playerId: number,
    forceResync: boolean = false,
  ): Promise<PlayerDataResult> {
    try {
      console.log(`📊 Syncing career data for player ${playerId}...`);

      // Check if already exists and not forcing resync
      if (!forceResync) {
        const existing = await Models.Player.findOne({ korastats_id: playerId });
        if (existing) {
          console.log(`⭐ Player ${playerId} already exists - skipping career sync`);
          return { playerId, success: true, data: existing };
        }
      }

      // Fetch comprehensive player data
      const [entityResponse, playerInfoResponse] = await Promise.allSettled([
        this.korastatsService.getEntityPlayer(playerId),
        this.korastatsService.getPlayerInfo(playerId),
      ]);

      // Extract successful responses
      const entityPlayer = this.extractSuccessfulResponse(entityResponse, "entity");
      const playerInfo = this.extractSuccessfulResponse(playerInfoResponse, "info");

      if (!entityPlayer) {
        throw new Error("Failed to get basic player information");
      }

      // Get tournament stats for current season (if available)
      let tournamentStats = [];
      let currentTournament = 0;
      try {
        // Try to get current tournament stats
        currentTournament = await this.getCurrentTournamentId();
        if (currentTournament) {
          const statsResponse = await this.korastatsService.getTournamentPlayerStats(
            currentTournament,
            playerId,
          );
          if (statsResponse.data) {
            tournamentStats = statsResponse.data.filter((stat) => stat.id === playerId);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch tournament stats for player ${playerId}`);
      }

      // Map to player interface
      const playerData = await this.playerMapper.mapToPlayer(
        entityPlayer,
        tournamentStats,
        playerInfo || { _type: "PLAYER INFO", matches: [] },
        [], // No top stats for career sync
        currentTournament || 0,
      );

      // Store in MongoDB
      const savedPlayer = await Models.Player.findOneAndUpdate(
        { korastats_id: playerId },
        playerData,
        { upsert: true, new: true },
      );

      console.log(`✅ Synced career data for player: ${playerId}`);
      return { playerId, success: true, data: savedPlayer };
    } catch (error) {
      console.error(
        `❌ Failed to sync career data for player ${playerId}:`,
        error.message,
      );
      return { playerId, success: false, error: error.message };
    }
  }

  // ===================================================================
  // SINGLE PLAYER SYNC METHODS
  // ===================================================================

  /**
   * Sync single player with comprehensive data
   */
  private async syncSinglePlayer(
    playerId: number,
    tournamentId: number,
    tournamentStats: any[],
    topStats: any[],
    forceResync: boolean = false,
  ): Promise<void> {
    // Check if already exists and not forcing resync
    if (!forceResync) {
      const existing = await Models.Player.findOne({ korastats_id: playerId });
      if (existing) {
        console.log(`⭐ Skipping player ${playerId} - already exists`);
        return;
      }
    }

    try {
      // Fetch additional player data in parallel
      const [entityResponse, playerInfoResponse] = await Promise.allSettled([
        this.korastatsService.getEntityPlayer(playerId),
        this.korastatsService.getPlayerInfo(playerId),
      ]);

      // Extract successful responses
      const entityPlayer = this.extractSuccessfulResponse(entityResponse, "entity");
      const playerInfo = this.extractSuccessfulResponse(playerInfoResponse, "info");

      if (!entityPlayer) {
        throw new Error(
          "Failed to get basic player information from EntityPlayer endpoint",
        );
      }

      console.log(`📊 Player ${playerId} data availability:`, {
        entity: !!entityPlayer,
        tournamentStats: tournamentStats.length > 0,
        playerInfo: !!playerInfo,
        topStats: topStats.length > 0,
      });

      // Use mapper to create comprehensive player data
      const playerData = await this.playerMapper.mapToPlayer(
        entityPlayer,
        tournamentStats,
        playerInfo || { _type: "PLAYER INFO", matches: [] },
        topStats,
        tournamentId,
      );

      // Store in MongoDB
      await Models.Player.findOneAndUpdate({ korastats_id: playerId }, playerData, {
        upsert: true,
        new: true,
      });

      console.log(`✅ Synced player data: ${playerId} (${entityPlayer.nickname})`);
    } catch (error) {
      console.error(`❌ Failed to sync player ${playerId}:`, error.message);
      throw error;
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Extract successful response from Promise.allSettled result
   */
  private extractSuccessfulResponse(
    result: PromiseSettledResult<any>,
    dataType: string,
  ): any | null {
    if (
      result.status === "fulfilled" &&
      result.value?.result === "Success" &&
      result.value?.data
    ) {
      return result.value.data;
    }

    if (result.status === "rejected") {
      console.warn(`⚠️ Failed to fetch player ${dataType}:`, result.reason?.message);
    } else if (result.status === "fulfilled") {
      console.warn(`⚠️ No player ${dataType} data available:`, result.value?.message);
    }

    return null;
  }

  /**
   * Get current tournament ID (helper method)
   */
  private async getCurrentTournamentId(): Promise<number | null> {
    try {
      const tournamentResponse = await this.korastatsService.getTournamentList();
      if (tournamentResponse.data && tournamentResponse.data.length > 0) {
        // Return the first active tournament
        return tournamentResponse.data[0].id;
      }
    } catch (error) {
      console.warn("Could not determine current tournament ID");
    }
    return null;
  }

  /**
   * Get sync status for players in a tournament
   */
  async getPlayerSyncStatus(tournamentId: number): Promise<{
    totalPlayers: number;
    syncedPlayers: number;
    lastSync: Date | null;
    playersWithStats: number;
  }> {
    try {
      const [totalFromTournament, syncedPlayers, playersWithStats, lastSyncPlayer] =
        await Promise.all([
          // Get total players from tournament stats
          this.korastatsService
            .getTournamentPlayerStats(tournamentId, 0)
            .then((response) => response.data?.length || 0)
            .catch(() => 0),

          // Count synced players in database
          Models.Player.countDocuments({}),

          // Count players with statistics
          Models.Player.countDocuments({ "stats.0": { $exists: true } }),

          // Get last synced player
          Models.Player.findOne({}, {}, { sort: { last_synced: -1 } }),
        ]);

      return {
        totalPlayers: totalFromTournament,
        syncedPlayers,
        lastSync: lastSyncPlayer?.last_synced || null,
        playersWithStats,
      };
    } catch (error) {
      console.error("Failed to get player sync status:", error);
      return {
        totalPlayers: 0,
        syncedPlayers: 0,
        lastSync: null,
        playersWithStats: 0,
      };
    }
  }

  /**
   * Clear all player data (for re-sync)
   */
  async clearAllPlayers(): Promise<void> {
    try {
      await Models.Player.deleteMany({});
      console.log(`🗑️ Cleared all player data`);
    } catch (error) {
      console.error("Failed to clear player data:", error);
      throw error;
    }
  }

  /**
   * Update player statistics for existing players
   */
  async updatePlayerStatistics(
    tournamentId: number,
    forceUpdate: boolean = false,
  ): Promise<PlayerSyncProgress> {
    const progress: PlayerSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting player statistics update...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`📊 Updating player statistics for tournament ${tournamentId}...`);

      // Get all existing players
      const existingPlayers = await Models.Player.find({}).lean();
      progress.total = existingPlayers.length;

      if (existingPlayers.length === 0) {
        console.log("ℹ️ No existing players found to update");
        progress.endTime = new Date();
        return progress;
      }

      // Get fresh tournament statistics
      const playerStatsResponse = await this.korastatsService.getTournamentPlayerStats(
        tournamentId,
        0,
      );

      if (!playerStatsResponse.data) {
        throw new Error("Failed to fetch tournament player statistics");
      }

      const statsMap = new Map(playerStatsResponse.data.map((stat) => [stat.id, stat]));

      // Update each player's statistics
      for (const [index, player] of existingPlayers.entries()) {
        try {
          progress.current = `Updating player ${index + 1}/${existingPlayers.length}: ${player.name}`;

          const newStats = statsMap.get(player.korastats_id);
          if (newStats) {
            // Re-map statistics using the mapper
            const updatedStats = await this.playerMapper.mapToPlayer(
              {
                _type: "PLAYER",
                id: player.korastats_id,
                fullname: player.name,
                nickname: player.name,
                nationality: { id: 0, name: player.nationality },
                dob: player.birth.date.toISOString(),
                age: player.age.toString(),
                positions: player.positions,
                retired: player.status === "retired",
                current_team: player.current_team,
                gender: "male",
                image: player.photo,
                last_updated: new Date().toISOString(),
              },
              [newStats],
              { _type: "PLAYER INFO", matches: [] },
              [],
              tournamentId,
            );

            // Update only statistics-related fields
            await Models.Player.findOneAndUpdate(
              { korastats_id: player.korastats_id },
              {
                stats: updatedStats.stats,
                playerTraits: updatedStats.playerTraits,
                last_synced: new Date(),
                updated_at: new Date(),
              },
            );

            progress.completed++;
          } else {
            console.log(`⚠️ No new statistics found for player ${player.korastats_id}`);
            progress.completed++;
          }
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Player ${player.korastats_id}: ${error.message}`);
          console.error(
            `❌ Failed to update player ${player.korastats_id}:`,
            error.message,
          );
        }
      }

      progress.current = `Statistics update completed: ${progress.completed}/${progress.total} players updated`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Statistics update failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Player statistics update failed:", error);
      throw error;
    }
  }

  /**
   * Sync missing players from tournament
   */
  async syncMissingPlayers(tournamentId: number): Promise<PlayerSyncProgress> {
    try {
      console.log(`🔍 Finding missing players for tournament ${tournamentId}...`);

      // Get all tournament players
      const playerStatsResponse = await this.korastatsService.getTournamentPlayerStats(
        tournamentId,
        0,
      );

      if (!playerStatsResponse.data) {
        throw new Error("Failed to fetch tournament player statistics");
      }

      // Get existing player IDs
      const existingPlayerIds = await Models.Player.distinct("korastats_id");
      const existingSet = new Set(existingPlayerIds);

      // Find missing players
      const missingPlayers = playerStatsResponse.data.filter(
        (player) => !existingSet.has(player.id),
      );

      console.log(
        `📊 Found ${missingPlayers.length} missing players out of ${playerStatsResponse.data.length} total`,
      );

      if (missingPlayers.length === 0) {
        return {
          total: 0,
          completed: 0,
          failed: 0,
          current: "No missing players found",
          startTime: new Date(),
          endTime: new Date(),
          errors: [],
        };
      }

      // Sync missing players
      return this.syncTournamentPlayers({
        tournamentId,
        playerIds: missingPlayers.map((p) => p.id),
        forceResync: false,
        includeStats: true,
        includeAnalytics: true,
      });
    } catch (error) {
      console.error("❌ Failed to sync missing players:", error);
      throw error;
    }
  }
}

