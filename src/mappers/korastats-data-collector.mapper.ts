// src/mappers/korastats-data-collector.mapper.ts
// Mapper that follows Excel sheet mapping strategy
// Each mapper method takes inputs based on "Korastats" column and uses "How to obtain?" logic

import {
  KorastatsMatchListResponse,
  KorastatsMatchSquadResponse,
  KorastatsMatchTimelineResponse,
  KorastatsMatchSummaryResponse,
  KorastatsMatchFormationResponse,
  KorastatsMatchPlayersStatsResponse,
  KorastatsEntityPlayer,
  KorastatsEntityClub,
  KorastatsTournamentTeamListResponse,
  KorastatsTournamentTeamStatsResponse,
  KorastatsTournamentCoachListResponse,
  KorastatsTournamentRefereeListResponse,
  KorastatsEntityCountriesResponse,
  KorastatsTournament,
  KorastatsSeasonListResponse,
  KorastatsStandingsResponse,
} from "../integrations/korastats/types";

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

export class KorastatsDataCollectorMapper {
  // ============================================================================
  // FIXTURE MAPPING (Based on Excel Sheet)
  // ============================================================================

  /**
   * Map fixture data for /fixtures endpoint
   * Inputs based on Excel "Korastats" column:
   * - TournamentMatchList (basic match data)
   * - MatchSummary (detailed stats, scores)
   * - MatchSquad (lineups, formations)
   */
  static mapFixtureData(
    matchListData: KorastatsMatchListResponse["data"][0],
    matchSummaryData?: KorastatsMatchSummaryResponse["data"],
    matchSquadData?: KorastatsMatchSquadResponse["data"],
  ): Partial<IMatch> {
    const match = matchListData;

    // Basic match data from TournamentMatchList
    let mongoMatch: Partial<IMatch> = {
      korastats_id: match.matchId,
      tournament_id: 0, // Will be set by caller
      season: match.season,
      round: match.round,
      date: new Date(match.dateTime),
      status: {
        id: match.status.id,
        name: match.status.status,
        short: this.mapStatusToShort(match.status.status),
      },
      teams: {
        home: {
          id: match.home.id,
          name: match.home.name,
          score: 0, // Will be updated from MatchSummary
          formation: undefined, // Will be updated from MatchSquad
        },
        away: {
          id: match.away.id,
          name: match.away.name,
          score: 0, // Will be updated from MatchSummary
          formation: undefined, // Will be updated from MatchSquad
        },
      },
      venue: {
        id: match.stadium.id,
        name: match.stadium.name,
        city: undefined,
        country: undefined,
      },
      officials: {
        referee: {
          id: match.referee.id,
          name: match.referee.name,
          nationality: match.referee.nationality.name,
        },
        assistant1: match.assistant1
          ? {
              id: match.assistant1.id,
              name: match.assistant1.name,
              nationality: match.assistant1.nationality.name,
            }
          : undefined,
        assistant2: match.assistant2
          ? {
              id: match.assistant2.id,
              name: match.assistant2.name,
              nationality: match.assistant2.nationality.name,
            }
          : undefined,
      },
      phases: {
        first_half: {
          start: undefined,
          end: undefined,
          score: { home: 0, away: 0 },
        },
        second_half: {
          start: undefined,
          end: undefined,
          score: { home: 0, away: 0 },
        },
        extra_time: undefined,
        penalties: undefined,
      },
      quick_stats: {
        total_goals: 0,
        total_cards: 0,
        possession: { home: 50, away: 50 },
      },
      data_available: {
        events: false,
        stats: false,
        formations: false,
        player_stats: false,
        video: false,
      },
      last_synced: new Date(),
      sync_version: 1,
    };

    // Update with MatchSummary data if available
    if (matchSummaryData) {
      mongoMatch = this.updateMatchWithSummary(mongoMatch, matchSummaryData);
    }

    // Update with MatchSquad data if available
    if (matchSquadData) {
      mongoMatch = this.updateMatchWithSquad(mongoMatch, matchSquadData);
    }

    return mongoMatch;
  }

  /**
   * Map detailed fixture data for /fixtures/{id} endpoint
   * Inputs based on Excel "Korastats" column:
   * - TournamentMatchList (basic match data)
   * - MatchSummary (detailed stats, scores)
   * - MatchSquad (lineups, formations)
   * - MatchTimeline (events, timeline)
   * - MatchPlayersStats (individual player stats)
   */
  static mapDetailedFixtureData(
    matchListData: KorastatsMatchListResponse["data"][0],
    matchSummaryData: KorastatsMatchSummaryResponse["data"],
    matchSquadData: KorastatsMatchSquadResponse["data"],
    matchTimelineData?: KorastatsMatchTimelineResponse["data"],
    matchPlayersStatsData?: KorastatsMatchPlayersStatsResponse["data"],
  ): {
    match: Partial<IMatch>;
    events: Partial<IMatchEvent>[];
    playerStats: Partial<IPlayerStats>[];
  } {
    // Get basic fixture data
    const match = this.mapFixtureData(matchListData, matchSummaryData, matchSquadData);

    // Map events from MatchTimeline
    const events: Partial<IMatchEvent>[] = [];
    if (matchTimelineData && Array.isArray(matchTimelineData)) {
      matchTimelineData.forEach((event) => {
        events.push({
          match_id: matchListData.matchId,
          tournament_id: 0, // Will be set by caller
          event_type: event.type,
          event_subtype: event.subtype,
          minute: event.minute,
          second: event.second,
          half: event.half,
          team: {
            id: event.team?.id || 0,
            name: event.team?.name || "Unknown",
          },
          player: event.player
            ? {
                id: event.player.id,
                name: event.player.name,
                jersey_number: event.player.jersey_number,
              }
            : undefined,
          assist_player: event.assist_player
            ? {
                id: event.assist_player.id,
                name: event.assist_player.name,
              }
            : undefined,
          description: event.description,
          location: event.location
            ? {
                x: event.location.x,
                y: event.location.y,
              }
            : undefined,
          video_url: event.video_url,
          image_url: event.image_url,
          last_synced: new Date(),
          sync_version: 1,
        });
      });
    }

    // Map player stats from MatchPlayersStats
    const playerStats: Partial<IPlayerStats>[] = [];
    if (matchPlayersStatsData && Array.isArray(matchPlayersStatsData)) {
      matchPlayersStatsData.forEach((playerStat) => {
        playerStats.push({
          player_id: playerStat.id,
          match_id: matchListData.matchId,
          tournament_id: 0, // Will be set by caller
          team_id: playerStat.team?.id || 0,
          season: matchListData.season,
          match_date: new Date(matchListData.dateTime),
          opponent_team_id: 0, // Will be calculated by caller
          is_home: (playerStat.team?.id || 0) === matchListData.home.id,
          performance: {
            minutes_played: playerStat.stats?.Admin?.MinutesPlayed || 0,
            position_played: playerStat.position?.name || "Unknown",
            rating: undefined, // Not available in Korastats
            goals: playerStat.stats?.GoalsScored?.Total || 0,
            assists: playerStat.stats?.Chances?.Assists || 0,
            shots: {
              total: playerStat.stats?.Attempts?.Total || 0,
              on_target: playerStat.stats?.Attempts?.Success || 0,
              off_target: playerStat.stats?.Attempts?.OffTarget || 0,
              blocked: playerStat.stats?.Attempts?.Blocked || 0,
            },
            passes: {
              total: playerStat.stats?.Pass?.Total || 0,
              accurate: playerStat.stats?.Pass?.Success || 0,
              accuracy_percentage: playerStat.stats?.Pass?.Accuracy || 0,
              key_passes: playerStat.stats?.Chances?.KeyPasses || 0,
            },
            defensive: {
              tackles: {
                attempted: 0, // Not directly available in Korastats
                successful: playerStat.stats?.BallWon?.TackleWon || 0,
              },
              interceptions: playerStat.stats?.BallWon?.InterceptionWon || 0,
              clearances: playerStat.stats?.Defensive?.Clear || 0,
              blocks: playerStat.stats?.Defensive?.Blocks || 0,
            },
            cards: {
              yellow: playerStat.stats?.Cards?.Yellow || 0,
              red: playerStat.stats?.Cards?.Red || 0,
            },
            xG: playerStat.stats?.GoalsScored?.XG,
            xA: undefined, // Not available in Korastats
            distance_covered: undefined, // Not available in Korastats
          },
          goalkeeper_stats: playerStat.position?.name
            ?.toLowerCase()
            .includes("goalkeeper")
            ? {
                saves: playerStat.stats?.GK?.Attempts?.Saved || 0,
                goals_conceded: playerStat.stats?.GK?.GoalConceded || 0,
                clean_sheet: playerStat.stats?.Defensive?.Cleansheet || false,
                penalties_saved: playerStat.stats?.GK?.Penalty?.Saved || 0,
              }
            : undefined,
          last_synced: new Date(),
          sync_version: 1,
        });
      });
    }

    return { match, events, playerStats };
  }

  // ============================================================================
  // TEAM MAPPING (Based on Excel Sheet)
  // ============================================================================

  /**
   * Map team data for /teams endpoint
   * Inputs based on Excel "Korastats" column:
   * - EntityClub (basic team info)
   * - TournamentTeamList (team in tournament context)
   * - TournamentTeamPlayerList (squad data)
   */
  static mapTeamData(
    entityClubData: KorastatsEntityClub,
    tournamentTeamData?: any, // Will be typed properly when we have the exact structure
    tournamentPlayerListData?: any, // Will be typed properly when we have the exact structure
  ): Partial<ITeam> {
    const team = entityClubData.teams?.[0]; // Get first team from club

    return {
      korastats_id: team?.id || entityClubData.id,
      name: team?.name || entityClubData.name,
      short_name: undefined, // Not available in Korastats
      nickname: undefined, // Not available in Korastats
      country: {
        id: entityClubData.country?.id || 0,
        name: entityClubData.country?.name || "Unknown",
      },
      city: undefined, // Not available in Korastats
      club: {
        id: entityClubData.id,
        name: entityClubData.name,
        logo_url: entityClubData.logo,
        founded_year: undefined, // Not available in Korastats
        is_national_team: entityClubData.national_federation || false,
      },
      stadium: team?.stadium
        ? {
            id: team.stadium.id,
            name: team.stadium.name,
            capacity: undefined, // Not available in Korastats
            surface: undefined, // Not available in Korastats
            city: undefined, // Not available in Korastats
          }
        : undefined,
      current_squad: tournamentPlayerListData?.players?.map((player) => ({
        player_id: player.id,
        player_name: player.name,
        jersey_number: player.number,
        position: player.position.primay.name,
        joined_date: undefined, // Not available in Korastats
      })),
      current_coach: team?.coach
        ? {
            id: team.coach.id,
            name: team.coach.name,
            nationality: undefined, // Not available in Korastats
            appointed_date: undefined, // Not available in Korastats
          }
        : undefined,
      stats_summary: tournamentTeamData?.stats
        ? {
            total_matches: tournamentTeamData.stats.Played || 0,
            total_wins: tournamentTeamData.stats.Win || 0,
            total_draws: tournamentTeamData.stats.Draw || 0,
            total_losses: tournamentTeamData.stats.Loss || 0,
            total_goals_for: tournamentTeamData.stats["Goals For"] || 0,
            total_goals_against: tournamentTeamData.stats["Goals Against"] || 0,
          }
        : {
            total_matches: 0,
            total_wins: 0,
            total_draws: 0,
            total_losses: 0,
            total_goals_for: 0,
            total_goals_against: 0,
          },
      status: "active",
      last_synced: new Date(),
      sync_version: 1,
    };
  }

  // ============================================================================
  // PLAYER MAPPING (Based on Excel Sheet)
  // ============================================================================

  /**
   * Map player data for /players endpoint
   * Inputs based on Excel "Korastats" column:
   * - EntityPlayer (basic player info)
   * - TournamentPlayerStats (player stats in tournament)
   */
  static mapPlayerData(
    entityPlayerData: KorastatsEntityPlayer,
    tournamentPlayerStatsData?: any, // Will be typed properly when we have the exact structure
  ): Partial<IPlayer> {
    return {
      korastats_id: entityPlayerData.id,
      name: entityPlayerData.fullname,
      nickname: entityPlayerData.nickname || entityPlayerData.fullname,
      date_of_birth: new Date(entityPlayerData.dob),
      age: parseInt(entityPlayerData.age) || 0,
      nationality: {
        id: entityPlayerData.nationality?.id || 0,
        name: entityPlayerData.nationality?.name || "Unknown",
      },
      height: undefined, // Not available in Korastats
      weight: undefined, // Not available in Korastats
      preferred_foot: undefined, // Not available in Korastats
      positions: {
        primary: {
          id: entityPlayerData.positions?.primary?.id || 0,
          name: entityPlayerData.positions?.primary?.name || "Unknown",
          category: "Unknown", // Not available in Korastats
        },
        secondary: {
          id: entityPlayerData.positions?.secondary?.id || 0,
          name: entityPlayerData.positions?.secondary?.name || "Unknown",
          category: "Unknown", // Not available in Korastats
        },
      },
      current_team: entityPlayerData.current_team?.id
        ? {
            id: entityPlayerData.current_team.id,
            name: entityPlayerData.current_team.name || "Unknown",
            jersey_number: tournamentPlayerStatsData?.shirtnumber,
            position: entityPlayerData.positions?.primary?.name,
            joined_date: undefined, // Not available in Korastats
          }
        : undefined,
      career_summary: {
        total_matches: tournamentPlayerStatsData?.stats?.Admin?.MatchesPlayed || 0,
        total_goals: tournamentPlayerStatsData?.stats?.GoalsScored?.Total || 0,
        total_assists: tournamentPlayerStatsData?.stats?.Chances?.Assists || 0,
        total_cards:
          (tournamentPlayerStatsData?.stats?.Cards?.Yellow || 0) +
          (tournamentPlayerStatsData?.stats?.Cards?.Red || 0),
        current_market_value: undefined, // Not available in Korastats
      },
      image_url: entityPlayerData.image,
      status: entityPlayerData.retired ? "retired" : "active",
      last_synced: new Date(),
      sync_version: 1,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static updateMatchWithSummary(
    match: Partial<IMatch>,
    matchSummary: KorastatsMatchSummaryResponse["data"],
  ): Partial<IMatch> {
    if (!matchSummary) return match;

    const homeStats = matchSummary.home?.stats;
    const awayStats = matchSummary.away?.stats;

    // Get goals from GoalsScored.Total if available
    const homeGoals = homeStats?.GoalsScored?.Total || 0;
    const awayGoals = awayStats?.GoalsScored?.Total || 0;

    // Get cards from Cards object
    const homeYellowCards = homeStats?.Cards?.Yellow || 0;
    const homeRedCards = homeStats?.Cards?.Red || 0;
    const awayYellowCards = awayStats?.Cards?.Yellow || 0;
    const awayRedCards = awayStats?.Cards?.Red || 0;

    return {
      ...match,
      teams: {
        home: {
          ...match.teams?.home,
          score: homeGoals,
        },
        away: {
          ...match.teams?.away,
          score: awayGoals,
        },
      },
      quick_stats: {
        total_goals: homeGoals + awayGoals,
        total_cards: homeYellowCards + homeRedCards + awayYellowCards + awayRedCards,
        possession: {
          home: 50, // Not directly available in Korastats, would need to calculate
          away: 50, // Not directly available in Korastats, would need to calculate
        },
      },
      data_available: {
        events: false, // Would need separate timeline call
        stats: !!homeStats || !!awayStats,
        formations: false, // Would need separate formation call
        player_stats: false, // Would need separate player stats call
        video: false, // Would need separate video call
      },
    };
  }

  private static updateMatchWithSquad(
    match: Partial<IMatch>,
    matchSquad: KorastatsMatchSquadResponse["data"],
  ): Partial<IMatch> {
    if (!matchSquad) return match;

    // Update formations if available
    // Note: KorastatsMatchSquad structure needs to be verified
    const homeFormation = undefined; // Will be implemented when we have the exact structure
    const awayFormation = undefined; // Will be implemented when we have the exact structure

    return {
      ...match,
      teams: {
        home: {
          ...match.teams?.home,
          formation: homeFormation,
        },
        away: {
          ...match.teams?.away,
          formation: awayFormation,
        },
      },
      data_available: {
        ...match.data_available,
        formations: !!homeFormation || !!awayFormation,
      },
    };
  }

  private static mapStatusToShort(status: string): string {
    const statusLower = status?.toLowerCase() || "";

    if (statusLower.includes("approved") || statusLower.includes("finished")) {
      return "FT";
    } else if (statusLower.includes("live") || statusLower.includes("playing")) {
      return "LIVE";
    } else if (statusLower.includes("not started") || statusLower.includes("pending")) {
      return "NS";
    } else {
      return "TBD";
    }
  }
}

