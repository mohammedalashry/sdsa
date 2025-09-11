// src/mappers/mapper.service.ts
// Service to orchestrate Korastats to MongoDB mapping operations

import { KorastatsToMongoMapper } from "./korastats-to-mongo.mapper";
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

export class MapperService {
  private korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ============================================================================
  // TOURNAMENT MAPPING
  // ============================================================================

  /**
   * Map and store tournament data from Korastats
   */
  async mapAndStoreTournament(
    tournamentId: number,
    season: string,
  ): Promise<ITournament | null> {
    try {
      console.log(`🔄 Mapping tournament ${tournamentId} for season ${season}`);

      // Get tournament data from Korastats
      const korastatsTournament =
        await this.korastatsService.getTournamentStructure(tournamentId);

      if (!korastatsTournament.data) {
        console.warn(`⚠️ No tournament data found for ID ${tournamentId}`);
        return null;
      }

      // Map to MongoDB schema
      const mongoTournament = KorastatsToMongoMapper.mapTournament(
        korastatsTournament.data,
        season,
      );

      // Store in MongoDB
      const existingTournament = await Models.Tournament.findOne({
        korastats_id: tournamentId,
        season,
      });

      let tournament: ITournament;
      if (existingTournament) {
        // Update existing tournament
        tournament = (await Models.Tournament.findOneAndUpdate(
          { korastats_id: tournamentId, season },
          { ...mongoTournament, sync_version: existingTournament.sync_version + 1 },
          { new: true },
        )) as ITournament;
        console.log(`✅ Updated tournament ${tournamentId}`);
      } else {
        // Create new tournament
        tournament = (await Models.Tournament.create(mongoTournament)) as ITournament;
        console.log(`✅ Created tournament ${tournamentId}`);
      }

      return tournament;
    } catch (error) {
      console.error(`❌ Failed to map tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // MATCH MAPPING
  // ============================================================================

  /**
   * Map and store match data from Korastats
   */
  async mapAndStoreMatch(
    matchId: number,
    tournamentId: number,
    season: string,
  ): Promise<IMatch | null> {
    try {
      console.log(`🔄 Mapping match ${matchId}`);

      // Get match data from Korastats
      const [matchListResponse, matchSummaryResponse] = await Promise.all([
        this.korastatsService.getTournamentMatchList(tournamentId),
        this.korastatsService.getMatchSummary(matchId),
      ]);

      // Find the specific match in the list
      const korastatsMatch = matchListResponse.data?.find(
        (match) => match.matchId === matchId,
      );

      if (!korastatsMatch) {
        console.warn(`⚠️ Match ${matchId} not found in tournament ${tournamentId}`);
        return null;
      }

      // Map to MongoDB schema
      let mongoMatch = KorastatsToMongoMapper.mapMatch(
        korastatsMatch,
        tournamentId,
        season,
      );

      // Update with detailed data if available
      if (matchSummaryResponse.data) {
        mongoMatch = KorastatsToMongoMapper.updateMatchWithSummary(
          mongoMatch,
          matchSummaryResponse.data,
        );
      }

      // Store in MongoDB
      const existingMatch = await Models.Match.findOne({ korastats_id: matchId });

      let match: IMatch;
      if (existingMatch) {
        // Update existing match
        match = (await Models.Match.findOneAndUpdate(
          { korastats_id: matchId },
          { ...mongoMatch, sync_version: existingMatch.sync_version + 1 },
          { new: true },
        )) as IMatch;
        console.log(`✅ Updated match ${matchId}`);
      } else {
        // Create new match
        match = (await Models.Match.create(mongoMatch)) as IMatch;
        console.log(`✅ Created match ${matchId}`);
      }

      return match;
    } catch (error) {
      console.error(`❌ Failed to map match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Map and store multiple matches for a tournament
   */
  async mapAndStoreTournamentMatches(
    tournamentId: number,
    season: string,
    teamId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<IMatch[]> {
    try {
      console.log(`🔄 Mapping matches for tournament ${tournamentId}`);

      // Get match list from Korastats
      const matchListResponse = await this.korastatsService.getTournamentMatchList(
        tournamentId,
        season,
        teamId,
        dateFrom,
        dateTo,
      );

      if (!matchListResponse.data || matchListResponse.data.length === 0) {
        console.warn(`⚠️ No matches found for tournament ${tournamentId}`);
        return [];
      }

      const matches: IMatch[] = [];

      // Process matches in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < matchListResponse.data.length; i += batchSize) {
        const batch = matchListResponse.data.slice(i, i + batchSize);

        const batchPromises = batch.map(async (korastatsMatch) => {
          try {
            // Map to MongoDB schema
            const mongoMatch = KorastatsToMongoMapper.mapMatch(
              korastatsMatch,
              tournamentId,
              season,
            );

            // Store in MongoDB
            const existingMatch = await Models.Match.findOne({
              korastats_id: korastatsMatch.matchId,
            });

            if (existingMatch) {
              return (await Models.Match.findOneAndUpdate(
                { korastats_id: korastatsMatch.matchId },
                { ...mongoMatch, sync_version: existingMatch.sync_version + 1 },
                { new: true },
              )) as IMatch;
            } else {
              return (await Models.Match.create(mongoMatch)) as IMatch;
            }
          } catch (error) {
            console.error(`❌ Failed to process match ${korastatsMatch.matchId}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        matches.push(...(batchResults.filter((match) => match !== null) as IMatch[]));

        // Add delay between batches to respect API rate limits
        if (i + batchSize < matchListResponse.data.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Mapped ${matches.length} matches for tournament ${tournamentId}`);
      return matches;
    } catch (error) {
      console.error(`❌ Failed to map tournament matches:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PLAYER MAPPING
  // ============================================================================

  /**
   * Map and store player data from Korastats
   */
  async mapAndStorePlayer(playerId: number): Promise<IPlayer | null> {
    try {
      console.log(`🔄 Mapping player ${playerId}`);

      // Get player data from Korastats
      const korastatsPlayer = await this.korastatsService.getEntityPlayer(playerId);

      if (!korastatsPlayer.data) {
        console.warn(`⚠️ No player data found for ID ${playerId}`);
        return null;
      }

      // Map to MongoDB schema
      const mongoPlayer = KorastatsToMongoMapper.mapPlayer(korastatsPlayer.data);

      // Store in MongoDB
      const existingPlayer = await Models.Player.findOne({ korastats_id: playerId });

      let player: IPlayer;
      if (existingPlayer) {
        // Update existing player
        player = (await Models.Player.findOneAndUpdate(
          { korastats_id: playerId },
          { ...mongoPlayer, sync_version: existingPlayer.sync_version + 1 },
          { new: true },
        )) as IPlayer;
        console.log(`✅ Updated player ${playerId}`);
      } else {
        // Create new player
        player = (await Models.Player.create(mongoPlayer)) as IPlayer;
        console.log(`✅ Created player ${playerId}`);
      }

      return player;
    } catch (error) {
      console.error(`❌ Failed to map player ${playerId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // TEAM MAPPING
  // ============================================================================

  /**
   * Map and store team data from Korastats
   */
  async mapAndStoreTeam(teamId: number): Promise<ITeam | null> {
    try {
      console.log(`🔄 Mapping team ${teamId}`);

      // Get team data from Korastats
      const korastatsTeam = await this.korastatsService.getEntityClub(teamId);

      if (!korastatsTeam.data) {
        console.warn(`⚠️ No team data found for ID ${teamId}`);
        return null;
      }

      // Map to MongoDB schema
      const mongoTeam = KorastatsToMongoMapper.mapTeam(korastatsTeam.data);

      // Store in MongoDB
      const existingTeam = await Models.Team.findOne({ korastats_id: teamId });

      let team: ITeam;
      if (existingTeam) {
        // Update existing team
        team = (await Models.Team.findOneAndUpdate(
          { korastats_id: teamId },
          { ...mongoTeam, sync_version: existingTeam.sync_version + 1 },
          { new: true },
        )) as ITeam;
        console.log(`✅ Updated team ${teamId}`);
      } else {
        // Create new team
        team = (await Models.Team.create(mongoTeam)) as ITeam;
        console.log(`✅ Created team ${teamId}`);
      }

      return team;
    } catch (error) {
      console.error(`❌ Failed to map team ${teamId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // MATCH DETAILS MAPPING
  // ============================================================================

  /**
   * Map and store detailed match data (events, stats, etc.)
   */
  async mapAndStoreMatchDetails(matchId: number): Promise<{
    events: IMatchEvent[];
    playerStats: IPlayerStats[];
    teamStats: ITeamStats[];
  }> {
    try {
      console.log(`🔄 Mapping detailed data for match ${matchId}`);

      // Get detailed match data from Korastats
      const [timelineResponse, playersStatsResponse, teamStatsResponse] =
        await Promise.all([
          this.korastatsService.getMatchTimeline(matchId),
          this.korastatsService.getMatchPlayersStats(matchId),
          this.korastatsService.getMatchTeamStats(matchId),
        ]);

      // Get match info for context
      const match = await Models.Match.findOne({ korastats_id: matchId });
      if (!match) {
        throw new Error(`Match ${matchId} not found in database`);
      }

      const results = {
        events: [] as IMatchEvent[],
        playerStats: [] as IPlayerStats[],
        teamStats: [] as ITeamStats[],
      };

      // Map and store events
      if (timelineResponse.data) {
        const mongoEvents = KorastatsToMongoMapper.mapMatchEvents(
          timelineResponse.data,
          matchId,
          match.tournament_id,
        );

        // Store events (replace existing ones for this match)
        await Models.MatchEvent.deleteMany({ match_id: matchId });
        if (mongoEvents.length > 0) {
          results.events = (await Models.MatchEvent.insertMany(
            mongoEvents,
          )) as IMatchEvent[];
        }
      }

      // Map and store player stats
      if (playersStatsResponse.data) {
        const mongoPlayerStats = KorastatsToMongoMapper.mapPlayerStats(
          playersStatsResponse.data,
          matchId,
          match.tournament_id,
          match.season,
          match.date,
          match.teams.home.id,
          match.teams.away.id,
        );

        // Store player stats (replace existing ones for this match)
        await Models.PlayerStats.deleteMany({ match_id: matchId });
        if (mongoPlayerStats.length > 0) {
          results.playerStats = (await Models.PlayerStats.insertMany(
            mongoPlayerStats,
          )) as IPlayerStats[];
        }
      }

      // Map and store team stats
      if (teamStatsResponse.data) {
        const mongoTeamStats = KorastatsToMongoMapper.mapTeamStats(
          teamStatsResponse.data,
          matchId,
          match.tournament_id,
          match.season,
          match.date,
          match.teams.home.id,
          match.teams.away.id,
        );

        // Store team stats (replace existing ones for this match)
        await Models.TeamStats.deleteMany({ match_id: matchId });
        if (mongoTeamStats.length > 0) {
          results.teamStats = (await Models.TeamStats.insertMany(
            mongoTeamStats,
          )) as ITeamStats[];
        }
      }

      console.log(`✅ Mapped detailed data for match ${matchId}:`, {
        events: results.events.length,
        playerStats: results.playerStats.length,
        teamStats: results.teamStats.length,
      });

      return results;
    } catch (error) {
      console.error(`❌ Failed to map match details for ${matchId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Map and store all data for a tournament
   */
  async mapAndStoreTournamentComplete(
    tournamentId: number,
    season: string,
  ): Promise<{
    tournament: ITournament | null;
    matches: IMatch[];
    teams: ITeam[];
    players: IPlayer[];
  }> {
    const syncLog = await Models.SyncLog.create(
      KorastatsToMongoMapper.createSyncLog("full", { tournament_id: tournamentId }),
    );

    try {
      console.log(`🚀 Starting complete mapping for tournament ${tournamentId}`);

      // 1. Map tournament
      const tournament = await this.mapAndStoreTournament(tournamentId, season);
      syncLog.records_processed += 1;
      syncLog.records_created += tournament ? 1 : 0;

      // 2. Map matches
      const matches = await this.mapAndStoreTournamentMatches(tournamentId, season);
      syncLog.records_processed += matches.length;
      syncLog.records_created += matches.length;

      // 3. Extract unique team and player IDs
      const teamIds = new Set<number>();
      const playerIds = new Set<number>();

      matches.forEach((match) => {
        teamIds.add(match.teams.home.id);
        teamIds.add(match.teams.away.id);
      });

      // 4. Map teams
      const teams: ITeam[] = [];
      for (const teamId of teamIds) {
        try {
          const team = await this.mapAndStoreTeam(teamId);
          if (team) {
            teams.push(team);
            syncLog.records_processed += 1;
            syncLog.records_created += 1;
          }
        } catch (error) {
          console.error(`❌ Failed to map team ${teamId}:`, error);
          syncLog.records_failed += 1;
        }
      }

      // 5. Map players (from team squads)
      const players: IPlayer[] = [];
      for (const team of teams) {
        if (team.current_squad) {
          for (const squadPlayer of team.current_squad) {
            if (!playerIds.has(squadPlayer.player_id)) {
              playerIds.add(squadPlayer.player_id);
              try {
                const player = await this.mapAndStorePlayer(squadPlayer.player_id);
                if (player) {
                  players.push(player);
                  syncLog.records_processed += 1;
                  syncLog.records_created += 1;
                }
              } catch (error) {
                console.error(`❌ Failed to map player ${squadPlayer.player_id}:`, error);
                syncLog.records_failed += 1;
              }
            }
          }
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

      console.log(`✅ Complete mapping finished for tournament ${tournamentId}:`, {
        tournament: !!tournament,
        matches: matches.length,
        teams: teams.length,
        players: players.length,
      });

      return { tournament, matches, teams, players };
    } catch (error) {
      // Update sync log with error
      await Models.SyncLog.findByIdAndUpdate(syncLog._id, {
        sync_status: "failed",
        completed_at: new Date(),
        duration_ms: Date.now() - syncLog.started_at.getTime(),
        errors: [
          ...(syncLog.errors || []),
          {
            endpoint: `TournamentComplete-${tournamentId}`,
            error_message: error.message,
            timestamp: new Date(),
          },
        ],
      });

      console.error(`❌ Complete mapping failed for tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}

