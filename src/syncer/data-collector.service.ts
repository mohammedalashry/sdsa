// src/mappers/data-collector.service.ts
// Service that orchestrates multiple Korastats API calls based on Excel sheet strategy
// Each method collects all needed data from multiple endpoints before mapping

import { KorastatsDataCollectorMapper } from "../mappers/korastats-data-collector.mapper";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import {
  ITournament,
  IMatch,
  IPlayer,
  ITeam,
  IPlayerStats,
  ITeamStats,
  IMatchEvent,
  ISyncLog,
} from "../db/mogodb/schemas";
import { KorastatsMatchListItem } from "@/integrations/korastats/types/fixture.types";

export class DataCollectorService {
  private korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ============================================================================
  // FIXTURE DATA COLLECTION
  // ============================================================================

  /**
   * Collect and map fixture data for /fixtures endpoint
   * Based on Excel sheet: needs TournamentMatchList + MatchSummary + MatchSquad
   */
  async collectFixtureData(
    tournamentId: number,
    season: string,
    teamId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<IMatch[]> {
    try {
      console.log(`🔄 Collecting fixture data for tournament ${tournamentId}`);

      // 1. Get basic match list from TournamentMatchList
      const matchListResponse =
        await this.korastatsService.getTournamentMatchList(tournamentId);

      if (!matchListResponse.data || matchListResponse.data.length === 0) {
        console.warn(`⚠️ No matches found for tournament ${tournamentId}`);
        return [];
      }

      const matches: IMatch[] = [];

      // 2. For each match, collect additional data
      for (const matchData of matchListResponse.data) {
        try {
          // Get detailed data in parallel
          const [matchSummaryResponse, matchSquadResponse] = await Promise.all([
            this.korastatsService.getMatchSummary(matchData.matchId).catch(() => null),
            this.korastatsService.getMatchSquad(matchData.matchId).catch(() => null),
          ]);

          // 3. Map the complete data
          const mongoMatch = KorastatsDataCollectorMapper.mapFixtureData(
            matchData,
            matchSummaryResponse?.data,
            matchSquadResponse?.data,
          );

          // 4. Store in MongoDB
          const existingMatch = await Models.Match.findOne({
            korastats_id: matchData.matchId,
          });

          let match: IMatch;
          if (existingMatch) {
            match = (await Models.Match.findOneAndUpdate(
              { korastats_id: matchData.matchId },
              {
                ...mongoMatch,
                tournament_id: tournamentId,
                sync_version: existingMatch.sync_version + 1,
              },
              { new: true },
            )) as IMatch;
          } else {
            match = (await Models.Match.create({
              ...mongoMatch,
              tournament_id: tournamentId,
            })) as IMatch;
          }

          matches.push(match);

          // Add delay to respect API rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(
            `❌ Failed to collect data for match ${matchData.matchId}:`,
            error,
          );
        }
      }

      console.log(
        `✅ Collected ${matches.length} fixtures for tournament ${tournamentId}`,
      );
      return matches;
    } catch (error) {
      console.error(`❌ Failed to collect fixture data:`, error);
      throw error;
    }
  }

  /**
   * Collect and map detailed fixture data for /fixtures/{id} endpoint
   * Based on Excel sheet: needs all match-related endpoints
   */
  async collectDetailedFixtureData(matchId: number): Promise<{
    match: IMatch | null;
    events: IMatchEvent[];
    playerStats: IPlayerStats[];
  }> {
    try {
      console.log(`🔄 Collecting detailed fixture data for match ${matchId}`);

      // 1. Get basic match data (we need to find it first)
      const existingMatch = await Models.Match.findOne({ korastats_id: matchId });
      if (!existingMatch) {
        console.warn(`⚠️ Match ${matchId} not found in database`);
        return { match: null, events: [], playerStats: [] };
      }

      // 2. Collect all detailed data in parallel
      const [
        matchSummaryResponse,
        matchSquadResponse,
        matchTimelineResponse,
        matchPlayersStatsResponse,
      ] = await Promise.all([
        this.korastatsService.getMatchSummary(matchId).catch(() => null),
        this.korastatsService.getMatchSquad(matchId).catch(() => null),
        this.korastatsService.getMatchTimeline(matchId).catch(() => null),
        this.korastatsService.getMatchPlayersStats(matchId).catch(() => null),
      ]);

      // 3. Create a mock match list item for the mapper
      const matchListItem = {
        matchId: matchId,
        status: { id: 1, status: "Approved" },
        tournament: existingMatch.tournament_id.toString(),
        season: existingMatch.season,
        round: existingMatch.round,
        home: { id: existingMatch.teams.home.id, name: existingMatch.teams.home.name },
        away: { id: existingMatch.teams.away.id, name: existingMatch.teams.away.name },
        dateTime: existingMatch.date.toISOString(),
        dtLastUpdateDateTime: existingMatch.updated_at.toISOString(),
        stadium: { id: existingMatch.venue.id, name: existingMatch.venue.name },
        referee: {
          id: existingMatch.officials.referee.id,
          name: existingMatch.officials.referee.name,
          dob: null,
          nationality: { id: 0, name: existingMatch.officials.referee.nationality },
        },
        assistant1: existingMatch.officials.assistant1
          ? {
              id: existingMatch.officials.assistant1.id,
              name: existingMatch.officials.assistant1.name,
              dob: null,
              gender: "Unknown",
              nationality: {
                id: 0,
                name: existingMatch.officials.assistant1.nationality,
              },
            }
          : null,
        assistant2: existingMatch.officials.assistant2
          ? {
              id: existingMatch.officials.assistant2.id,
              name: existingMatch.officials.assistant2.name,
              dob: null,
              gender: "Unknown",
              nationality: {
                id: 0,
                name: existingMatch.officials.assistant2.nationality,
              },
            }
          : null,
        score: {
          home: existingMatch.teams.home.score,
          away: existingMatch.teams.away.score,
        },
      };

      // 4. Map the complete data
      const {
        match: mongoMatch,
        events,
        playerStats,
      } = KorastatsDataCollectorMapper.mapDetailedFixtureData(
        matchListItem as unknown as KorastatsMatchListItem,
        matchSummaryResponse?.data,
        matchSquadResponse?.data,
        matchTimelineResponse?.data,
        matchPlayersStatsResponse?.data,
      );

      // 5. Update the match in MongoDB
      const updatedMatch = (await Models.Match.findOneAndUpdate(
        { korastats_id: matchId },
        {
          ...mongoMatch,
          tournament_id: existingMatch.tournament_id,
          sync_version: existingMatch.sync_version + 1,
        },
        { new: true },
      )) as IMatch;

      // 6. Store events and player stats
      let storedEvents: IMatchEvent[] = [];
      let storedPlayerStats: IPlayerStats[] = [];

      if (events.length > 0) {
        // Replace existing events for this match
        await Models.MatchEvent.deleteMany({ match_id: matchId });
        storedEvents = (await Models.MatchEvent.insertMany(
          events.map((event) => ({
            ...event,
            tournament_id: existingMatch.tournament_id,
          })),
        )) as IMatchEvent[];
      }

      if (playerStats.length > 0) {
        // Replace existing player stats for this match
        await Models.PlayerStats.deleteMany({ match_id: matchId });
        storedPlayerStats = (await Models.PlayerStats.insertMany(
          playerStats.map((stat) => ({
            ...stat,
            tournament_id: existingMatch.tournament_id,
          })),
        )) as IPlayerStats[];
      }

      console.log(`✅ Collected detailed data for match ${matchId}:`, {
        events: storedEvents.length,
        playerStats: storedPlayerStats.length,
      });

      return {
        match: updatedMatch,
        events: storedEvents,
        playerStats: storedPlayerStats,
      };
    } catch (error) {
      console.error(`❌ Failed to collect detailed fixture data:`, error);
      throw error;
    }
  }

  // ============================================================================
  // TEAM DATA COLLECTION
  // ============================================================================

  /**
   * Collect and map team data for /teams endpoint
   * Based on Excel sheet: needs EntityClub + TournamentTeamList + TournamentTeamPlayerList
   */
  async collectTeamData(
    teamId: number,
    tournamentId?: number,
    season?: string,
  ): Promise<ITeam | null> {
    try {
      console.log(`🔄 Collecting team data for team ${teamId}`);

      // 1. Get basic team data from EntityClub
      const entityClubResponse = await this.korastatsService.getEntityClub(teamId);
      if (!entityClubResponse.data) {
        console.warn(`⚠️ No team data found for ID ${teamId}`);
        return null;
      }

      // 2. Get tournament-specific data if tournamentId and season provided
      let tournamentTeamData = null;
      let tournamentPlayerListData = null;

      if (tournamentId && season) {
        try {
          const [tournamentTeamListResponse, tournamentPlayerListResponse] =
            await Promise.all([
              this.korastatsService.getTournamentTeamList(tournamentId).catch(() => null),
              this.korastatsService
                .getTournamentTeamPlayerList(tournamentId)
                .catch(() => null),
            ]);

          // Find the specific team in the tournament data
          tournamentTeamData = tournamentTeamListResponse?.data?.teams?.find(
            (t) => t.id === teamId,
          );
          tournamentPlayerListData = tournamentPlayerListResponse?.data?.teams?.find(
            (t) => t.id === teamId,
          );
        } catch (error) {
          console.warn(`⚠️ Could not get tournament data for team ${teamId}:`, error);
        }
      }

      // 3. Map the complete data
      const mongoTeam = KorastatsDataCollectorMapper.mapTeamData(
        entityClubResponse.data,
        tournamentTeamData,
        tournamentPlayerListData,
      );

      // 4. Store in MongoDB
      const existingTeam = await Models.Team.findOne({ korastats_id: teamId });

      let team: ITeam;
      if (existingTeam) {
        team = (await Models.Team.findOneAndUpdate(
          { korastats_id: teamId },
          { ...mongoTeam, sync_version: existingTeam.sync_version + 1 },
          { new: true },
        )) as ITeam;
      } else {
        team = (await Models.Team.create(mongoTeam)) as ITeam;
      }

      console.log(`✅ Collected team data for team ${teamId}`);
      return team;
    } catch (error) {
      console.error(`❌ Failed to collect team data:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PLAYER DATA COLLECTION
  // ============================================================================

  /**
   * Collect and map player data for /players endpoint
   * Based on Excel sheet: needs EntityPlayer + TournamentPlayerStats
   */
  async collectPlayerData(
    playerId: number,
    tournamentId?: number,
    season?: string,
  ): Promise<IPlayer | null> {
    try {
      console.log(`🔄 Collecting player data for player ${playerId}`);

      // 1. Get basic player data from EntityPlayer
      const entityPlayerResponse = await this.korastatsService.getEntityPlayer(playerId);
      if (!entityPlayerResponse.data) {
        console.warn(`⚠️ No player data found for ID ${playerId}`);
        return null;
      }

      // 2. Get tournament-specific stats if tournamentId and season provided
      let tournamentPlayerStatsData = null;

      if (tournamentId && season) {
        try {
          const tournamentPlayerStatsResponse =
            await this.korastatsService.getTournamentPlayerStats(tournamentId, playerId);
          tournamentPlayerStatsData = tournamentPlayerStatsResponse?.data?.find(
            (p) => p.id === playerId,
          );
        } catch (error) {
          console.warn(
            `⚠️ Could not get tournament stats for player ${playerId}:`,
            error,
          );
        }
      }

      // 3. Map the complete data
      const mongoPlayer = KorastatsDataCollectorMapper.mapPlayerData(
        entityPlayerResponse.data,
        tournamentPlayerStatsData,
      );

      // 4. Store in MongoDB
      const existingPlayer = await Models.Player.findOne({ korastats_id: playerId });

      let player: IPlayer;
      if (existingPlayer) {
        player = (await Models.Player.findOneAndUpdate(
          { korastats_id: playerId },
          { ...mongoPlayer, sync_version: existingPlayer.sync_version + 1 },
          { new: true },
        )) as IPlayer;
      } else {
        player = (await Models.Player.create(mongoPlayer)) as IPlayer;
      }

      console.log(`✅ Collected player data for player ${playerId}`);
      return player;
    } catch (error) {
      console.error(`❌ Failed to collect player data:`, error);
      throw error;
    }
  }

  // ============================================================================
  // BULK COLLECTION OPERATIONS
  // ============================================================================

  /**
   * Collect complete tournament data
   * Orchestrates collection of all related data for a tournament
   */
  async collectTournamentCompleteData(
    tournamentId: number,
    season: string,
  ): Promise<{
    matches: IMatch[];
    teams: ITeam[];
    players: IPlayer[];
  }> {
    const syncLog = await Models.SyncLog.create({
      sync_type: "full",
      sync_status: "running",
      tournament_id: tournamentId,
      started_at: new Date(),
      records_processed: 0,
      records_updated: 0,
      records_created: 0,
      records_failed: 0,
      errors: [],
    });

    try {
      console.log(`🚀 Starting complete data collection for tournament ${tournamentId}`);

      // 1. Collect all matches
      const matches = await this.collectFixtureData(tournamentId, season);
      syncLog.records_processed += matches.length;
      syncLog.records_created += matches.length;

      // 2. Extract unique team IDs
      const teamIds = new Set<number>();
      matches.forEach((match) => {
        teamIds.add(match.teams.home.id);
        teamIds.add(match.teams.away.id);
      });

      // 3. Collect team data
      const teams: ITeam[] = [];
      for (const teamId of teamIds) {
        try {
          const team = await this.collectTeamData(teamId, tournamentId, season);
          if (team) {
            teams.push(team);
            syncLog.records_processed += 1;
            syncLog.records_created += 1;
          }
        } catch (error) {
          console.error(`❌ Failed to collect team ${teamId}:`, error);
          syncLog.records_failed += 1;
        }
      }

      // 4. Extract unique player IDs from team squads
      const playerIds = new Set<number>();
      teams.forEach((team) => {
        if (team.current_squad) {
          team.current_squad.forEach((squadPlayer) => {
            playerIds.add(squadPlayer.player_id);
          });
        }
      });

      // 5. Collect player data
      const players: IPlayer[] = [];
      for (const playerId of playerIds) {
        try {
          const player = await this.collectPlayerData(playerId, tournamentId, season);
          if (player) {
            players.push(player);
            syncLog.records_processed += 1;
            syncLog.records_created += 1;
          }
        } catch (error) {
          console.error(`❌ Failed to collect player ${playerId}:`, error);
          syncLog.records_failed += 1;
        }
      }

      // Update sync log
      await Models.SyncLog.findByIdAndUpdate(syncLog._id, {
        sync_status: "completed",
        completed_at: new Date(),
        duration_ms: Date.now() - syncLog.started_at.getTime(),
        records_processed: syncLog.records_processed,
        records_created: syncLog.records_created,
        records_failed: syncLog.records_failed,
      });

      console.log(
        `✅ Complete data collection finished for tournament ${tournamentId}:`,
        {
          matches: matches.length,
          teams: teams.length,
          players: players.length,
        },
      );

      return { matches, teams, players };
    } catch (error) {
      // Update sync log with error
      await Models.SyncLog.findByIdAndUpdate(syncLog._id, {
        sync_status: "failed",
        completed_at: new Date(),
        duration_ms: Date.now() - syncLog.started_at.getTime(),
        errors: [
          ...[],
          {
            endpoint: `TournamentComplete-${tournamentId}`,
            error_message: error.message,
            timestamp: new Date(),
          },
        ],
      });

      console.error(
        `❌ Complete data collection failed for tournament ${tournamentId}:`,
        error,
      );
      throw error;
    }
  }
}

