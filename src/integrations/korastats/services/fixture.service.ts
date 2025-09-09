// src/integrations/korastats/services/fixture.service.ts
import { KorastatsClient } from "../client";
import { ApiError } from "../../../core/middleware/error.middleware";
import {
  KorastatsMatchListItem,
  KorastatsMatchDetails,
  KorastatsMatchEvent,
  KorastatsMatchStats,
  KorastatsPlayerMatchStats,
  KorastatsMatchLineup,
  KorastatsPlayerHeatmap,
  KorastatsLocationAttempts,
  KorastatsMatchStatus,
  FixtureFilters,
  MatchDetailsParams,
  KorastatsMatchListResponse,
  KorastatsMatchEventsResponse,
  KorastatsMatchDetailsResponse,
  KorastatsMatchStatsResponse,
  KorastatsPlayerStatsResponse,
  KorastatsMatchLineupsResponse,
  KorastatsPlayerHeatmapResponse,
  KorastatsLocationAttemptsResponse,
  KorastatsMatchStatusResponse,
} from "../types/fixture.types";

export class FixtureKorastatsService {
  constructor(private readonly client: KorastatsClient) {}

  /**
   * Get tournament matches - PRIMARY METHOD for GET /fixture/ endpoint
   * Maps to Django's get_all_fixtures(league, season, round, date)
   */
  async getTournamentMatches(
    tournamentId: number,
    filters?: {
      round?: string;
      date?: string; // YYYY-MM-DD format
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<KorastatsMatchListItem[]> {
    try {
      console.log(`🔍 Fetching matches for tournament ${tournamentId}`, filters);

      const response = await this.client.makeRequest<KorastatsMatchListResponse>(
        "TournamentMatchList",
        {
          tournament_id: tournamentId,
        },
      );

      if (!this.isSuccessResponse(response)) {
        console.warn(`TournamentMatchList failed:`, response.message);
        return [];
      }

      if (!Array.isArray(response.data)) {
        console.warn(
          "Expected array from TournamentMatchList, got:",
          typeof response.data,
        );
        return [];
      }

      let matches = response.data;
      console.log(
        `📊 Found ${matches.length} total matches for tournament ${tournamentId}`,
      );

      // Apply filters
      if (filters) {
        matches = this.applyMatchFilters(matches, filters);
        console.log(`🔍 After filtering: ${matches.length} matches remaining`);
      }

      return matches;
    } catch (error) {
      console.error(`Failed to fetch tournament matches for ${tournamentId}:`, error);
      throw new ApiError(500, "Failed to fetch matches from Korastats");
    }
  }

  /**
   * Get detailed match information including events, stats, lineups
   * For GET /fixture/details/?id=X endpoint
   */
  async getMatchDetails(
    matchId: number,
    params?: MatchDetailsParams,
  ): Promise<{
    match: KorastatsMatchDetails | null;
    events: KorastatsMatchEvent[];
    stats: KorastatsMatchStats | null;
    lineups: KorastatsMatchLineup[];
    playerStats: KorastatsPlayerMatchStats[];
  }> {
    try {
      console.log(`🔍 Fetching detailed info for match ${matchId}`);

      // NOTE: This will require multiple API calls to different Korastats endpoints
      // since they don't have a single "match details" endpoint like API Football

      const results = await Promise.allSettled([
        this.getMatchEvents(matchId),
        this.getMatchStatistics(matchId),
        this.getMatchLineups(matchId),
        this.getMatchPlayerStats(matchId),
      ]);

      const events = results[0].status === "fulfilled" ? results[0].value : [];
      const stats = results[1].status === "fulfilled" ? results[1].value : null;
      const lineups = results[2].status === "fulfilled" ? results[2].value : [];
      const playerStats = results[3].status === "fulfilled" ? results[3].value : [];

      // NOTE: Korastats doesn't seem to have a single match details endpoint,
      // so we'll need to reconstruct match details from the basic match data
      console.log(
        `✅ Fetched details for match ${matchId}: ${events.length} events, ${lineups.length} lineups`,
      );

      return {
        match: null, // Will be populated by combining tournament match data
        events,
        stats,
        lineups,
        playerStats,
      };
    } catch (error) {
      console.error(`Failed to fetch match details for ${matchId}:`, error);
      throw new ApiError(500, "Failed to fetch match details from Korastats");
    }
  }

  /**
   * Get match events (timeline) - MatchEventList endpoint
   */
  async getMatchEvents(matchId: number, since?: string): Promise<KorastatsMatchEvent[]> {
    try {
      const params: any = {
        match_id: matchId,
      };

      if (since) {
        params.since = since; // For incremental updates
      }

      const response = await this.client.makeRequest<KorastatsMatchEventsResponse>(
        "MatchEventList",
        params,
      );

      if (!this.isSuccessResponse(response)) {
        console.warn(`MatchEventList failed for match ${matchId}:`, response.message);
        return [];
      }

      if (!Array.isArray(response.data)) {
        console.warn("Expected array from MatchEventList, got:", typeof response.data);
        return [];
      }

      console.log(`📊 Found ${response.data.length} events for match ${matchId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch events for match ${matchId}:`, error);
      return []; // Don't throw, return empty array
    }
  }

  /**
   * Get match statistics - team level stats
   * NOTE: This endpoint may not exist in Korastats - needs investigation
   */
  async getMatchStatistics(matchId: number): Promise<KorastatsMatchStats | null> {
    try {
      // NOTE: This is a placeholder - need to check if Korastats has team stats endpoint
      console.log(
        `⚠️  Match statistics endpoint not yet implemented for match ${matchId}`,
      );
      console.log(`⚠️  May need to derive stats from player stats or events`);
      return null;
    } catch (error) {
      console.error(`Failed to fetch statistics for match ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Get match lineups
   * NOTE: This endpoint may not exist in Korastats - needs investigation
   */
  async getMatchLineups(matchId: number): Promise<KorastatsMatchLineup[]> {
    try {
      // NOTE: This is a placeholder - need to check if Korastats has lineups endpoint
      console.log(`⚠️  Match lineups endpoint not yet implemented for match ${matchId}`);
      console.log(`⚠️  May need to derive lineups from player stats or other data`);
      return [];
    } catch (error) {
      console.error(`Failed to fetch lineups for match ${matchId}:`, error);
      return [];
    }
  }

  /**
   * Get player statistics for a match
   * NOTE: This endpoint may not exist in current Korastats documentation
   */
  async getMatchPlayerStats(matchId: number): Promise<KorastatsPlayerMatchStats[]> {
    try {
      // NOTE: From the documentation, I see MatchPlayerStats endpoint mentioned
      console.log(
        `⚠️  Match player stats endpoint not yet implemented for match ${matchId}`,
      );
      console.log(`⚠️  May need to use MatchPlayerStats endpoint from Korastats`);
      return [];
    } catch (error) {
      console.error(`Failed to fetch player stats for match ${matchId}:`, error);
      return [];
    }
  }

  /**
   * Get player heatmap data - MatchLocationAttempts endpoint
   */
  async getMatchHeatmaps(matchId: number): Promise<KorastatsPlayerHeatmap[]> {
    try {
      const response = await this.client.makeRequest<KorastatsLocationAttemptsResponse>(
        "MatchLocationAttempts",
        {
          match_id: matchId,
        },
      );

      if (!this.isSuccessResponse(response)) {
        console.warn(
          `MatchLocationAttempts failed for match ${matchId}:`,
          response.message,
        );
        return [];
      }

      // NOTE: Need to convert location attempts data to heatmap format
      // This is where soccer domain knowledge will be critical
      console.log(`📊 Found location attempts data for match ${matchId}`);

      // TODO: Transform location attempts to heatmap data
      // This requires understanding the grid system and mapping to player positions
      return [];
    } catch (error) {
      console.error(`Failed to fetch heatmaps for match ${matchId}:`, error);
      return [];
    }
  }

  /**
   * Get match status - MatchStatus endpoint
   */
  async getMatchStatus(
    platformId: string,
    platformMatchId: string,
  ): Promise<KorastatsMatchStatus | null> {
    try {
      const response = await this.client.makeRequest<KorastatsMatchStatusResponse>(
        "MatchStatus",
        {
          platform_id: platformId,
          platform_match_id: platformMatchId,
        },
      );

      if (!this.isSuccessResponse(response)) {
        console.warn(`MatchStatus failed:`, response.message);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch match status:`, error);
      return null;
    }
  }

  /**
   * Get upcoming matches for a tournament
   * Filters matches by status and date
   */
  async getUpcomingMatches(tournamentId: number): Promise<KorastatsMatchListItem[]> {
    try {
      const allMatches = await this.getTournamentMatches(tournamentId);

      // Filter for upcoming matches (status indicates not yet played)
      const upcomingMatches = allMatches.filter((match) => {
        const matchDate = new Date(match.date);
        const now = new Date();

        // Check if match is in the future or has status indicating it's upcoming
        return (
          matchDate > now ||
          !match.status ||
          match.status.toLowerCase().includes("scheduled") ||
          match.status.toLowerCase().includes("upcoming")
        );
      });

      console.log(
        `📅 Found ${upcomingMatches.length} upcoming matches for tournament ${tournamentId}`,
      );
      return upcomingMatches;
    } catch (error) {
      console.error(
        `Failed to fetch upcoming matches for tournament ${tournamentId}:`,
        error,
      );
      throw new ApiError(500, "Failed to fetch upcoming matches");
    }
  }

  /**
   * Get finished matches for a tournament with results
   */
  async getFinishedMatches(
    tournamentId: number,
    round?: string,
  ): Promise<KorastatsMatchListItem[]> {
    try {
      const filters: any = {};
      if (round) {
        filters.round = round;
      }

      const allMatches = await this.getTournamentMatches(tournamentId, filters);

      // Filter for finished matches (have scores and finished status)
      const finishedMatches = allMatches.filter((match) => {
        return (
          match.score &&
          match.status &&
          (match.status.toLowerCase().includes("finished") ||
            match.status.toLowerCase().includes("completed") ||
            match.status.toLowerCase().includes("final"))
        );
      });

      console.log(
        `🏁 Found ${finishedMatches.length} finished matches for tournament ${tournamentId}`,
      );
      return finishedMatches;
    } catch (error) {
      console.error(
        `Failed to fetch finished matches for tournament ${tournamentId}:`,
        error,
      );
      throw new ApiError(500, "Failed to fetch finished matches");
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Apply filters to match list
   */
  private applyMatchFilters(
    matches: KorastatsMatchListItem[],
    filters: {
      round?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): KorastatsMatchListItem[] {
    let filtered = matches;

    // Filter by round
    if (filters.round) {
      filtered = filtered.filter(
        (match) =>
          match.round && match.round.toLowerCase().includes(filters.round!.toLowerCase()),
      );
    }

    // Filter by specific date
    if (filters.date) {
      const targetDate = filters.date; // YYYY-MM-DD format
      filtered = filtered.filter((match) => {
        const matchDate = match.date.split(" ")[0]; // Extract date part
        return matchDate === targetDate;
      });
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((match) => {
        const matchDate = match.date.split(" ")[0]; // Extract date part

        if (filters.dateFrom && matchDate < filters.dateFrom) {
          return false;
        }

        if (filters.dateTo && matchDate > filters.dateTo) {
          return false;
        }

        return true;
      });
    }

    return filtered;
  }

  /**
   * Check if Korastats response indicates success
   */
  private isSuccessResponse<T>(response: {
    result: string;
    message: string;
    data: T;
  }): boolean {
    return response.result === "Success";
  }

  /**
   * Parse Korastats score string "2-1" into numeric values
   */
  private parseScore(scoreString?: string): { home: number; away: number } | null {
    if (!scoreString || scoreString.trim() === "") {
      return null;
    }

    const parts = scoreString.split("-");
    if (parts.length !== 2) {
      return null;
    }

    const home = parseInt(parts[0].trim(), 10);
    const away = parseInt(parts[1].trim(), 10);

    if (isNaN(home) || isNaN(away)) {
      return null;
    }

    return { home, away };
  }

  /**
   * Determine match status from Korastats status string
   */
  private mapMatchStatus(korastatsStatus?: string): {
    long: string;
    short: string;
    elapsed: number | null;
  } {
    if (!korastatsStatus) {
      return { long: "Unknown", short: "UNK", elapsed: null };
    }

    const status = korastatsStatus.toLowerCase();

    if (
      status.includes("finished") ||
      status.includes("completed") ||
      status.includes("final")
    ) {
      return { long: "Match Finished", short: "FT", elapsed: 90 };
    }

    if (status.includes("live") || status.includes("playing")) {
      return { long: "Match Live", short: "LIVE", elapsed: null }; // Would need real-time data
    }

    if (status.includes("scheduled") || status.includes("upcoming")) {
      return { long: "Not Started", short: "NS", elapsed: null };
    }

    if (status.includes("halftime")) {
      return { long: "Halftime", short: "HT", elapsed: 45 };
    }

    // Default fallback
    return { long: korastatsStatus, short: "UNK", elapsed: null };
  }

  /**
   * NEW: Get match video/highlights
   */
  async getMatchVideo(matchId: number): Promise<any> {
    try {
      console.log(`🔍 Fetching match video for match ${matchId}`);

      const response = await this.client.makeRequest<any>("MatchVideo", {
        match_id: matchId,
      });

      console.log(`MatchVideo ${matchId} response:`, {
        type: typeof response,
        hasData: !!response?.data,
        message: response?.message,
      });

      // Handle response formats
      if (response?.result === "Success" && response?.data) {
        return response;
      } else if (response?._type === "MATCH_VIDEO") {
        return { result: "Success", message: "Match video retrieved", data: response };
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch match video for ${matchId}:`, error);
      return null;
    }
  }
}

