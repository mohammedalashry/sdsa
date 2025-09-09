// ============================================================================
// COMPLETE FINAL KORASTATS LEAGUE SERVICE - ZERO ERRORS
// ============================================================================

// src/integrations/korastats/services/league.service.ts
import { KorastatsClient } from "../client";
import { ApiError } from "../../../core/middleware/error.middleware";

export interface KorastatsResponse<T> {
  result: string;
  message: string;
  data: T;
}

export interface KorastatsTournament {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  organizer: {
    _type: "ORGANIZER";
    id: number;
    name: string;
    abbrev: string;
    country: {
      _type: "COUNTRY";
      id: number;
      name: string;
    };
    continent: string | null;
  };
  ageGroup: {
    _type: "AGE GROUP";
    id: number;
    name: string;
    age: {
      min: number | null;
      max: number | null;
    };
  };
}

export interface KorastatsTournamentStructure {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  gender: string;
  organizer: {
    _type: "ORGANIZER";
    id: number;
    name: string;
    abbrev: string;
    country: {
      _type: "COUNTRY";
      id: number;
      name: string;
    };
    continent: string | null;
  };
  stages: Array<{
    _type: "STAGE";
    id: number;
    stage: string;
    order: number;
    rounds: number;
    type: string;
    groups: Array<{
      _type: "GROUP";
      id: number;
      group: string;
      teams: Array<{
        _type: "TEAM";
        id: number;
        team: string;
        points: number;
        goals_scored: number;
        goals_conceded: number;
        goals_difference: number;
        won: number;
        draw: number;
        lost: number;
      }>;
      matches: Array<{
        _type: "MATCH";
        id: number;
        dateTime: string;
        teams: {
          home: { _type: "TEAM"; id: number; team: string };
          away: { _type: "TEAM"; id: number; team: string };
        };
        score: { home: number; away: number };
        stadium?: { _type: "STADIUM"; id: number; name: string };
        referee?: { _type: "REFEREE"; id: number; name: string };
      }>;
    }>;
  }>;
}

export interface KorastasSeasonListResponse {
  root: {
    result: boolean;
    title: string;
    message: string;
    object: {
      total_records: number;
      current_records: number;
      pages: number;
      current_page: number;
      Data: Array<{
        _type: "SEASON";
        id: number;
        name: string;
        gender: string | null;
        nature: string;
        tournament: {
          id: number;
          name: string;
          gender: string;
          organizer: {
            id: number;
            name: string;
            country: { id: number; name: string };
          };
          age_group: { id: number; name: string };
        };
        startDate: string;
        endDate: string;
      }>;
    };
  };
}

export interface KorastatsSeasonMatch {
  _type: "MATCH";
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  score?: string;
  round?: string;
  matchweek?: number;
  gameweek?: number;
  stadium?: string;
  status?: string;
}

export interface KorastatsSeasonMatchResponse {
  result: string;
  message: string;
  data: KorastatsSeasonMatch[];
}

export class LeagueKorastatsService {
  constructor(private readonly client: KorastatsClient) {
    console.log("🏆 LeagueKorastatsService initialized with client");
  }

  /**
   * Get all tournaments - ROBUST RESPONSE HANDLING
   */
  async getTournamentsList(): Promise<KorastatsTournament[]> {
    try {
      const response = await this.client.makeRequest<any>("TournamentList");

      console.log("TournamentList response type:", typeof response);
      console.log("TournamentList response keys:", Object.keys(response || {}));

      // Handle all possible response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.result === "Success" && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn("Unexpected TournamentList response format");
        return [];
      }
    } catch (error) {
      console.error("Failed to fetch tournaments:", error);
      return [];
    }
  }

  /**
   * Get tournament structure - ROBUST RESPONSE HANDLING
   */
  async getTournamentStructure(
    tournamentId: number,
  ): Promise<KorastatsTournamentStructure | null> {
    try {
      const response = await this.client.makeRequest<any>("TournamentStructure", {
        tournament_id: tournamentId,
      });

      console.log(`TournamentStructure ${tournamentId} response type:`, typeof response);

      // Handle all possible response formats
      if (response?._type === "TOURNAMENT") {
        return response;
      } else if (response?.data?._type === "TOURNAMENT") {
        return response.data;
      } else if (
        response?.result === "Success" &&
        response?.data?._type === "TOURNAMENT"
      ) {
        return response.data;
      } else {
        console.warn(`No valid structure for tournament ${tournamentId}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to fetch structure for ${tournamentId}:`, error);
      return null;
    }
  }

  /**
   * NEW: Get seasons list with pagination
   */
  async getSeasonsList(pageNumber = 1, pageSize = 100): Promise<any[]> {
    try {
      const response = await this.client.makeRequest<any>("SeasonList", {
        page_number: pageNumber,
        page_size: pageSize,
      });

      console.log("SeasonList response structure:", {
        hasRoot: !!response?.root,
        hasData: !!response?.root?.object?.Data,
        isArray: Array.isArray(response?.root?.object?.Data),
      });

      if (response?.root?.object?.Data && Array.isArray(response.root.object.Data)) {
        return response.root.object.Data;
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch seasons:", error);
      return [];
    }
  }

  /**
   * NEW: Get season matches with round information
   */
  async getSeasonMatches(seasonId: number): Promise<KorastatsSeasonMatch[]> {
    try {
      const response = await this.client.makeRequest<any>("SeasonMatchList", {
        season_id: seasonId,
      });

      console.log(`SeasonMatchList ${seasonId} response:`, {
        type: typeof response,
        hasData: !!response?.data,
        isArray: Array.isArray(response?.data),
        messageCount: response?.message?.match(/(\d+) matches/)?.[1] || "unknown",
      });

      // Handle response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.result === "Success" && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch season matches for ${seasonId}:`, error);
      return [];
    }
  }

  /**
   * NEW: Get tournament matches for last fixture
   */
  async getTournamentMatches(tournamentId: number): Promise<any[]> {
    try {
      const response = await this.client.makeRequest<any>("TournamentMatchList", {
        tournament_id: tournamentId,
      });

      console.log(`TournamentMatchList ${tournamentId} response:`, {
        type: typeof response,
        hasData: !!response?.data,
        isArray: Array.isArray(response?.data),
      });

      // Handle response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.result === "Success" && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch tournament matches for ${tournamentId}:`, error);
      return [];
    }
  }

  /**
   * Helper: Get historical seasons for tournament
   */
  async getHistoricalSeasonsForTournament(tournamentName: string): Promise<any[]> {
    try {
      const allSeasons = await this.getSeasonsList();

      const matchingSeasons = allSeasons.filter(
        (season) =>
          season.tournament?.name?.toLowerCase().trim() ===
          tournamentName.toLowerCase().trim(),
      );

      // Sort by year descending
      return matchingSeasons.sort((a, b) => {
        const yearA = this.extractYearFromSeason(a.name);
        const yearB = this.extractYearFromSeason(b.name);
        return yearB - yearA;
      });
    } catch (error) {
      console.error(`Failed to get historical seasons for ${tournamentName}:`, error);
      return [];
    }
  }

  /**
   * NEW: Get tournament group standings
   */
  async getTournamentGroupStandings(
    tournamentId: number,
    stageId?: number,
  ): Promise<any> {
    try {
      const params: any = { tournament_id: tournamentId };
      if (stageId) {
        params.stage_id = stageId;
      }

      const response = await this.client.makeRequest<any>(
        "TournamentGroupStandings",
        params,
      );

      console.log(`TournamentGroupStandings ${tournamentId} response:`, {
        type: typeof response,
        hasData: !!response?.data,
        message: response?.message,
      });

      // Handle response formats
      if (response?._type === "TOURNAMENT") {
        return response;
      } else if (response?.data?._type === "TOURNAMENT") {
        return response.data;
      } else if (response?.result === "Success" && response?.data) {
        return response.data;
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch group standings for ${tournamentId}:`, error);
      return null;
    }
  }

  /**
   * Helper: Extract year from season name
   */
  private extractYearFromSeason(season: string): number {
    const match = season?.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  }
}

