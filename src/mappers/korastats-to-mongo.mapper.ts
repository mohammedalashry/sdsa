// src/mappers/korastats-to-mongo.mapper.ts
// Mapper to transform Korastats API responses to MongoDB schemas

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
  KorastatsTournamentStructure,
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

export class KorastatsToMongoMapper {
  // ============================================================================
  // TOURNAMENT MAPPING
  // ============================================================================

  /**
   * Map Korastats tournament data to MongoDB tournament schema
   */
  static mapTournament(
    korastatsTournament: KorastatsTournamentStructure,
    season?: string,
  ): Partial<ITournament> {
    const tournament = korastatsTournament;

    return {
      korastats_id: tournament.id,
      name: tournament.tournament,
      season: season || tournament.season || "2024",
      country: {
        id: tournament.organizer?.country?.id || 0,
        name: tournament.organizer?.country?.name || "Unknown",
      },
      organizer: {
        id: tournament.organizer?.id || 0,
        name: tournament.organizer?.name || "Unknown",
        abbrev: tournament.organizer?.abbrev || "UNK",
      },
      age_group: {
        id: tournament.ageGroup?.id || 0,
        name: tournament.ageGroup?.name || "Senior",
        min_age: tournament.ageGroup?.age?.min,
        max_age: tournament.ageGroup?.age?.max,
      },
      gender: "male", // Not available in KorastatsTournament
      structure: {
        stages: tournament.stages || [],
      },
      start_date: new Date(tournament.startDate || Date.now()),
      end_date: new Date(tournament.endDate || Date.now()),
      status: "upcoming", // Not available in KorastatsTournament
      last_synced: new Date(),
      sync_version: 1,
    };
  }

  // ============================================================================
  // MATCH MAPPING
  // ============================================================================

  /**
   * Map Korastats match data to MongoDB match schema
   * @param korastatsMatch - Basic match data from TournamentMatchList
   * @param matchSummary - Detailed match data from MatchSummary (optional)
   * @param tournamentId - Tournament ID
   * @param season - Season string
   */
  static mapMatch(
    korastatsMatch: KorastatsMatchListResponse["data"][0],
    matchSummary?: KorastatsMatchSummaryResponse["data"],
    tournamentId?: number,
    season?: string,
  ): Partial<IMatch> {
    return {
      korastats_id: korastatsMatch.matchId,
      tournament_id: tournamentId,
      season,
      round: korastatsMatch.round,
      date: new Date(korastatsMatch.dateTime),
      status: {
        id: korastatsMatch.status.id,
        name: korastatsMatch.status.status,
        short: this.mapStatusToShort(korastatsMatch.status.status),
      },
      teams: {
        home: {
          id: korastatsMatch.home.id,
          name: korastatsMatch.home.name,
          score: 0, // Will be updated from match summary
          formation: undefined,
        },
        away: {
          id: korastatsMatch.away.id,
          name: korastatsMatch.away.name,
          score: 0, // Will be updated from match summary
          formation: undefined,
        },
      },
      venue: {
        id: korastatsMatch.stadium.id,
        name: korastatsMatch.stadium.name,
        city: undefined,
        country: undefined,
      },
      officials: {
        referee: {
          id: korastatsMatch.referee.id,
          name: korastatsMatch.referee.name,
          nationality: korastatsMatch.referee.nationality.name,
        },
        assistant1: undefined,
        assistant2: undefined,
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
  }

  /**
   * Update match with detailed data from match summary
   */
  static updateMatchWithSummary(
    match: Partial<IMatch>,
    matchSummary: KorastatsMatchSummaryResponse["data"],
  ): Partial<IMatch> {
    if (!matchSummary) return match;

    // Extract stats from the complex Korastats structure
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

  // ============================================================================
  // PLAYER MAPPING
  // ============================================================================

  /**
   * Map Korastats player data to MongoDB player schema
   */
  static mapPlayer(korastatsPlayer: KorastatsEntityPlayer): Partial<IPlayer> {
    return {
      korastats_id: korastatsPlayer.id,
      name: korastatsPlayer.fullname,
      nickname: korastatsPlayer.nickname || korastatsPlayer.fullname,
      date_of_birth: new Date(korastatsPlayer.dob),
      age: parseInt(korastatsPlayer.age) || 0,
      nationality: {
        id: korastatsPlayer.nationality?.id || 0,
        name: korastatsPlayer.nationality?.name || "Unknown",
      },
      height: undefined, // Not available in KorastatsEntityPlayer
      weight: undefined, // Not available in KorastatsEntityPlayer
      preferred_foot: undefined, // Not available in KorastatsEntityPlayer
      positions: {
        primary: {
          id: korastatsPlayer.positions?.primary?.id || 0,
          name: korastatsPlayer.positions?.primary?.name || "Unknown",
          category: "Unknown", // Not available in KorastatsEntityPlayer
        },
        secondary: {
          id: korastatsPlayer.positions?.secondary?.id || 0,
          name: korastatsPlayer.positions?.secondary?.name || "Unknown",
          category: "Unknown", // Not available in KorastatsEntityPlayer
        },
      },
      current_team: korastatsPlayer.current_team?.id
        ? {
            id: korastatsPlayer.current_team.id,
            name: korastatsPlayer.current_team.name || "Unknown",
            jersey_number: undefined, // Not available in KorastatsEntityPlayer
            position: korastatsPlayer.positions?.primary?.name,
            joined_date: undefined, // Not available in KorastatsEntityPlayer
          }
        : undefined,
      career_summary: {
        total_matches: 0, // Not available in KorastatsEntityPlayer
        total_goals: 0, // Not available in KorastatsEntityPlayer
        total_assists: 0, // Not available in KorastatsEntityPlayer
        total_cards: 0, // Not available in KorastatsEntityPlayer
        current_market_value: undefined, // Not available in KorastatsEntityPlayer
      },
      image_url: korastatsPlayer.image,
      status: korastatsPlayer.retired ? "retired" : "active",
      last_synced: new Date(),
      sync_version: 1,
    };
  }

  // ============================================================================
  // TEAM MAPPING
  // ============================================================================

  /**
   * Map Korastats team data to MongoDB team schema
   */
  static mapTeam(korastatsTeam: KorastatsEntityClub): Partial<ITeam> {
    // For now, we'll map the first team from the club
    const team = korastatsTeam.teams?.[0];

    return {
      korastats_id: team?.id || korastatsTeam.id,
      name: team?.name || korastatsTeam.name,
      short_name: undefined, // Not available in KorastatsEntityClub
      nickname: undefined, // Not available in KorastatsEntityClub
      country: {
        id: korastatsTeam.country?.id || 0,
        name: korastatsTeam.country?.name || "Unknown",
      },
      city: undefined, // Not available in KorastatsEntityClub
      club: {
        id: korastatsTeam.id,
        name: korastatsTeam.name,
        logo_url: korastatsTeam.logo,
        founded_year: undefined, // Not available in KorastatsEntityClub
        is_national_team: korastatsTeam.national_federation || false,
      },
      stadium: team?.stadium
        ? {
            id: team.stadium.id,
            name: team.stadium.name,
            capacity: undefined, // Not available in KorastatsEntityClub
            surface: undefined, // Not available in KorastatsEntityClub
            city: undefined, // Not available in KorastatsEntityClub
          }
        : undefined,
      current_squad: undefined, // Not available in KorastatsEntityClub
      current_coach: team?.coach
        ? {
            id: team.coach.id,
            name: team.coach.name,
            nationality: undefined, // Not available in KorastatsEntityClub
            appointed_date: undefined, // Not available in KorastatsEntityClub
          }
        : undefined,
      stats_summary: {
        total_matches: 0, // Not available in KorastatsEntityClub
        total_wins: 0, // Not available in KorastatsEntityClub
        total_draws: 0, // Not available in KorastatsEntityClub
        total_losses: 0, // Not available in KorastatsEntityClub
        total_goals_for: 0, // Not available in KorastatsEntityClub
        total_goals_against: 0, // Not available in KorastatsEntityClub
      },
      status: "active",
      last_synced: new Date(),
      sync_version: 1,
    };
  }

  // ============================================================================
  // PLAYER STATS MAPPING
  // ============================================================================

  /**
   * Map Korastats player stats to MongoDB player stats schema
   */
  static mapPlayerStats(
    korastatsPlayerStats: KorastatsMatchPlayersStatsResponse["data"],
    matchId: number,
    tournamentId: number,
    season: string,
    matchDate: Date,
    homeTeamId: number,
    awayTeamId: number,
  ): Partial<IPlayerStats>[] {
    const playerStats: Partial<IPlayerStats>[] = [];

    // Map player stats (KorastatsMatchPlayersStats doesn't have home/away structure)
    if (korastatsPlayerStats && Array.isArray(korastatsPlayerStats)) {
      korastatsPlayerStats.forEach((playerStat) => {
        playerStats.push({
          player_id: playerStat.id,
          match_id: matchId,
          tournament_id: tournamentId,
          team_id: playerStat.team?.id || homeTeamId,
          season,
          match_date: matchDate,
          opponent_team_id: awayTeamId,
          is_home: (playerStat.team?.id || homeTeamId) === homeTeamId,
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

    return playerStats;
  }

  // ============================================================================
  // TEAM STATS MAPPING
  // ============================================================================

  /**
   * Map Korastats team stats to MongoDB team stats schema
   */
  static mapTeamStats(
    korastatsTeamStats: KorastatsTournamentTeamStatsResponse["data"],
    matchId: number,
    tournamentId: number,
    season: string,
    matchDate: Date,
    homeTeamId: number,
    awayTeamId: number,
  ): Partial<ITeamStats>[] {
    const teamStats: Partial<ITeamStats>[] = [];

    // Note: KorastatsTournamentTeamStats doesn't have home/away structure
    // It's a single team's stats, so we'll need to handle this differently
    // For now, we'll create a placeholder structure

    if (korastatsTeamStats && korastatsTeamStats.stats) {
      // Extract stats from the Korastats structure
      const stats = korastatsTeamStats.stats;

      // Find relevant stats from the array
      const shotsTotal = stats.find((s) => s.stat === "Shots")?.value || 0;
      const shotsOnTarget = stats.find((s) => s.stat === "Shots on Target")?.value || 0;
      const passesTotal = stats.find((s) => s.stat === "Passes")?.value || 0;
      const passesAccurate = stats.find((s) => s.stat === "Accurate Passes")?.value || 0;
      const corners = stats.find((s) => s.stat === "Corners")?.value || 0;
      const yellowCards = stats.find((s) => s.stat === "Yellow Cards")?.value || 0;
      const redCards = stats.find((s) => s.stat === "Red Cards")?.value || 0;
      const fouls = stats.find((s) => s.stat === "Fouls")?.value || 0;

      // Create team stats for the team (we don't know if it's home or away from this data)
      teamStats.push({
        team_id: korastatsTeamStats.id,
        match_id: matchId,
        tournament_id: tournamentId,
        season,
        match_date: matchDate,
        opponent_team_id: 0, // Unknown from this data structure
        is_home: true, // Default to home, would need match context to determine
        performance: {
          possession: 50, // Not available in KorastatsTournamentTeamStats
          shots: {
            total: shotsTotal,
            on_target: shotsOnTarget,
            off_target: shotsTotal - shotsOnTarget,
            blocked: 0, // Not available
          },
          passes: {
            total: passesTotal,
            accurate: passesAccurate,
            accuracy_percentage:
              passesTotal > 0 ? (passesAccurate / passesTotal) * 100 : 0,
          },
          attacks: {
            total: 0, // Not available in KorastatsTournamentTeamStats
            dangerous: 0, // Not available in KorastatsTournamentTeamStats
          },
          corners: corners,
          free_kicks: 0, // Not available in KorastatsTournamentTeamStats
          penalties: 0, // Not available in KorastatsTournamentTeamStats
          cards: {
            yellow: yellowCards,
            red: redCards,
          },
          fouls: {
            committed: fouls,
            awarded: 0, // Not available in KorastatsTournamentTeamStats
          },
        },
        last_synced: new Date(),
        sync_version: 1,
      });
    }

    return teamStats;
  }

  // ============================================================================
  // MATCH EVENTS MAPPING
  // ============================================================================

  /**
   * Map Korastats match events to MongoDB match events schema
   */
  static mapMatchEvents(
    korastatsEvents: KorastatsMatchTimelineResponse["data"],
    matchId: number,
    tournamentId: number,
  ): Partial<IMatchEvent>[] {
    if (!korastatsEvents || !Array.isArray(korastatsEvents)) {
      return [];
    }

    return korastatsEvents.map((event) => ({
      match_id: matchId,
      tournament_id: tournamentId,
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
    }));
  }

  // ============================================================================
  // SYNC LOG MAPPING
  // ============================================================================

  /**
   * Create sync log entry
   */
  static createSyncLog(
    syncType: "full" | "incremental" | "manual",
    scope?: {
      tournament_id?: number;
      match_id?: number;
      player_id?: number;
      team_id?: number;
    },
  ): Partial<ISyncLog> {
    return {
      sync_type: syncType,
      sync_status: "running",
      tournament_id: scope?.tournament_id,
      match_id: scope?.match_id,
      player_id: scope?.player_id,
      team_id: scope?.team_id,
      started_at: new Date(),
      records_processed: 0,
      records_updated: 0,
      records_created: 0,
      records_failed: 0,
      errors: [],
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static mapTournamentStatus(
    status: string,
  ): "active" | "completed" | "upcoming" {
    const statusLower = status?.toLowerCase() || "";

    if (statusLower.includes("active") || statusLower.includes("ongoing")) {
      return "active";
    } else if (statusLower.includes("completed") || statusLower.includes("finished")) {
      return "completed";
    } else {
      return "upcoming";
    }
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

