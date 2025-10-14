// src/syncer/player-data.service.ts
// Service for collecting comprehensive player data from KoraStats API
// Provides progress tracking, error handling, and integration with main syncer

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { PlayerNew } from "@/mapper/playerNew";
import { PlayerInterface } from "@/db/mogodb/schemas/player.schema";

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

// Stat type constants based on ListStatTypes response
const STAT_TYPE_CONSTANTS = {
  SUCCESS_PASSES: { id: 1, name: "Success Passes" },
  TOTAL_PASSES: { id: 2, name: "Total Passes" },
  SUCCESS_CROSSES: { id: 3, name: "Success Crosses" },
  TOTAL_CROSSES: { id: 4, name: "Total Crosses" },
  SUCCESS_LONG_PASS: { id: 5, name: "Success Long Pass" },
  TOTAL_LONG_PASS: { id: 6, name: "Total Long Pass" },
  TOTAL_BALL_LOST: { id: 8, name: "Total Ball Lost" },
  TOTAL_BALL_WON: { id: 9, name: "Total Ball Won" },
  TOTAL_ATTEMPTS: { id: 12, name: "Total Attempts" },
  SUCCESS_ATTEMPTS: { id: 13, name: "Success Attempts" },
  YELLOW_CARD: { id: 14, name: "Yellow Card" },
  SECOND_YELLOW_CARD: { id: 15, name: "Second Yellow Card" },
  RED_CARD: { id: 16, name: "Red Card" },
  FOULS_COMMITED: { id: 17, name: "Fouls Commited" },
  MINUTES_PLAYED: { id: 20, name: "Minutes Played" },
  GOALS_SCORED: { id: 21, name: "Goals Scored" },
  ASSISTS: { id: 22, name: "Assists" },
  OWN_GOALS: { id: 23, name: "Own Goals" },
  CORNERS: { id: 24, name: "Corners" },
  OFFSIDES: { id: 25, name: "Offsides" },
  OWN_GOALS_IN_FAVOUR: { id: 26, name: "Own Goals in Favour" },
  MATCHES_PLAYED_AS_LINEUP: { id: 27, name: "Matches Played as Lineup" },
  GOALS_CONCEDED: { id: 28, name: "Goals Conceded" },
  MATCHES_PLAYED_AS_SUB: { id: 29, name: "Matches Played as Sub" },
  POSSESSION: { id: 30, name: "Possession" },
  POSSESSION_0_15: { id: 31, name: "Possession 0-15" },
  POSSESSION_15_30: { id: 32, name: "Possession 15-30" },
  POSSESSION_30_45: { id: 33, name: "Possession 30-45" },
  POSSESSION_45_60: { id: 34, name: "Possession 45-60" },
  POSSESSION_60_75: { id: 35, name: "Possession 60-75" },
  POSSESSION_75_90: { id: 36, name: "Possession 75-90" },
  GOALS_SCORED_BY_HEAD: { id: 46, name: "Goals Scored By Head" },
  BALL_RECEIVED_SUCCESS: { id: 47, name: "Ball Received Success" },
  PENALTY_COMMITTED: { id: 48, name: "Penalty Committed" },
  PENALTY_AWARDED: { id: 49, name: "Penalty Awarded" },
  PENALTY_MISSED: { id: 50, name: "Penalty Missed" },
  PENALTY_SCORED: { id: 51, name: "Penalty Scored" },
  GOALS_SAVED: { id: 52, name: "Goals Saved" },
  FOULS_AWARDED: { id: 53, name: "Fouls Awarded" },
  BLOCKS: { id: 54, name: "Blocks" },
  OPPORTUNITY_SAVE: { id: 55, name: "Opportunity Save" },
  ATTEMPTS_ON_BARS: { id: 56, name: "Attempts on Bars" },
  ONE_ON_ONE_MISSED: { id: 57, name: "One on One Missed" },
  TOTAL_SHORT_PASS: { id: 58, name: "Total Short Pass" },
  SUCCESS_SHORT_PASS: { id: 59, name: "Success Short Pass" },
  DRIBBLE_SUCCESS: { id: 60, name: "Dribble Success" },
  BALL_LOST_UNDER_PRESSURE: { id: 61, name: "Ball Lost Under Pressure" },
  GOALS_SCORED_0_15: { id: 62, name: "GoalsScored 0-15" },
  GOALS_SCORED_15_30: { id: 63, name: "GoalsScored 15-30" },
  GOALS_SCORED_30_45: { id: 64, name: "GoalsScored 30-45" },
  GOALS_SCORED_45_60: { id: 65, name: "GoalsScored 45-60" },
  GOALS_SCORED_60_75: { id: 66, name: "GoalsScored 60-75" },
  GOALS_SCORED_75_90: { id: 67, name: "GoalsScored 75-90" },
  GOALS_SCORED_BY_RIGHT_FOOT: { id: 68, name: "Goals Scored By Right Foot" },
  GOALS_SCORED_BY_LEFT_FOOT: { id: 69, name: "Goals Scored By Left Foot" },
  GOALS_SCORED_BY_OTHER: { id: 70, name: "Goals Scored By Other" },
  TACKLE_WON: { id: 81, name: "TackleWon" },
  TACKLE_FAIL: { id: 82, name: "TackleFail" },
  TACKLE_CLEAR: { id: 83, name: "TackleClear" },
  INTERCEPT_WON: { id: 84, name: "InterceptWon" },
  INTERCEPT_CLEAR: { id: 85, name: "InterceptClear" },
  AERIAL_WON: { id: 86, name: "Aerial Won" },
  AERIAL_LOST: { id: 87, name: "Aerial Lost" },
  BALL_RECEIVED_FAIL: { id: 88, name: "Ball Received Fail" },
  BALL_RECOVER: { id: 89, name: "Ball Recover" },
  CLEAR: { id: 90, name: "Clear" },
  DRIBBLE_FAIL: { id: 91, name: "Dribble Fail" },
  KEY_PASSES: { id: 92, name: "KeyPasses" },
  SUCCESS_OPEN_PLAY_CROSSES: { id: 93, name: "Success Open Play Crosses" },
  TOTAL_OPEN_PLAY_CROSSES: { id: 94, name: "Total Open Play Crosses" },
  SUCCESS_SET_PIECE_CROSSES: { id: 95, name: "Success Set-Piece Crosses" },
  TOTAL_SET_PIECE_CROSSES: { id: 96, name: "Total Set-Piece Crosses" },
  DIRECT_SET_PIECE_GOAL_SCORED: { id: 97, name: "Direct Set Piece Goal Scored" },
  FOULS_COMMITED_IN_DEFENSIVE_THIRD: {
    id: 98,
    name: "Fouls Commited In Defensive Third",
  },
  FOULS_AWARDED_IN_OFFENSIVE_THIRD: { id: 99, name: "Fouls Awarded In Offensive Third" },
  CHANCE_CREATED: { id: 100, name: "Chance Created" },
  CLEAN_SHEET: { id: 101, name: "Clean Sheet" },
  WIN: { id: 173, name: "Win" },
  DRAW: { id: 174, name: "Draw" },
  LOST: { id: 175, name: "Lost" },
  XG: { id: 106, name: "XG" },
  XGA: { id: 107, name: "XGA" },
  ATTEMPTS_SAVED: { id: 108, name: "Attempts Saved" },
} as const;

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
            STAT_TYPE_CONSTANTS.GOALS_SCORED.id,
            STAT_TYPE_CONSTANTS.ASSISTS.id,
            STAT_TYPE_CONSTANTS.YELLOW_CARD.id,
            STAT_TYPE_CONSTANTS.RED_CARD.id,
          ].map((statTypeId) =>
            this.korastatsService.getSeasonPlayerTopStats(
              options.tournamentId,
              statTypeId,
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
          if (!entityPlayer) {
            throw new Error(`No entity data found for player ${playerId}`);
          }
          // Fetch player tournament stats
          const playerStatsResponse =
            await this.korastatsService.getTournamentPlayerStats(
              options.tournamentId,
              playerId,
            );
          // Ensure playerStats is always an array
          const playerStatsData = playerStatsResponse.data;
          const playerStats = Array.isArray(playerStatsData)
            ? playerStatsData
            : playerStatsData
              ? [playerStatsData]
              : [];
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
          // Ensure all parameters are in correct format
          const safePlayerStats = Array.isArray(playerStats) ? playerStats : [];
          const safeTopStats = Array.isArray(topStatsMap.get(playerId))
            ? topStatsMap.get(playerId)
            : [];

          try {
            const mappedPlayer = await this.playerMapper.mapToPlayer(
              entityPlayer,
              safePlayerStats,
              safeTopStats,
              options.tournamentId,
            );

            // Check if player already exists for merging
            const existingPlayer = await Models.Player.findOne({
              korastats_id: playerId,
            });

            if (existingPlayer && !options.forceResync) {
              // Merge data instead of replacing
              await this.mergePlayerStats(
                existingPlayer as PlayerInterface,
                mappedPlayer,
              );
              await this.mergePlayerAchievements(
                existingPlayer as PlayerInterface,
                mappedPlayer,
              );
              await this.mergePlayerCareerSummary(
                existingPlayer as PlayerInterface,
                mappedPlayer,
              );
              console.log(`✅ Successfully merged player ${playerId}`);
            } else {
              // Store new player or force resync
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
            }
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
   * Merge player stats arrays ensuring uniqueness by league.id + league.season
   */
  private async mergePlayerStats(
    existingPlayer: PlayerInterface,
    newPlayerData: PlayerInterface,
  ): Promise<void> {
    const existingStats = existingPlayer.stats || [];
    const newStats = newPlayerData.stats || [];

    // Create a map of existing stats by league.id + season (from stat level)
    const existingStatsMap = new Map<string, any>();
    existingStats.forEach((stat) => {
      const key = `${stat.league.id}-${stat.league.season}`;
      existingStatsMap.set(key, stat);
    });

    // Merge new stats, updating existing ones or adding new ones
    const mergedStats = [...existingStats];
    newStats.forEach((newStat) => {
      const key = `${newStat.league.id}-${newStat.league.season}`;
      if (existingStatsMap.has(key)) {
        // Update existing stat
        const existingIndex = mergedStats.findIndex((stat) => {
          return `${stat.league.id}-${stat.league.season}` === key;
        });
        if (existingIndex !== -1) {
          mergedStats[existingIndex] = newStat;
        }
      } else {
        // Add new stat
        mergedStats.push(newStat);
      }
    });

    // Update the player with merged stats
    await Models.Player.findOneAndUpdate(
      { korastats_id: existingPlayer.korastats_id },
      {
        stats: mergedStats,
        playerTraits: newPlayerData.playerTraits,
        topScorers: newPlayerData.topScorers,
        topAssists: newPlayerData.topAssists,
        career_summary: newPlayerData.career_summary,
        last_synced: new Date(),
        updated_at: new Date(),
      },
    );
  }

  /**
   * Merge player achievements (topScorers, topAssists) ensuring uniqueness by season + league
   */
  private async mergePlayerAchievements(
    existingPlayer: PlayerInterface,
    newPlayerData: PlayerInterface,
  ): Promise<void> {
    const existingTopScorers = existingPlayer.topScorers || [];
    const existingTopAssists = existingPlayer.topAssists || [];
    const newTopScorers = newPlayerData.topScorers || [];
    const newTopAssists = newPlayerData.topAssists || [];

    // Merge topScorers by season + league
    const topScorersMap = new Map<string, any>();
    [...existingTopScorers, ...newTopScorers].forEach((achievement) => {
      const key = `${achievement.season}-${achievement.league}`;
      topScorersMap.set(key, achievement);
    });

    // Merge topAssists by season + league
    const topAssistsMap = new Map<string, any>();
    [...existingTopAssists, ...newTopAssists].forEach((achievement) => {
      const key = `${achievement.season}-${achievement.league}`;
      topAssistsMap.set(key, achievement);
    });

    // Update the player with merged achievements
    await Models.Player.findOneAndUpdate(
      { korastats_id: existingPlayer.korastats_id },
      {
        topScorers: Array.from(topScorersMap.values()),
        topAssists: Array.from(topAssistsMap.values()),
        last_synced: new Date(),
        updated_at: new Date(),
      },
    );
  }

  /**
   * Merge player career summary ensuring uniqueness by season
   */
  private async mergePlayerCareerSummary(
    existingPlayer: PlayerInterface,
    newPlayerData: PlayerInterface,
  ): Promise<void> {
    const existingCareerData = existingPlayer.career_summary?.careerData || [];
    const newCareerData = newPlayerData.career_summary?.careerData || [];

    // Create a map of existing career data by season
    const careerDataMap = new Map<number, any>();
    existingCareerData.forEach((career) => {
      careerDataMap.set(career.season, career);
    });

    // Merge new career data, updating existing ones or adding new ones
    newCareerData.forEach((newCareer) => {
      careerDataMap.set(newCareer.season, newCareer);
    });

    const mergedCareerData = Array.from(careerDataMap.values());
    const totalMatches = mergedCareerData.reduce(
      (total, career) => total + (career.matches || 0),
      0,
    );

    // Update the player with merged career summary
    await Models.Player.findOneAndUpdate(
      { korastats_id: existingPlayer.korastats_id },
      {
        career_summary: {
          total_matches: totalMatches,
          careerData: mergedCareerData,
        },
        last_synced: new Date(),
        updated_at: new Date(),
      },
    );
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
                dob: player.birth.date,
                age: player.age.toString(),
                positions: player.positions,
                retired: player.status === "retired",
                current_team: player.current_team,
                gender: "male",
                image: player.photo,
                last_updated: new Date().toISOString(),
              },
              [newStats],
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

      // Get all tournament teams first
      const tournamentTeamListResponse =
        await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
      const tournamentTeamList = tournamentTeamListResponse?.data;

      if (!tournamentTeamList || !tournamentTeamList.teams?.length) {
        throw new Error("Failed to fetch tournament team list");
      }

      // Extract all player IDs from all teams
      const allPlayerIds: number[] = [];
      const playerTeamMap = new Map<number, number>();

      for (const team of tournamentTeamList.teams) {
        if (team.players && Array.isArray(team.players)) {
          for (const player of team.players) {
            if (player.id && !allPlayerIds.includes(player.id)) {
              allPlayerIds.push(player.id);
              playerTeamMap.set(player.id, team.id);
            }
          }
        }
      }

      console.log(`📊 Found ${allPlayerIds.length} total players in tournament`);

      // Get existing player IDs
      const existingPlayerIds = await Models.Player.distinct("korastats_id");
      const existingSet = new Set(existingPlayerIds);

      // Find missing players
      const missingPlayerIds = allPlayerIds.filter(
        (playerId) => !existingSet.has(playerId),
      );

      console.log(
        `📊 Found ${missingPlayerIds.length} missing players out of ${allPlayerIds.length} total`,
      );

      if (missingPlayerIds.length === 0) {
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
        playerIds: missingPlayerIds,
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

