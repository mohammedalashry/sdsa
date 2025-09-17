// src/syncer/team-data.service.ts
// Team Data Collector Service - Orchestrates team data syncing from KoraStats

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "@/db/mogodb/models";
import { TeamNew } from "@/mapper/teamNew";
import { TeamInterface } from "@/db/mogodb/schemas/team.schema";
import {
  KorastatsTournamentTeamList,
  KorastatsTournamentTeamStats,
  KorastatsTeamInfo,
  KorastatsTeamListItem,
} from "@/integrations/korastats/types/team.types";

export interface TeamSyncProgress {
  phase:
    | "fetching_teams"
    | "fetching_stats"
    | "fetching_info"
    | "mapping"
    | "storing"
    | "completed"
    | "error";
  current: number;
  total: number;
  currentTeam?: string;
  message: string;
  errors: string[];
}

export class TeamDataService {
  private readonly logger = console;

  constructor(
    private readonly korastatsService: KorastatsService,
    private readonly teamMapper: TeamNew,
  ) {}

  /**
   * Sync all teams for a tournament with comprehensive data
   */
  async syncTournamentTeams(
    tournamentId: number,
    onProgress?: (progress: TeamSyncProgress) => void,
  ): Promise<{
    success: boolean;
    teamsProcessed: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let teamsProcessed = 0;

    try {
      this.logger.log(`Starting comprehensive team sync for tournament ${tournamentId}`);

      // Phase 1: Fetch tournament teams
      onProgress?.({
        phase: "fetching_teams",
        current: 0,
        total: 0,
        message: "Fetching tournament teams...",
        errors: [],
      });

      const tournamentTeamListResponse =
        await this.korastatsService.getTournamentTeamList(tournamentId);
      const tournamentTeamList = tournamentTeamListResponse.data;

      if (!tournamentTeamList?.teams?.length) {
        throw new Error(`No teams found for tournament ${tournamentId}`);
      }

      const totalTeams = tournamentTeamList.teams.length;
      this.logger.log(`Found ${totalTeams} teams for tournament ${tournamentId}`);

      // Process teams in batches to avoid overwhelming the API
      const batchSize = 5;
      const teamBatches = this.chunkArray(tournamentTeamList.teams, batchSize);

      for (let batchIndex = 0; batchIndex < teamBatches.length; batchIndex++) {
        const batch = teamBatches[batchIndex];

        // Process batch concurrently
        await Promise.all(
          batch.map(async (teamItem, itemIndex) => {
            const globalIndex = batchIndex * batchSize + itemIndex;

            try {
              await this.syncSingleTeam(teamItem, tournamentId, (progress) => {
                onProgress?.({
                  ...progress,
                  current: globalIndex + 1,
                  total: totalTeams,
                  currentTeam: teamItem.team,
                });
              });
              teamsProcessed++;
            } catch (error) {
              const errorMsg = `Failed to sync team ${teamItem.team} (ID: ${teamItem.id}): ${error.message}`;
              this.logger.error(errorMsg);
              errors.push(errorMsg);
            }
          }),
        );

        // Add delay between batches to respect API rate limits
        if (batchIndex < teamBatches.length - 1) {
          await this.delay(2000); // 2 second delay between batches
        }
      }

      const duration = Date.now() - startTime;

      onProgress?.({
        phase: "completed",
        current: totalTeams,
        total: totalTeams,
        message: `Completed team sync. Processed ${teamsProcessed}/${totalTeams} teams`,
        errors,
      });

      this.logger.log(
        `Team sync completed for tournament ${tournamentId}. ` +
          `Processed: ${teamsProcessed}/${totalTeams}, Duration: ${duration}ms, Errors: ${errors.length}`,
      );

      return {
        success: errors.length === 0,
        teamsProcessed,
        errors,
        duration,
      };
    } catch (error) {
      const errorMsg = `Team sync failed for tournament ${tournamentId}: ${error.message}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);

      onProgress?.({
        phase: "error",
        current: 0,
        total: 0,
        message: errorMsg,
        errors,
      });

      return {
        success: false,
        teamsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync specific teams by their IDs
   */
  async syncSpecificTeams(
    teamIds: number[],
    tournamentId: number,
    onProgress?: (progress: TeamSyncProgress) => void,
  ): Promise<{
    success: boolean;
    teamsProcessed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let teamsProcessed = 0;

    try {
      this.logger.log(
        `Syncing ${teamIds.length} specific teams for tournament ${tournamentId}`,
      );

      for (let i = 0; i < teamIds.length; i++) {
        const teamId = teamIds[i];

        try {
          onProgress?.({
            phase: "fetching_stats",
            current: i + 1,
            total: teamIds.length,
            message: `Syncing team ${teamId}...`,
            errors: [],
          });

          // Create a minimal team list item for the sync
          const teamListItem: KorastatsTeamListItem = {
            _type: "TEAM",
            id: teamId,
            team: `Team ${teamId}`, // Will be updated with actual name from stats
          };

          await this.syncSingleTeam(teamListItem, tournamentId);
          teamsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to sync team ${teamId}: ${error.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      onProgress?.({
        phase: "completed",
        current: teamIds.length,
        total: teamIds.length,
        message: `Completed specific team sync. Processed ${teamsProcessed}/${teamIds.length} teams`,
        errors,
      });

      return {
        success: errors.length === 0,
        teamsProcessed,
        errors,
      };
    } catch (error) {
      const errorMsg = `Specific team sync failed: ${error.message}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);

      return {
        success: false,
        teamsProcessed,
        errors,
      };
    }
  }

  /**
   * Update team statistics for existing teams
   */
  async updateTeamStatistics(
    tournamentId: number,
    onProgress?: (progress: TeamSyncProgress) => void,
  ): Promise<{
    success: boolean;
    teamsUpdated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let teamsUpdated = 0;

    try {
      this.logger.log(`Updating team statistics for tournament ${tournamentId}`);

      // Get existing teams from database
      const existingTeams = await Models.Team.find({});

      if (!existingTeams?.length) {
        throw new Error(`No existing teams found for tournament ${tournamentId}`);
      }

      onProgress?.({
        phase: "fetching_stats",
        current: 0,
        total: existingTeams.length,
        message: "Updating team statistics...",
        errors: [],
      });

      for (let i = 0; i < existingTeams.length; i++) {
        const team = existingTeams[i];

        try {
          onProgress?.({
            phase: "fetching_stats",
            current: i + 1,
            total: existingTeams.length,
            currentTeam: team.name,
            message: `Updating statistics for ${team.name}...`,
            errors: [],
          });

          // Fetch updated stats
          const teamStatsResponse = await this.korastatsService.getTournamentTeamStats(
            tournamentId,
            team.korastats_id,
          );

          if (teamStatsResponse?.data) {
            const teamStats = teamStatsResponse.data;
            // Re-map with existing team info but new stats
            const teamListItem: KorastatsTeamListItem = {
              _type: "TEAM",
              id: team.korastats_id,
              team: team.name,
            };

            // Get team info if available
            let teamInfo: KorastatsTeamInfo | undefined;
            try {
              const teamInfoResponse = await this.korastatsService.getTeamInfo(
                team.korastats_id,
              );
              teamInfo = teamInfoResponse.data;
            } catch (error) {
              this.logger.warn(
                `Could not fetch team info for ${team.name}: ${error.message}`,
              );
            }

            const updatedTeamData = await this.teamMapper.mapToTeam(
              teamListItem,
              teamStats,
              teamInfo || ({} as KorastatsTeamInfo),
              tournamentId,
            );

            // Update in database
            await Models.Team.findOneAndUpdate(
              { korastats_id: updatedTeamData.korastats_id },
              updatedTeamData,
              { upsert: true, new: true },
            );
            teamsUpdated++;
          }
        } catch (error) {
          const errorMsg = `Failed to update team ${team.name}: ${error.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      onProgress?.({
        phase: "completed",
        current: existingTeams.length,
        total: existingTeams.length,
        message: `Updated statistics for ${teamsUpdated}/${existingTeams.length} teams`,
        errors,
      });

      return {
        success: errors.length === 0,
        teamsUpdated,
        errors,
      };
    } catch (error) {
      const errorMsg = `Team statistics update failed: ${error.message}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);

      return {
        success: false,
        teamsUpdated,
        errors,
      };
    }
  }

  /**
   * Sync missing teams (teams that exist in tournament but not in database)
   */
  async syncMissingTeams(
    tournamentId: number,
    onProgress?: (progress: TeamSyncProgress) => void,
  ): Promise<{
    success: boolean;
    missingTeams: number;
    teamsSynced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let teamsSynced = 0;

    try {
      this.logger.log(`Identifying missing teams for tournament ${tournamentId}`);

      // Get tournament teams from API
      const tournamentTeamListResponse =
        await this.korastatsService.getTournamentTeamList(tournamentId);
      const tournamentTeamList = tournamentTeamListResponse.data;

      if (!tournamentTeamList?.teams?.length) {
        throw new Error(`No teams found in tournament ${tournamentId}`);
      }

      // Get existing teams from database
      const existingTeams = await Models.Team.find({});
      const existingTeamIds = new Set(
        existingTeams?.map((team) => team.korastats_id) || [],
      );

      // Find missing teams
      const missingTeams = tournamentTeamList.teams.filter(
        (team) => !existingTeamIds.has(team.id),
      );

      if (missingTeams.length === 0) {
        this.logger.log(`No missing teams found for tournament ${tournamentId}`);
        return {
          success: true,
          missingTeams: 0,
          teamsSynced: 0,
          errors: [],
        };
      }

      this.logger.log(
        `Found ${missingTeams.length} missing teams for tournament ${tournamentId}`,
      );

      onProgress?.({
        phase: "fetching_stats",
        current: 0,
        total: missingTeams.length,
        message: `Syncing ${missingTeams.length} missing teams...`,
        errors: [],
      });

      // Sync missing teams
      for (let i = 0; i < missingTeams.length; i++) {
        const teamItem = missingTeams[i];

        try {
          onProgress?.({
            phase: "fetching_stats",
            current: i + 1,
            total: missingTeams.length,
            currentTeam: teamItem.team,
            message: `Syncing missing team ${teamItem.team}...`,
            errors: [],
          });

          await this.syncSingleTeam(teamItem, tournamentId);
          teamsSynced++;
        } catch (error) {
          const errorMsg = `Failed to sync missing team ${teamItem.team}: ${error.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      onProgress?.({
        phase: "completed",
        current: missingTeams.length,
        total: missingTeams.length,
        message: `Synced ${teamsSynced}/${missingTeams.length} missing teams`,
        errors,
      });

      return {
        success: errors.length === 0,
        missingTeams: missingTeams.length,
        teamsSynced,
        errors,
      };
    } catch (error) {
      const errorMsg = `Missing team sync failed: ${error.message}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);

      return {
        success: false,
        missingTeams: 0,
        teamsSynced,
        errors,
      };
    }
  }

  /**
   * Get current sync status for teams
   */
  async getTeamSyncStatus(tournamentId: number): Promise<{
    totalTeamsInTournament: number;
    teamsInDatabase: number;
    lastSyncDate: Date | null;
    missingTeams: number;
    recentErrors: string[];
  }> {
    try {
      // Get tournament teams count
      const tournamentTeamListResponse =
        await this.korastatsService.getTournamentTeamList(tournamentId);
      const tournamentTeamList = tournamentTeamListResponse.data;
      const totalTeamsInTournament = tournamentTeamList?.teams?.length || 0;

      // Get database teams count
      const existingTeams = await Models.Team.find({});
      const teamsInDatabase = existingTeams?.length || 0;

      // Get last sync date
      const lastSyncDate =
        existingTeams?.length > 0
          ? existingTeams.reduce(
              (latest, team) => (team.last_synced > latest ? team.last_synced : latest),
              existingTeams[0].last_synced,
            )
          : null;

      const missingTeams = Math.max(0, totalTeamsInTournament - teamsInDatabase);

      return {
        totalTeamsInTournament,
        teamsInDatabase,
        lastSyncDate,
        missingTeams,
        recentErrors: [], // Would be populated from error tracking system
      };
    } catch (error) {
      this.logger.error(`Failed to get team sync status: ${error.message}`);
      return {
        totalTeamsInTournament: 0,
        teamsInDatabase: 0,
        lastSyncDate: null,
        missingTeams: 0,
        recentErrors: [error.message],
      };
    }
  }

  /**
   * Clear all team data for a tournament
   */
  async clearTournamentTeams(tournamentId: number): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      this.logger.log(`Clearing all team data for tournament ${tournamentId}`);

      const deleteResult = await Models.Team.deleteMany({});
      const deletedCount = deleteResult.deletedCount || 0;

      this.logger.log(`Deleted ${deletedCount} teams for tournament ${tournamentId}`);

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      const errorMsg = `Failed to clear team data for tournament ${tournamentId}: ${error.message}`;
      this.logger.error(errorMsg);

      return {
        success: false,
        deletedCount: 0,
        error: errorMsg,
      };
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Sync a single team with all its data
   */
  private async syncSingleTeam(
    teamListItem: KorastatsTeamListItem,
    tournamentId: number,
    onProgress?: (progress: TeamSyncProgress) => void,
  ): Promise<void> {
    let currentTournament: KorastatsTournamentTeamStats | undefined;

    try {
      // Phase 1: Fetch team statistics
      onProgress?.({
        phase: "fetching_stats",
        current: 1,
        total: 4,
        message: `Fetching statistics for ${teamListItem.team}...`,
        errors: [],
      });

      const currentTournamentResponse =
        await this.korastatsService.getTournamentTeamStats(tournamentId, teamListItem.id);
      currentTournament = currentTournamentResponse.data;

      if (!currentTournament) {
        throw new Error(`No team statistics found for team ${teamListItem.id}`);
      }

      // Phase 2: Fetch team info (match history)
      onProgress?.({
        phase: "fetching_info",
        current: 2,
        total: 4,
        message: `Fetching team info for ${teamListItem.team}...`,
        errors: [],
      });

      let teamInfo: KorastatsTeamInfo | undefined;
      try {
        const teamInfoResponse = await this.korastatsService.getTeamInfo(teamListItem.id);
        teamInfo = teamInfoResponse.data;
      } catch (error) {
        this.logger.warn(
          `Could not fetch team info for ${teamListItem.team}: ${error.message}`,
        );
        // Continue without team info - mapper can handle this
      }

      // Phase 3: Map the data
      onProgress?.({
        phase: "mapping",
        current: 3,
        total: 4,
        message: `Mapping data for ${teamListItem.team}...`,
        errors: [],
      });

      const teamData = await this.teamMapper.mapToTeam(
        teamListItem,
        currentTournament,
        teamInfo || ({} as KorastatsTeamInfo),
        tournamentId,
      );

      // Phase 4: Store in database
      onProgress?.({
        phase: "storing",
        current: 4,
        total: 4,
        message: `Storing ${teamListItem.team} in database...`,
        errors: [],
      });

      await Models.Team.findOneAndUpdate(
        { korastats_id: teamData.korastats_id },
        teamData,
        { upsert: true, new: true },
      );

      this.logger.debug(
        `Successfully synced team: ${teamListItem.team} (ID: ${teamListItem.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync team ${teamListItem.team} (ID: ${teamListItem.id}): ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

