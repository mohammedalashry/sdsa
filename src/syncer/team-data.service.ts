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
import { TeamStats } from "@/legacy-types/teams.types";

interface MinimalTournament {
  id: number;
  name: string;
  logo: string;
  season: number;
  current: boolean;
}
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
      const tournamentTeamList = tournamentTeamListResponse?.data;

      if (!tournamentTeamList?.teams?.length) {
        throw new Error(`No teams found for tournament ${tournamentId}`);
      }

      const totalTeams = tournamentTeamList.teams.length;
      this.logger.log(`Found ${totalTeams} teams for tournament ${tournamentId}`);

      // Process teams in batches to avoid overwhelming the API
      const batchSize = 3;
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
              teamInfo = teamInfoResponse?.data;
            } catch (error) {
              this.logger.warn(
                `Could not fetch team info for ${team.name}: ${error.message}`,
              );
            }

            // Get tournament team players for lineup data
            let tournamentTeamPlayers: any;
            try {
              const tournamentTeamPlayersResponse =
                await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
              tournamentTeamPlayers = tournamentTeamPlayersResponse?.data;

              // Ensure we have a valid structure
              if (!tournamentTeamPlayers || !tournamentTeamPlayers.teams) {
                throw new Error("Invalid tournament team players response structure");
              }
            } catch (error) {
              this.logger.warn(
                `Could not fetch tournament team players for ${team.name}: ${error.message}`,
              );
              // Create a minimal fallback structure
              tournamentTeamPlayers = {
                teams: [
                  {
                    id: team.korastats_id,
                    players: [],
                  },
                ],
                season: new Date().getFullYear().toString(),
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
              };
            }

            const updatedTeamData = await this.teamMapper.mapToTeam(
              teamListItem,
              teamStats,
              teamInfo || ({} as KorastatsTeamInfo),
              tournamentId,
              tournamentTeamPlayers,
            );

            // Check if team already exists to merge tournament stats
            const existingTeam = await Models.Team.findOne({
              korastats_id: updatedTeamData.korastats_id,
            });

            if (existingTeam) {
              // Team exists - merge tournament stats instead of replacing
              await this.mergeTeamTournamentStats(existingTeam, updatedTeamData);
            } else {
              // New team - create normally
              await Models.Team.findOneAndUpdate(
                { korastats_id: updatedTeamData.korastats_id },
                updatedTeamData,
                { upsert: true, new: true },
              );
            }
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
      const tournamentTeamList = tournamentTeamListResponse?.data;

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
      const tournamentTeamList = tournamentTeamListResponse?.data;
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
   * Clear teams using flexible filters (mirrors match clear query)
   */
  async clearTeams(
    options: {
      beforeDate?: Date;
      afterDate?: Date;
      excludeIds?: number[];
      includeIds?: number[];
      tournamentId?: number;
    } = {},
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const query: any = {};

      if (options.beforeDate || options.afterDate) {
        query.created_at = {};
        if (options.beforeDate) query.created_at.$lt = options.beforeDate;
        if (options.afterDate) query.created_at.$gt = options.afterDate;
      }

      if (options.tournamentId) {
        query["tournament_stats.tournament_id"] = options.tournamentId;
      }

      if (options.excludeIds && options.excludeIds.length > 0) {
        query.korastats_id = { $nin: options.excludeIds };
      }
      if (options.includeIds && options.includeIds.length > 0) {
        query.korastats_id = { $in: options.includeIds };
      }

      this.logger.log(`Clearing Teams with query: ${JSON.stringify(query)}`);
      const deleteResult = await Models.Team.deleteMany(query);
      const deletedCount = deleteResult.deletedCount || 0;
      this.logger.log(`Deleted ${deletedCount} team records`);

      return { success: true, deletedCount };
    } catch (error) {
      const errorMsg = `Failed to clear team data: ${error.message}`;
      this.logger.error(errorMsg);
      return { success: false, deletedCount: 0, error: errorMsg };
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
    // Check if team already exists to merge tournament stats

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
      currentTournament = currentTournamentResponse?.data;

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
        teamInfo = teamInfoResponse?.data;
      } catch (error) {
        this.logger.warn(
          `Could not fetch team info for ${teamListItem.team}: ${error.message}`,
        );
        // Continue without team info - mapper can handle this
      }

      // Phase 3: Fetch tournament team players for lineup data
      onProgress?.({
        phase: "mapping",
        current: 3,
        total: 5,
        message: `Fetching team players for ${teamListItem.team}...`,
        errors: [],
      });

      let tournamentTeamPlayers: any;
      try {
        const tournamentTeamPlayersResponse =
          await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
        tournamentTeamPlayers = tournamentTeamPlayersResponse?.data;

        // Ensure we have a valid structure
        if (!tournamentTeamPlayers || !tournamentTeamPlayers.teams) {
          throw new Error("Invalid tournament team players response structure");
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch tournament team players for ${teamListItem.team}: ${error.message}`,
        );
        // Create a minimal fallback structure
        tournamentTeamPlayers = {
          teams: [
            {
              id: teamListItem.id,
              players: [],
            },
          ],
          season: new Date().getFullYear().toString(),
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        };
      }

      // Phase 4: Map the data
      onProgress?.({
        phase: "mapping",
        current: 4,
        total: 5,
        message: `Mapping data for ${teamListItem.team}...`,
        errors: [],
      });

      const teamData = await this.teamMapper.mapToTeam(
        teamListItem,
        currentTournament,
        teamInfo || ({} as KorastatsTeamInfo),
        tournamentId,
        tournamentTeamPlayers,
      );

      // Phase 5: Store in database
      onProgress?.({
        phase: "storing",
        current: 5,
        total: 5,
        message: `Storing ${teamListItem.team} in database...`,
        errors: [],
      });
      const existingTeam = await Models.Team.findOne({
        korastats_id: teamListItem.id,
      });
      if (existingTeam) {
        // Team exists - merge tournament stats instead of replacing
        await this.mergeTeamTournamentStats(existingTeam, teamData);
        await this.mergeTournamentsArray(existingTeam.tournaments, teamData.tournaments);
      } else {
        // New team - create normally
        await Models.Team.findOneAndUpdate(
          { korastats_id: teamData.korastats_id },
          teamData,
          { upsert: true, new: true },
        );
      }

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
   * Merge tournament stats for existing teams instead of replacing
   */
  private async mergeTeamTournamentStats(
    existingTeam: TeamInterface,
    newTeamData: TeamInterface,
  ): Promise<void> {
    try {
      // Get existing tournament stats
      const existingTournamentStats = existingTeam.tournament_stats || [];

      // Get new tournament stats from the mapper
      const newTournamentStats = newTeamData.tournament_stats || [];

      // Create a map of existing tournament stats by league ID + season for quick lookup
      const existingStatsMap = new Map();
      existingTournamentStats.forEach((stats: any) => {
        const leagueId = stats.league?.id;
        const season = stats.league?.season;
        if (leagueId && season) {
          const key = `${leagueId}-${season}`;
          existingStatsMap.set(key, stats);
        }
      });

      // Merge new tournament stats
      const mergedTournamentStats = [...existingTournamentStats];

      for (const newStats of newTournamentStats) {
        const leagueId = newStats.league?.id;
        const season = newStats.league?.season;

        if (leagueId && season) {
          // Map 1441 to 840 for consistency (as per user requirement)
          const key = `${leagueId}-${season}`;

          if (existingStatsMap.has(key)) {
            // Update existing tournament stats
            const existingIndex = mergedTournamentStats.findIndex(
              (stats) => stats.league?.id === leagueId && stats.league?.season === season,
            );
            if (existingIndex !== -1) {
              mergedTournamentStats[existingIndex] = {
                ...newStats,
                league: {
                  ...newStats.league,
                  id: leagueId, // Ensure we use the mapped ID
                },
              };
            }
          } else {
            // Add new tournament stats
            mergedTournamentStats.push(newStats);
          }
        }
      }

      // Update other fields that might have changed (but preserve existing data)
      const updateData = {
        // Update basic info if it has changed
        name: newTeamData.name || existingTeam.name,
        code: newTeamData.code || existingTeam.code,
        logo: newTeamData.logo || existingTeam.logo,
        founded: newTeamData.founded || existingTeam.founded,
        national:
          newTeamData.national !== undefined
            ? newTeamData.national
            : existingTeam.national,
        country: newTeamData.country || existingTeam.country,

        // Update metrics
        clubMarketValue: newTeamData.clubMarketValue || existingTeam.clubMarketValue,
        totalPlayers: newTeamData.totalPlayers || existingTeam.totalPlayers,
        foreignPlayers: newTeamData.foreignPlayers || existingTeam.foreignPlayers,
        averagePlayerAge: newTeamData.averagePlayerAge || existingTeam.averagePlayerAge,

        // Update venue info
        venue: newTeamData.venue || existingTeam.venue,

        // Update coaching staff
        coaches: newTeamData.coaches || existingTeam.coaches,

        // Use merged tournament stats
        tournament_stats: mergedTournamentStats,

        // Recalculate stats summary from merged tournament stats
        stats_summary:
          this.calculateStatsSummaryFromTournamentStats(mergedTournamentStats),

        // Update lineup
        lineup: newTeamData.lineup || existingTeam.lineup,

        // Update players
        players: newTeamData.players || existingTeam.players,

        // Update tournaments (merge with uniqueness by id + season)
        tournaments: this.mergeTournamentsArray(
          existingTeam.tournaments || [],
          newTeamData.tournaments || [],
        ),

        // Update sync tracking
        last_synced: new Date(),
        sync_version: (existingTeam.sync_version || 0) + 1,
        updated_at: new Date(),
      };

      await Models.Team.findOneAndUpdate(
        { korastats_id: existingTeam.korastats_id },
        updateData,
        { new: true },
      );

      this.logger.debug(
        `Merged tournament stats for team: ${existingTeam.name} (ID: ${existingTeam.korastats_id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to merge tournament stats for team ${existingTeam.name}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Merge tournaments array ensuring uniqueness by id + season
   */

  private mergeTournamentsArray(
    existingTournaments: MinimalTournament[],
    newTournaments: MinimalTournament[],
  ): MinimalTournament[] {
    // Create a map of existing tournaments by id + season for quick lookup
    const existingTournamentsMap = new Map<string, MinimalTournament>();
    existingTournaments.forEach((tournament) => {
      const id = tournament.id;
      const season = tournament.season;
      if (id && season) {
        const key = `${id}-${season}`;
        existingTournamentsMap.set(key, tournament);
      }
    });

    // Merge new tournaments
    const mergedTournaments = [...existingTournaments];

    for (const newTournament of newTournaments) {
      const id = newTournament.id;
      const season = newTournament.season;

      if (id && season) {
        const key = `${id}-${season}`;

        if (existingTournamentsMap.has(key)) {
          // Update existing tournament
          const existingIndex = mergedTournaments.findIndex(
            (tournament: any) => tournament.id === id && tournament.season === season,
          );
          if (existingIndex !== -1) {
            mergedTournaments[existingIndex] = newTournament;
          }
        } else {
          // Add new tournament
          mergedTournaments.push(newTournament);
        }
      }
    }

    return mergedTournaments;
  }

  /**
   * Calculate stats summary from tournament stats array
   */
  private calculateStatsSummaryFromTournamentStats(tournamentStats: any[]): any {
    let gamesPlayedHome = 0;
    let gamesPlayedAway = 0;
    let winsHome = 0;
    let winsAway = 0;
    let drawsHome = 0;
    let drawsAway = 0;
    let losesHome = 0;
    let losesAway = 0;
    let goalsForHome = 0;
    let goalsForAway = 0;
    let goalsAgainstHome = 0;
    let goalsAgainstAway = 0;
    let cleanSheetsTotal = 0;

    for (const ts of tournamentStats) {
      if (ts.fixtures) {
        gamesPlayedHome += ts.fixtures.played?.home || 0;
        gamesPlayedAway += ts.fixtures.played?.away || 0;
        winsHome += ts.fixtures.wins?.home || 0;
        winsAway += ts.fixtures.wins?.away || 0;
        drawsHome += ts.fixtures.draws?.home || 0;
        drawsAway += ts.fixtures.draws?.away || 0;
        losesHome += ts.fixtures.loses?.home || 0;
        losesAway += ts.fixtures.loses?.away || 0;
      }

      if (ts.goals) {
        goalsForHome += ts.goals.for_?.total?.home || 0;
        goalsForAway += ts.goals.for_?.total?.away || 0;
        goalsAgainstHome += ts.goals.against?.total?.home || 0;
        goalsAgainstAway += ts.goals.against?.total?.away || 0;
      }

      cleanSheetsTotal += ts.clean_sheet?.total || 0;
    }

    const goalDifference =
      goalsForHome + goalsForAway - (goalsAgainstHome + goalsAgainstAway);

    return {
      gamesPlayed: { home: gamesPlayedHome, away: gamesPlayedAway },
      wins: { home: winsHome, away: winsAway },
      draws: { home: drawsHome, away: drawsAway },
      loses: { home: losesHome, away: losesAway },
      goalsScored: { home: goalsForHome, away: goalsForAway },
      goalsConceded: { home: goalsAgainstHome, away: goalsAgainstAway },
      goalDifference,
      cleanSheetGames: cleanSheetsTotal,
    };
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

