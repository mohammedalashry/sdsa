// src/integrations/korastats/services/korastats.service.ts
// Korastats API service with typed methods for all endpoints we need

import { KorastatsClient } from "../client";
import {
  // Fixture types
  KorastatsMatchListResponse,
  KorastatsMatchSquadResponse,
  KorastatsMatchTimelineResponse,
  KorastatsMatchSummaryResponse,
  KorastatsMatchFormationResponse,
  KorastatsMatchPlayersStatsResponse,
  KorastatsMatchPlayerStatsResponse,
  KorastatsMatchPossessionTimelineResponse,
  KorastatsMatchLocationAttemptsResponse,
  KorastatsMatchPlayerHeatmapResponse,
  KorastatsMatchVideoResponse,

  // League types
  KorastatsTournamentListResponse,
  KorastatsTournamentStructureResponse,
  KorastatsStandingsResponse,

  // Player types
  KorastatsPlayerInfoResponse,
  KorastatsEntityPlayerResponse,
  KorastatsTournamentPlayerStatsResponse,
  KorastatsSeasonPlayerTopStatsResponse,
  KorastatsListStatTypesResponse,

  // Team types
  KorastatsTeamInfoResponse,
  KorastatsTournamentTeamListResponse,
  KorastatsTournamentTeamStatsResponse,
  KorastatsTournamentTeamPlayerListResponse,
  KorastatsEntityClubResponse,

  // Coach types
  KorastatsTournamentCoachListResponse,
  KorastatsEntityCoachResponse,

  // Referee types
  KorastatsTournamentRefereeListResponse,
  KorastatsEntityRefereeResponse,

  // Country types
  KorastatsEntityCountriesResponse,
  KorastatsStatType,
} from "../types";

export class KorastatsService {
  private client: KorastatsClient;

  constructor() {
    this.client = new KorastatsClient();
  }

  // ===== FIXTURE ENDPOINTS =====

  /**
   * Get tournament match list
   * @param tournamentId - Tournament ID
  
  
   */
  async getTournamentMatchList(
    tournamentId: number,
  ): Promise<KorastatsMatchListResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };

    return this.client.makeRequest<KorastatsMatchListResponse>(
      "TournamentMatchList",
      params,
    );
  }

  /**
   * Get match squad/lineup
   * @param matchId - Match ID
   */
  async getMatchSquad(matchId: number): Promise<KorastatsMatchSquadResponse> {
    return this.client.makeRequest<KorastatsMatchSquadResponse>("MatchSquad", {
      match_id: matchId,
    });
  }

  /**
   * Get match timeline/events
   * @param matchId - Match ID
   */
  async getMatchTimeline(matchId: number): Promise<KorastatsMatchTimelineResponse> {
    return this.client.makeRequest<KorastatsMatchTimelineResponse>("MatchTimeline", {
      match_id: matchId,
    });
  }
  async getImageUrl(
    objectType: "coach" | "player" | "referee" | "club",
    objectId: number,
  ): Promise<string> {
    // Construct the image URL based on the correct Korastats API structure
    const pathMap = {
      coach: "coaches",
      player: "players",
      referee: "referees",
      club: "club", // Note: singular for clubs, not plural
    };

    return `https://korastats.sirv.com/root/${pathMap[objectType]}/${objectId}.png`;
  }
  /**
   * Get match summary with detailed statistics
   * @param matchId - Match ID
   */
  async getMatchSummary(matchId: number): Promise<KorastatsMatchSummaryResponse> {
    return this.client.makeRequest<KorastatsMatchSummaryResponse>("MatchSummary", {
      match_id: matchId,
    });
  }

  /**
   * Get match formation data
   * @param matchId - Match ID
   * @param side - Side (home or away)
   */
  async getMatchFormation(
    matchId: number,
    side: "home" | "away",
  ): Promise<KorastatsMatchFormationResponse> {
    return this.client.makeRequest<KorastatsMatchFormationResponse>("MatchFormation", {
      match_id: matchId,
      side: side,
    });
  }

  /**
   * Get match players statistics (all players)
   * @param matchId - Match ID
   */
  async getMatchPlayersStats(
    matchId: number,
  ): Promise<KorastatsMatchPlayersStatsResponse> {
    return this.client.makeRequest<KorastatsMatchPlayersStatsResponse>(
      "MatchPlayersStats",
      {
        match_id: matchId,
      },
    );
  }

  /**
   * Get match player statistics (single player)
   * @param matchId - Match ID
   * @param playerId - Player ID
   */
  async getMatchPlayerStats(
    matchId: number,
    playerId: number,
  ): Promise<KorastatsMatchPlayerStatsResponse> {
    return this.client.makeRequest<KorastatsMatchPlayerStatsResponse>(
      "MatchPlayerStats",
      {
        match_id: matchId,
        player_id: playerId,
      },
    );
  }

  /**
   * Get match possession timeline
   * @param matchId - Match ID
   */
  async getMatchPossessionTimeline(
    matchId: number,
  ): Promise<KorastatsMatchPossessionTimelineResponse> {
    return this.client.makeRequest<KorastatsMatchPossessionTimelineResponse>(
      "MatchPossessionTimeline",
      {
        match_id: matchId,
      },
    );
  }

  /**
   * Get match location attempts (shot locations)
   * @param matchId - Match ID
   * @param teamId - Team ID
   */
  async getMatchLocationAttempts(
    matchId: number,
    teamId: number,
  ): Promise<KorastatsMatchLocationAttemptsResponse> {
    return this.client.makeRequest<KorastatsMatchLocationAttemptsResponse>(
      "MatchLocationAttempts",
      {
        match_id: matchId,
        team_id: teamId,
      },
    );
  }

  /**
   * Get match player heatmap
   * @param matchId - Match ID
   * @param playerId - Player ID
   */
  async getMatchPlayerHeatmap(
    matchId: number,
    playerId: number,
  ): Promise<KorastatsMatchPlayerHeatmapResponse> {
    return this.client.makeRequest<KorastatsMatchPlayerHeatmapResponse>(
      "MatchPlayerHeatmap",
      {
        match_id: matchId,
        player_id: playerId,
      },
    );
  }

  /**
   * Get match video/highlights
   * @param matchId - Match ID
   */
  async getMatchVideo(matchId: number): Promise<KorastatsMatchVideoResponse> {
    return this.client.makeRequest<KorastatsMatchVideoResponse>("MatchVideo", {
      match_id: matchId,
    });
  }

  // ===== LEAGUE ENDPOINTS =====

  /**
   * Get tournament list
   * @param countryId - Country ID (optional)
   * @param gender - Gender (optional)
   * @param ageGroup - Age group (optional)
   */
  async getTournamentList(
    countryId?: number,
    gender?: string,
    ageGroup?: string,
  ): Promise<KorastatsTournamentListResponse> {
    const params: Record<string, any> = {};
    if (countryId) params.country_id = countryId;
    if (gender) params.gender = gender;
    if (ageGroup) params.age_group = ageGroup;

    return this.client.makeRequest<KorastatsTournamentListResponse>(
      "TournamentList",
      params,
    );
  }

  /**
   * Get tournament structure
   * @param tournamentId - Tournament ID
   */
  async getTournamentStructure(
    tournamentId: number,
  ): Promise<KorastatsTournamentStructureResponse> {
    return this.client.makeRequest<KorastatsTournamentStructureResponse>(
      "TournamentStructure",
      {
        tournament_id: tournamentId,
      },
    );
  }

  /**
   * Get tournament group standings
   * @param tournamentId - Tournament ID
   * @param stageId - Stage ID
   */
  async getTournamentGroupStandings(
    tournamentId: number,
    stageId: string,
  ): Promise<KorastatsStandingsResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
      stage_id: stageId,
    };

    return this.client.makeRequest<KorastatsStandingsResponse>(
      "TournamentGroupStandings",
      params,
    );
  }

  // ===== PLAYER ENDPOINTS =====

  /**
   * Get player info (match history)
   * @param playerId - Player ID
   */
  async getPlayerInfo(playerId: number): Promise<KorastatsPlayerInfoResponse> {
    return this.client.makeRequest<KorastatsPlayerInfoResponse>("PlayerInfo", {
      player_id: playerId,
    });
  }

  /**
   * Get entity player (player details)
   * @param playerId - Player ID
   */
  async getEntityPlayer(playerId: number): Promise<KorastatsEntityPlayerResponse> {
    return this.client.makeRequest<KorastatsEntityPlayerResponse>("EntityPlayer", {
      player_id: playerId,
    });
  }

  /**
   * Get tournament player statistics
   * @param tournamentId - Tournament ID
   * @param playerId - Player ID (optional)
   */
  async getTournamentPlayerStats(
    tournamentId: number,
    playerId?: number,
  ): Promise<KorastatsTournamentPlayerStatsResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };
    if (playerId) params.player_id = playerId;

    return this.client.makeRequest<KorastatsTournamentPlayerStatsResponse>(
      "TournamentPlayerStats",
      params,
    );
  }

  /**
   * Get season player top statistics
   * @param tournamentId - Tournament ID
   * @param season - Season
   * @param statType - Stat type
   * @param limit - Limit (optional, default 10)
   */
  async getSeasonPlayerTopStats(
    seasonId: number,
    statTypeId: number,
    sort?: "asc" | "desc",
  ): Promise<KorastatsSeasonPlayerTopStatsResponse> {
    return this.client.makeRequest<KorastatsSeasonPlayerTopStatsResponse>(
      "SeasonPlayerTopStats",
      {
        season_id: seasonId,
        stat_type_id: statTypeId,
        sort: sort || "asc",
      },
    );
  }

  /**
   * Get list of available stat types
   */
  async getListStatTypes(
    StatType: KorastatsStatType,
  ): Promise<KorastatsListStatTypesResponse> {
    return this.client.makeRequest<KorastatsListStatTypesResponse>("ListStatTypes", {});
  }

  // ===== TEAM ENDPOINTS =====

  /**
   * Get team info (match history)
   * @param teamId - Team ID
   */
  async getTeamInfo(teamId: number): Promise<KorastatsTeamInfoResponse> {
    return this.client.makeRequest<KorastatsTeamInfoResponse>("TeamInfo", {
      team_id: teamId,
    });
  }

  /**
   * Get tournament team list
   * @param tournamentId - Tournament ID
   */
  async getTournamentTeamList(
    tournamentId: number,
  ): Promise<KorastatsTournamentTeamListResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };

    return this.client.makeRequest<KorastatsTournamentTeamListResponse>(
      "TournamentTeamList",
      params,
    );
  }

  /**
   * Get tournament team statistics
   * @param tournamentId - Tournament ID
   * @param teamId - Team ID
   */
  async getTournamentTeamStats(
    tournamentId: number,
    teamId: number,
  ): Promise<KorastatsTournamentTeamStatsResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
      team_id: teamId,
    };

    return this.client.makeRequest<KorastatsTournamentTeamStatsResponse>(
      "TournamentTeamStats",
      params,
    );
  }

  /**
   * Get tournament team player list
   * @param tournamentId - Tournament ID
   * @param season - Season (optional)
   */
  async getTournamentTeamPlayerList(
    tournamentId: number,
  ): Promise<KorastatsTournamentTeamPlayerListResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };

    return this.client.makeRequest<KorastatsTournamentTeamPlayerListResponse>(
      "TournamentTeamPlayerList",
      params,
    );
  }

  /**
   * Get entity club (club details)
   * @param clubId - Club ID
   */
  async getEntityClub(clubId: number): Promise<KorastatsEntityClubResponse> {
    return this.client.makeRequest<KorastatsEntityClubResponse>("EntityClub", {
      club_id: clubId,
    });
  }

  /**
   * Get entity team data
   * @param teamId - Team ID
   */
  async getEntityTeam(teamId: number): Promise<any> {
    return this.client.makeRequest<any>("EntityTeam", {
      team_id: teamId,
    });
  }

  // ===== COACH ENDPOINTS =====

  /**
   * Get tournament coach list
   * @param tournamentId - Tournament ID
   */
  async getTournamentCoachList(
    tournamentId: number,
  ): Promise<KorastatsTournamentCoachListResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };

    return this.client.makeRequest<KorastatsTournamentCoachListResponse>(
      "TournamentCoachList",
      params,
    );
  }

  /**
   * Get entity coach (coach details)
   * @param coachId - Coach ID
   */
  async getEntityCoach(coachId: number): Promise<KorastatsEntityCoachResponse> {
    return this.client.makeRequest<KorastatsEntityCoachResponse>("EntityCoach", {
      coach_id: coachId,
    });
  }

  // ===== REFEREE ENDPOINTS =====

  /**
   * Get tournament referee list
   * @param tournamentId - Tournament ID
   */
  async getTournamentRefereeList(
    tournamentId: number,
  ): Promise<KorastatsTournamentRefereeListResponse> {
    const params: Record<string, any> = {
      tournament_id: tournamentId,
    };

    return this.client.makeRequest<KorastatsTournamentRefereeListResponse>(
      "TournamentRefereeList",
      params,
    );
  }

  /**
   * Get entity referee (referee details)
   * @param refereeId - Referee ID
   */
  async getEntityReferee(refereeId: number): Promise<KorastatsEntityRefereeResponse> {
    return this.client.makeRequest<KorastatsEntityRefereeResponse>("EntityReferee", {
      referee_id: refereeId,
    });
  }

  // ===== COUNTRY ENDPOINTS =====

  /**
   * Get entity countries (countries list)
   */
  async getEntityCountries(): Promise<KorastatsEntityCountriesResponse> {
    return this.client.makeRequest<KorastatsEntityCountriesResponse>(
      "EntityCountries",
      {},
    );
  }
}

