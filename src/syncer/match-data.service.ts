// src/syncer/match-data.service.ts
// Fixed version with proper detailed sync query and debugging

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { FixtureNew } from "@/mapper/fixtureNew";
import { MatchInterface } from "@/db/mogodb/schemas/match.schema";
import { MatchDetailsInterface } from "@/db/mogodb/schemas/matchDetails.schema";
import { ApiError } from "../core/middleware/error.middleware";
import { FixturePredictionsResponse } from "@/modules/fixtures";

export interface MatchSyncOptions {
  tournamentId: number;
  season?: string;
  limit?: number;
  forceResync?: boolean;
  includeDetails?: boolean;
  includeAnalytics?: boolean;
}

export interface MatchSyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: string[];
}

export class MatchDataService {
  private korastatsService: KorastatsService;
  private fixtureMapper: FixtureNew;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.fixtureMapper = new FixtureNew();
  }

  // ===================================================================
  // MAIN SYNC METHODS - Updated for new mapper structure
  // ===================================================================

  /**
   * Sync basic match data for a tournament
   * Uses: TournamentMatchList + MatchSummary + Tournament + Standings → Match Schema
   */
  async syncBasicMatches(options: MatchSyncOptions): Promise<MatchSyncProgress> {
    const progress: MatchSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting basic match sync...",
      errors: [],
    };

    try {
      console.log(`⚽ Syncing basic matches for tournament ${options.tournamentId}...`);
      const tournamentStructure = await this.korastatsService.getTournamentStructure(
        options.tournamentId,
      );
      const stageId = tournamentStructure.data?.stages[0].id;
      // Step 1: Get required tournament data
      const [tournamentResponse, standingsResponse] = await Promise.all([
        this.korastatsService.getTournamentList(),
        this.korastatsService.getTournamentGroupStandings(options.tournamentId, stageId),
      ]);

      const tournament = tournamentResponse.data?.find(
        (t) => t.id === options.tournamentId,
      );
      if (!tournament) {
        throw new ApiError(404, `Tournament ${options.tournamentId} not found`);
      }

      const standingsData = standingsResponse.data;
      if (!standingsData) {
        throw new ApiError(
          404,
          `Standings not found for tournament ${options.tournamentId}`,
        );
      }

      // Step 2: Get match list for tournament
      progress.current = "Fetching match list...";
      const matchListResponse = await this.korastatsService.getTournamentMatchList(
        options.tournamentId,
      );

      if (!matchListResponse.data || matchListResponse.data.length === 0) {
        console.log(`ℹ️ No matches found for tournament ${options.tournamentId}`);
        return progress;
      }

      let matches = matchListResponse.data;

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        matches = matches.slice(0, options.limit);
        console.log(`📢 Limited to ${options.limit} matches for testing`);
      }

      progress.total = matches.length;

      // Step 3: Process each match
      for (const [index, matchItem] of matches.entries()) {
        try {
          progress.current = `Processing match ${index + 1}/${matches.length}: ${matchItem.home.name} vs ${matchItem.away.name}`;
          console.log(progress.current);

          await this.syncSingleBasicMatch(
            matchItem,
            tournament,
            standingsData,
            options.forceResync,
          );
          progress.completed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Match ${matchItem.matchId}: ${error.message}`);
          console.error(`❌ Failed to sync match ${matchItem.matchId}:`, error.message);
        }
      }

      progress.current = `Basic match sync completed: ${progress.completed}/${progress.total} matches processed`;
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Basic match sync failed: ${error.message}`;
      progress.errors.push(error.message);
      console.error("❌ Basic match sync failed:", error);
      throw error;
    }
  }

  /**
   * FIXED: Sync detailed match data (events, stats, lineups)
   * Uses: Multiple Korastats endpoints → MatchDetails Schema
   */
  async syncDetailedMatches(options: MatchSyncOptions): Promise<MatchSyncProgress> {
    const progress: MatchSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting detailed match sync...",
      errors: [],
    };

    try {
      console.log(
        `📊 Syncing detailed match data for tournament ${options.tournamentId}...`,
      );

      // FIXED: First, let's debug what matches exist
      const allMatches = await Models.Match.find({
        tournament_id: options.tournamentId,
      }).lean();

      console.log(
        `🔍 Debug: Found ${allMatches.length} total matches for tournament ${options.tournamentId}`,
      );

      if (allMatches.length > 0) {
        const statusCounts = allMatches.reduce((counts, match) => {
          const status = match.fixture?.status?.short || "UNKNOWN";
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        }, {});
        console.log(`🔍 Debug: Match statuses:`, statusCounts);

        const dataAvailableCount = allMatches.filter(
          (match) => match.dataAvailable?.events === true,
        ).length;
        console.log(
          `🔍 Debug: Matches with events data: ${dataAvailableCount}/${allMatches.length}`,
        );
      }

      // FIXED: More flexible query to find matches that need detailed sync
      let query: any = {
        tournament_id: options.tournamentId,
      };

      // Only sync finished or live matches for detailed data
      query["fixture.status.short"] = { $in: ["FT", "LIVE", "2H", "HT", "1H"] };

      // If not forcing resync, exclude matches that already have detailed data
      if (!options.forceResync) {
        // Check if MatchDetails already exists for this match
        const existingDetailIds = await Models.MatchDetails.find({
          tournament_id: options.tournamentId,
        }).distinct("korastats_id");

        if (existingDetailIds.length > 0) {
          query.korastats_id = { $nin: existingDetailIds };
          console.log(
            `🔍 Debug: Excluding ${existingDetailIds.length} matches that already have detailed data`,
          );
        }
      }

      console.log(`🔍 Debug: Detailed sync query:`, JSON.stringify(query, null, 2));

      const matches = await Models.Match.find(query)
        .limit(options.limit || 0)
        .lean();

      progress.total = matches.length;

      console.log(`📊 Found ${matches.length} matches that need detailed sync`);

      if (matches.length === 0) {
        console.log(
          `ℹ️ No matches need detailed sync for tournament ${options.tournamentId}`,
        );
        return progress;
      }

      // Process each match
      for (const [index, match] of matches.entries()) {
        try {
          progress.current = `Processing detailed data ${index + 1}/${matches.length}: Match ${match.korastats_id}`;
          console.log(progress.current);

          await this.syncSingleDetailedMatch(
            match.korastats_id,
            match.tournament_id,
            options.forceResync,
          );
          progress.completed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Match ${match.korastats_id}: ${error.message}`);
          console.error(
            `❌ Failed to sync detailed data for match ${match.korastats_id}:`,
            error.message,
          );
        }

        // Add small delay to respect API limits
        if (index < matches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      progress.current = `Detailed match sync completed: ${progress.completed}/${progress.total} matches processed`;
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Detailed match sync failed: ${error.message}`;
      progress.errors.push(error.message);
      console.error("❌ Detailed match sync failed:", error);
      throw error;
    }
  }

  // ===================================================================
  // SINGLE MATCH SYNC METHODS - Updated for new mapper
  // ===================================================================

  /**
   * Sync single basic match - Updated to use new FixtureNew.mapToMatch()
   */
  private async syncSingleBasicMatch(
    matchListItem: any,
    tournament: any,
    standingsData: any,
    forceResync: boolean = false,
  ): Promise<void> {
    // Check if already exists and not forcing resync
    if (!forceResync) {
      const existing = await Models.Match.findOne({
        korastats_id: matchListItem.matchId,
      });
      if (existing) {
        console.log(`⭐ Skipping match ${matchListItem.matchId} - already exists`);
        return;
      }
    }

    try {
      // Get match summary for additional team statistics
      const matchSummaryResponse = await this.korastatsService.getMatchSummary(
        matchListItem.matchId,
      );

      if (matchSummaryResponse.result !== "Success" || !matchSummaryResponse.data) {
        throw new Error(`Failed to get match summary: ${matchSummaryResponse.message}`);
      }

      // Use updated mapper with all required parameters
      const matchData = await this.fixtureMapper.mapToMatch(
        matchListItem,
        matchSummaryResponse.data,
        tournament,
        standingsData,
      );

      // Store in MongoDB
      await Models.Match.findOneAndUpdate(
        { korastats_id: matchListItem.matchId },
        matchData,
        { upsert: true, new: true },
      );

      console.log(`✅ Synced basic match data: ${matchListItem.matchId}`);
    } catch (error) {
      console.error(
        `❌ Failed to sync basic match ${matchListItem.matchId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * FIXED: Sync single detailed match - Updated to use new FixtureNew.mapToMatchDetails()
   */
  private async syncSingleDetailedMatch(
    matchId: number,
    tournamentId: number,
    forceResync: boolean = false,
  ): Promise<void> {
    // Check if already exists and not forcing resync
    if (!forceResync) {
      const existing = await Models.MatchDetails.findOne({ korastats_id: matchId });
      if (existing) {
        console.log(`⭐ Skipping detailed data for match ${matchId} - already exists`);
        return;
      }
    }

    try {
      console.log(`📊 Fetching detailed data for match ${matchId}...`);

      // Fetch all required data from multiple Korastats endpoints
      const [
        matchTimelineResponse,
        matchSquadResponse,
        matchPlayerStatsResponse,
        matchFormationHomeResponse,
        matchFormationAwayResponse,
        matchVideoResponse,
        matchSummaryResponse,
      ] = await Promise.allSettled([
        this.korastatsService.getMatchTimeline(matchId),
        this.korastatsService.getMatchSquad(matchId),
        this.korastatsService.getMatchPlayersStats(matchId),
        this.korastatsService.getMatchFormation(matchId, "home"),
        this.korastatsService.getMatchFormation(matchId, "away"),
        this.korastatsService.getMatchVideo(matchId),
        this.korastatsService.getMatchSummary(matchId),
      ]);

      // Extract successful responses
      const matchTimeline = this.extractSuccessfulResponse(
        matchTimelineResponse,
        "timeline",
      );
      const matchSquad = this.extractSuccessfulResponse(matchSquadResponse, "squad");
      const matchPlayerStats = this.extractSuccessfulResponse(
        matchPlayerStatsResponse,
        "playerStats",
      );
      const matchFormationHome = this.extractSuccessfulResponse(
        matchFormationHomeResponse,
        "formationHome",
      );
      const matchFormationAway = this.extractSuccessfulResponse(
        matchFormationAwayResponse,
        "formationAway",
      );
      const matchVideo = this.extractSuccessfulResponse(matchVideoResponse, "video");
      const matchSummary = this.extractSuccessfulResponse(
        matchSummaryResponse,
        "summary",
      );

      console.log(`📊 Match ${matchId} data availability:`, {
        timeline: !!matchTimeline,
        squad: !!matchSquad,
        playerStats: !!matchPlayerStats,
        formationHome: !!matchFormationHome,
        formationAway: !!matchFormationAway,
        video: !!matchVideo,
        summary: !!matchSummary,
      });

      // We need at least basic data to create a detailed match record
      if (!matchSquad && !matchTimeline && !matchPlayerStats) {
        throw new Error("No detailed data available from any endpoint");
      }

      // FIXED: Check if mapper method exists
      if (!this.fixtureMapper.mapToMatchDetails) {
        console.warn(
          `⚠️ mapToMatchDetails method not implemented yet - creating basic detailed record`,
        );

        // Create basic MatchDetails record with available data
        const basicMatchDetails: Partial<MatchDetailsInterface> = {
          korastats_id: matchId,
          tournament_id: tournamentId,
          timelineData: matchTimeline?.timeline || [],
          lineupsData: matchSquad ? [matchSquad] : [],
          injuriesData: [],
          playerStatsData: matchPlayerStats ? [matchPlayerStats] : [],
          statisticsData: [],
          predictionsData: {} as FixturePredictionsResponse,
          momentumData: {
            data: [],
            home: { id: 0, name: "", logo: "", winner: false },
            away: { id: 0, name: "", logo: "", winner: false },
          },
          highlightsData: { host: "youtube", url: "" },
          heatmapsData: [],
          shotmapsData: [],
          topPerformersData: {
            league: { name: "", logo: "", season: 0 },
            homeTeam: { id: 0, name: "", logo: "", winner: false },
            awayTeam: { id: 0, name: "", logo: "", winner: false },
            topScorer: {
              homePlayer: { id: 0, name: "", photo: "" },
              awayPlayer: { id: 0, name: "", photo: "" },
              stats: [],
            },
            topAssister: {
              homePlayer: { id: 0, name: "", photo: "" },
              awayPlayer: { id: 0, name: "", photo: "" },
              stats: [],
            },
            topKeeper: {
              homePlayer: { id: 0, name: "", photo: "" },
              awayPlayer: { id: 0, name: "", photo: "" },
              stats: [],
            },
          },

          lastSynced: new Date(),
          syncVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Store basic detailed data
        await Models.MatchDetails.findOneAndUpdate(
          { korastats_id: matchId },
          basicMatchDetails,
          { upsert: true, new: true },
        );
      } else {
        // Use the mapper to create detailed match data
        const matchDetailsData = await this.fixtureMapper.mapToMatchDetails(
          matchId,
          tournamentId,
          matchTimeline,
          matchSquad[0],
          matchPlayerStats,
          matchFormationHome,
          matchFormationAway,
          matchVideo,
          matchSummary,
        );

        // Store in MongoDB
        await Models.MatchDetails.findOneAndUpdate(
          { korastats_id: matchId },
          matchDetailsData,
          { upsert: true, new: true },
        );
      }

      // Update match data availability flags
      await Models.Match.findOneAndUpdate(
        { korastats_id: matchId },
        {
          "dataAvailable.events": !!matchTimeline,
          "dataAvailable.stats": !!matchPlayerStats,
          "dataAvailable.formations": !!(matchFormationHome && matchFormationAway),
          "dataAvailable.playerStats": !!matchPlayerStats,
          "dataAvailable.video": !!matchVideo,
          lastSynced: new Date(),
        },
      );

      console.log(`✅ Synced detailed match data: ${matchId}`);
    } catch (error) {
      console.error(`❌ Failed to sync detailed match ${matchId}:`, error.message);
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
      console.warn(`⚠️ Failed to fetch ${dataType}:`, result.reason?.message);
    } else if (result.status === "fulfilled") {
      console.warn(`⚠️ No ${dataType} data available:`, result.value?.message);
    }

    return null;
  }

  /**
   * Get sync status for a tournament
   */
  async getSyncStatus(tournamentId: number): Promise<{
    totalMatches: number;
    basicSynced: number;
    detailedSynced: number;
    lastSync: Date | null;
  }> {
    try {
      const [totalMatches, detailedMatches, lastSyncMatch] = await Promise.all([
        Models.Match.countDocuments({ tournament_id: tournamentId }),
        Models.MatchDetails.countDocuments({ tournament_id: tournamentId }),
        Models.Match.findOne(
          { tournament_id: tournamentId },
          {},
          { sort: { lastSynced: -1 } },
        ),
      ]);

      return {
        totalMatches,
        basicSynced: totalMatches,
        detailedSynced: detailedMatches,
        lastSync: lastSyncMatch?.lastSynced || null,
      };
    } catch (error) {
      console.error("Failed to get sync status:", error);
      return {
        totalMatches: 0,
        basicSynced: 0,
        detailedSynced: 0,
        lastSync: null,
      };
    }
  }

  /**
   * Clear all match data for a tournament (for re-sync)
   */
  async clearTournamentMatches(tournamentId: number): Promise<void> {
    try {
      await Promise.all([
        Models.Match.deleteMany({ tournament_id: tournamentId }),
        Models.MatchDetails.deleteMany({ tournament_id: tournamentId }),
      ]);

      console.log(`🗑️ Cleared all match data for tournament ${tournamentId}`);
    } catch (error) {
      console.error("Failed to clear tournament matches:", error);
      throw error;
    }
  }

  /**
   * Force detailed sync for specific matches
   */
  async forceDetailedSyncForMatches(matchIds: number[]): Promise<MatchSyncProgress> {
    const progress: MatchSyncProgress = {
      total: matchIds.length,
      completed: 0,
      failed: 0,
      current: "Starting forced detailed sync...",
      errors: [],
    };

    console.log(`🔄 Force syncing detailed data for ${matchIds.length} matches...`);

    for (const [index, matchId] of matchIds.entries()) {
      try {
        progress.current = `Force syncing match ${index + 1}/${matchIds.length}: ${matchId}`;
        console.log(progress.current);

        // Get tournament ID for this match
        const match = await Models.Match.findOne({ korastats_id: matchId }).lean();
        if (!match) {
          throw new Error(`Match ${matchId} not found in database`);
        }

        await this.syncSingleDetailedMatch(matchId, match.tournament_id, true);
        progress.completed++;
      } catch (error) {
        progress.failed++;
        progress.errors.push(`Match ${matchId}: ${error.message}`);
        console.error(`❌ Failed to force sync match ${matchId}:`, error.message);
      }

      // Add delay between matches
      if (index < matchIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(
      `✅ Force detailed sync completed: ${progress.completed}/${progress.total}`,
    );
    return progress;
  }
}

