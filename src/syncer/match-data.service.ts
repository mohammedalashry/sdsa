// src/syncer/match-data.service.ts
// Fixed version with proper detailed sync query and debugging

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { FixtureNew } from "@/mapper/fixtureNew";
import { MatchInterface } from "@/db/mogodb/schemas/match.schema";
import { MatchDetailsInterface } from "@/db/mogodb/schemas/matchDetails.schema";
import { ApiError } from "../core/middleware/error.middleware";
import { FixturePredictionsResponse } from "@/modules/fixtures";
import {
  KorastatsMatchTimeline,
  KorastatsMatchSquad,
  KorastatsMatchPlayersStats,
  KorastatsMatchFormation,
  KorastatsMatchVideo,
  KorastatsMatchSummary,
  KorastatsMatchPossessionTimeline,
} from "@/integrations/korastats/types/fixture.types";

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
  startTime?: Date;
  endTime?: Date;
}

export class MatchDataService {
  private korastatsService: KorastatsService;
  // Reports for this run
  private summaryReport: Array<{
    matchId: number;
    tournamentId: number;
    tournamentName: string;
    season: string;
    matchName: string;
    dataStatus: any;
  }> = [];
  private detailedReport: Array<{
    matchId: number;
    tournamentId: number;
    tournamentName: string;
    season: string;
    matchName: string;
    dataStatus: any;
    detailedIssues: { [k: string]: any };
    defaultDataUsed: { [k: string]: boolean };
    processingNotes: string[];
  }> = [];
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

      // Check both tournament IDs (840 and 1441) since Korastats treats them as different tournaments
      const tournamentIdsToCheck =
        options.tournamentId === 840 ? [840, 1441] : [options.tournamentId];
      let matchListResponse = null;

      for (const tournamentId of tournamentIdsToCheck) {
        console.log(`🔧 DEBUG: Checking tournament ${tournamentId} for matches`);
        matchListResponse =
          await this.korastatsService.getTournamentMatchList(tournamentId);

        if (
          matchListResponse.result === "Success" &&
          matchListResponse.data &&
          matchListResponse.data.length > 0
        ) {
          console.log(
            `🔧 DEBUG: Found ${matchListResponse.data.length} matches in tournament ${tournamentId}`,
          );
          break;
        }
      }

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
    dataAvailableFlagOverride?: boolean,
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
        matchPossessionResponse,
      ] = await Promise.allSettled([
        this.korastatsService.getMatchTimeline(matchId),
        this.korastatsService.getMatchSquad(matchId),
        this.korastatsService.getMatchPlayersStats(matchId),
        this.korastatsService.getMatchFormation(matchId, "home"),
        this.korastatsService.getMatchFormation(matchId, "away"),
        this.korastatsService.getMatchVideo(matchId),
        this.korastatsService.getMatchSummary(matchId),
        this.korastatsService.getMatchPossessionTimeline(matchId),
      ]);

      // Extract successful responses
      const matchTimeline = this.extractSuccessfulResponse<KorastatsMatchTimeline>(
        matchTimelineResponse,
        "timeline",
      );
      const matchSquad = this.extractSuccessfulResponse<KorastatsMatchSquad[]>(
        matchSquadResponse,
        "squad",
      );
      const matchPlayerStats = this.extractSuccessfulResponse<KorastatsMatchPlayersStats>(
        matchPlayerStatsResponse,
        "playerStats",
      );
      const matchFormationHome = this.extractSuccessfulResponse<KorastatsMatchFormation>(
        matchFormationHomeResponse,
        "formationHome",
      );
      const matchFormationAway = this.extractSuccessfulResponse<KorastatsMatchFormation>(
        matchFormationAwayResponse,
        "formationAway",
      );
      const matchVideo = this.extractSuccessfulResponse<KorastatsMatchVideo>(
        matchVideoResponse,
        "video",
      );
      const matchSummary = this.extractSuccessfulResponse<KorastatsMatchSummary>(
        matchSummaryResponse,
        "summary",
      );
      const matchPossession =
        this.extractSuccessfulResponse<KorastatsMatchPossessionTimeline>(
          matchPossessionResponse,
          "possession",
        );

      console.log(`📊 Match ${matchId} data availability:`, {
        timeline: !!matchTimeline,
        squad: !!matchSquad,
        playerStats: !!matchPlayerStats,
        formationHome: !!matchFormationHome,
        formationAway: !!matchFormationAway,
        video: !!matchVideo,
        summary: !!matchSummary,
        possession: !!matchPossession,
      });

      // We need at least basic data to create a detailed match record
      if (!matchSquad && !matchTimeline && !matchPlayerStats) {
        throw new Error("No detailed data available from any endpoint");
      }

      // Minimal guards only; detailed structural validation is handled by checkMatchDataAvailability

      // Check if mapper method exists
      if (!this.fixtureMapper.mapToMatchDetails) {
        console.warn(
          `⚠️ mapToMatchDetails method not implemented yet - skipping detailed match ${matchId}`,
        );
        throw new Error("mapToMatchDetails method not implemented");
      }

      // Use the mapper to create detailed match data
      // Prefer externally computed availability (from checkMatchDataAvailability) for consistency
      const dataAvailableFlag =
        typeof dataAvailableFlagOverride === "boolean"
          ? dataAvailableFlagOverride
          : !!(matchTimeline && matchSquad && matchPlayerStats);
      const matchDetailsData = await this.fixtureMapper.mapToMatchDetails(
        matchId,
        tournamentId,
        matchTimeline,
        matchSquad ? matchSquad[0] : null,
        matchPlayerStats,
        matchFormationHome,
        matchFormationAway,
        matchVideo,
        matchSummary,
        matchPossession,
        dataAvailableFlag,
      );

      // Store in MongoDB
      await Models.MatchDetails.findOneAndUpdate(
        { korastats_id: matchId },
        matchDetailsData,
        { upsert: true, new: true },
      );

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
  private extractSuccessfulResponse<T>(
    result: PromiseSettledResult<any>,
    dataType: string,
  ): T | null {
    if (
      result.status === "fulfilled" &&
      result.value?.result === "Success" &&
      result.value?.data
    ) {
      return result.value.data as T;
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
   * Clear MatchDetails with optional filters
   */
  async clearMatchDetails(
    options: {
      beforeDate?: Date;
      afterDate?: Date;
      excludeIds?: number[];
      includeIds?: number[];
      tournamentId?: number;
    } = {},
  ): Promise<{ deletedCount: number }> {
    try {
      let query: any = {};

      // Date filters
      if (options.beforeDate || options.afterDate) {
        query.createdAt = {};
        if (options.beforeDate) query.createdAt.$lt = options.beforeDate;
        if (options.afterDate) query.createdAt.$gt = options.afterDate;
      }

      // Tournament filter
      if (options.tournamentId) {
        query.tournament_id = options.tournamentId;
      }

      // ID filters
      if (options.excludeIds && options.excludeIds.length > 0) {
        query.korastats_id = { $nin: options.excludeIds };
      }
      if (options.includeIds && options.includeIds.length > 0) {
        query.korastats_id = { $in: options.includeIds };
      }

      console.log(`🗑️ Clearing MatchDetails with query:`, JSON.stringify(query, null, 2));

      const result = await Models.MatchDetails.deleteMany(query);

      console.log(`✅ Cleared ${result.deletedCount} MatchDetails records`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error("Failed to clear MatchDetails:", error);
      throw error;
    }
  }

  /**
   * Sync detailed matches for all basic matches with optional filters
   */
  async syncAllDetailedMatches(
    options: {
      skipIds?: number[];
      includeIds?: number[];
      tournamentId?: number;
      limit?: number;
      forceResync?: boolean;
    } = {},
  ): Promise<MatchSyncProgress> {
    const progress: MatchSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting detailed match sync for all basic matches...",
      errors: [],
      startTime: new Date(),
    };

    try {
      console.log(`📊 Syncing detailed matches for all basic matches...`);

      // Build query for basic matches
      let query: any = {};

      if (options.tournamentId) {
        query.tournament_id = options.tournamentId;
      }

      // ID filters
      if (options.skipIds && options.skipIds.length > 0) {
        query.korastats_id = { $nin: options.skipIds };
      }
      if (options.includeIds && options.includeIds.length > 0) {
        query.korastats_id = { $in: options.includeIds };
      }

      console.log(`🔍 Finding basic matches with query:`, JSON.stringify(query, null, 2));

      const basicMatches = await Models.Match.find(query)
        .select("korastats_id tournament_id")
        .limit(options.limit || 0)
        .lean();

      progress.total = basicMatches.length;
      console.log(
        `📊 Found ${basicMatches.length} basic matches to sync detailed data for`,
      );

      if (basicMatches.length === 0) {
        console.log(`ℹ️ No basic matches found for detailed sync`);
        return progress;
      }

      // Process in batches
      const batchSize = 1; // Keep small for rate limiting
      const delayBetweenBatches = 3000;
      const delayBetweenRequests = 1000;

      for (let i = 0; i < basicMatches.length; i += batchSize) {
        const batch = basicMatches.slice(i, i + batchSize);

        console.log(
          `📦 Processing detailed matches batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(basicMatches.length / batchSize)}`,
        );

        const batchPromises = batch.map(async (match) => {
          const maxRetries = 2;
          let retryCount = 0;

          while (retryCount < maxRetries) {
            try {
              progress.current = `Syncing detailed match ${match.korastats_id} (attempt ${retryCount + 1}/${maxRetries})...`;

              // Check if match has sufficient data before attempting sync
              const availability = await this.checkMatchDataAvailability(
                match.korastats_id,
              );
              const { hasValidData, dataStatus, errors } = availability;

              // Proceed even if invalid; we'll use defaults in mapper via flag
              const dataAvailableFlag = !!hasValidData;

              // Add delay before API call
              if (retryCount > 0) {
                await new Promise((resolve) =>
                  setTimeout(resolve, delayBetweenRequests * retryCount),
                );
              }

              await this.syncSingleDetailedMatch(
                match.korastats_id,
                match.tournament_id,
                options.forceResync || false,
                dataAvailableFlag,
              );

              // Build reports entry for insufficient data
              if (!dataAvailableFlag) {
                const tournamentName = `Tournament ${match.tournament_id}`;
                const matchName = `Match ${match.korastats_id}`;
                this.summaryReport.push({
                  matchId: match.korastats_id,
                  tournamentId: match.tournament_id,
                  tournamentName,
                  season: "",
                  matchName,
                  dataStatus,
                });
                this.detailedReport.push({
                  matchId: match.korastats_id,
                  tournamentId: match.tournament_id,
                  tournamentName,
                  season: "",
                  matchName,
                  dataStatus,
                  detailedIssues: { errors },
                  defaultDataUsed: {
                    timeline: !dataStatus.timeline,
                    squad: !dataStatus.squad,
                    playerStats: !dataStatus.playerStats,
                    formationHome: !dataStatus.formationHome,
                    formationAway: !dataStatus.formationAway,
                    video: !dataStatus.video,
                    summary: !dataStatus.summary,
                    possession: !dataStatus.possession,
                  },
                  processingNotes: [
                    "Used default Korastats-shaped structures for missing endpoints",
                  ],
                });
              }

              progress.completed++;
              console.log(`✅ Synced detailed match ${match.korastats_id}`);
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              console.warn(
                `⚠️ Attempt ${retryCount}/${maxRetries} failed for detailed match ${match.korastats_id}: ${error.message}`,
              );

              if (retryCount >= maxRetries) {
                console.error(
                  `❌ Failed to sync detailed match ${match.korastats_id} after ${maxRetries} attempts:`,
                  error.message,
                );
                progress.failed++;
                progress.errors.push(
                  `Detailed match ${match.korastats_id}: ${error.message}`,
                );

                // If it's a network error, add extra delay before next match
                if (
                  error.message.includes("socket hang up") ||
                  error.message.includes("timeout")
                ) {
                  console.log(`⏳ Adding extra delay due to network error...`);
                  await new Promise((resolve) => setTimeout(resolve, 5000));
                }
              } else {
                // Wait before retry with exponential backoff
                const retryDelay = delayBetweenRequests * Math.pow(2, retryCount - 1);
                console.log(`⏳ Retrying in ${retryDelay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              }
            }
          }
        });

        await Promise.allSettled(batchPromises);

        if (i + batchSize < basicMatches.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      progress.endTime = new Date();
      progress.current = `Detailed match sync completed: ${progress.completed}/${progress.total}`;

      console.log(`✅ Detailed match sync completed:`, {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        duration: progress.endTime.getTime() - progress.startTime.getTime(),
      });

      // Print reports
      try {
        const insufficientCount = this.summaryReport.length;
        console.log("\n📊 Summary Report (insufficient-data matches)");
        console.log(
          `Checked: ${progress.total}, Insufficient: ${insufficientCount}, Sufficient: ${progress.total - insufficientCount}`,
        );
        if (insufficientCount > 0) {
          console.table(
            this.summaryReport.map((m) => ({
              matchId: m.matchId,
              tournamentId: m.tournamentId,
              tournamentName: m.tournamentName,
              season: m.season,
              matchName: m.matchName,
              timeline: m.dataStatus.timeline,
              squad: m.dataStatus.squad,
              playerStats: m.dataStatus.playerStats,
              summary: m.dataStatus.summary,
              possession: m.dataStatus.possession,
            })),
          );
        }

        console.log("\n🧾 Detailed Report (insufficient-data matches)");
        if (this.detailedReport.length > 0) {
          console.log(JSON.stringify({ matches: this.detailedReport }, null, 2));
        }
      } catch (e) {
        console.warn("⚠️ Failed to print reports:", (e as Error).message);
      }

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Detailed match sync failed: ${error.message}`;
      progress.errors.push(error.message);
      console.error("❌ Detailed match sync failed:", error);
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

  /**
   * Comprehensive match sync: Ensure both basic and detailed matches are complete
   * Step 1: Sync missing basic matches from Korastats + old basic matches
   * Step 2: Sync missing detailed matches + old detailed matches
   */
  async syncMatchesComprehensive(
    cutoffDate: Date = new Date("2025-10-04T14:25:00Z"),
  ): Promise<MatchSyncProgress> {
    const progress: MatchSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting comprehensive match sync...",
      errors: [],
      startTime: new Date(),
    };

    try {
      console.log(
        `🔍 Starting comprehensive match sync (cutoff: ${cutoffDate.toISOString()})...`,
      );
      /*
      // STEP 1: Sync Basic Matches
      console.log("\n📊 STEP 1: Syncing Basic Matches");
      const missingBasicMatches = await this.findMissingBasicMatches();
      console.log(
        `🔍 Found ${missingBasicMatches.length} missing basic matches from Korastats`,
      );
      const oldBasicMatches = await this.findOldBasicMatches(cutoffDate);
      console.log(`🔍 Found ${oldBasicMatches.length} old basic matches (before cutoff)`);

      const allBasicMatchesToSync = [...missingBasicMatches, ...oldBasicMatches];
      const uniqueBasicMatches = Array.from(
        new Map(
          allBasicMatchesToSync.map((match) => [match.korastats_id, match]),
        ).values(),
      );
      console.log(
        `📦 Syncing ${uniqueBasicMatches.length} basic matches (limited to 3 for testing)...`,
      );
      await this.syncBasicMatchesBatch(uniqueBasicMatches, progress);
*/
      // STEP 2: Sync Detailed Matches
      console.log("\n📊 STEP 2: Syncing Detailed Matches");

      const missingDetailedMatches = await this.findMissingDetailedMatches();
      console.log(
        `🔍 Found ${missingDetailedMatches.length} basic matches missing detailed data`,
      );
      const oldDetailedMatches = await this.findOldDetailedMatches(cutoffDate);
      console.log(
        `🔍 Found ${oldDetailedMatches.length} old detailed matches (before cutoff)`,
      );

      const allDetailedMatchesToSync = [...missingDetailedMatches, ...oldDetailedMatches];
      const uniqueDetailedMatches = Array.from(
        new Map(
          allDetailedMatchesToSync.map((match) => [match.korastats_id, match]),
        ).values(),
      );

      // TESTING LIMIT: Only process first 3 matches
      //const limitedDetailedMatches = uniqueDetailedMatches.slice(0, 3);

      console.log(
        `📦 Syncing ${uniqueDetailedMatches.length} detailed matches (limited to 3 for testing)...`,
      );
      await this.syncDetailedMatchesBatch(uniqueDetailedMatches, progress);

      progress.endTime = new Date();
      progress.current = `Comprehensive match sync completed: ${progress.completed}/${progress.total}`;

      console.log(`✅ Comprehensive match sync completed:`, {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        duration: progress.endTime.getTime() - progress.startTime.getTime(),
      });

      // Print reports
      try {
        const insufficientCount = this.summaryReport.length;
        console.log("\n📊 Summary Report (insufficient-data matches)");
        console.log(
          `Checked: ${progress.total}, Insufficient: ${insufficientCount}, Sufficient: ${progress.total - insufficientCount}`,
        );
        if (insufficientCount > 0) {
          console.table(
            this.summaryReport.map((m) => ({
              matchId: m.matchId,
              tournamentId: m.tournamentId,
              tournamentName: m.tournamentName,
              season: m.season,
              matchName: m.matchName,
              timeline: m.dataStatus.timeline,
              squad: m.dataStatus.squad,
              playerStats: m.dataStatus.playerStats,
              summary: m.dataStatus.summary,
              possession: m.dataStatus.possession,
            })),
          );
        }

        console.log("\n🧾 Detailed Report (insufficient-data matches)");
        if (this.detailedReport.length > 0) {
          console.log(JSON.stringify({ matches: this.detailedReport }, null, 2));
        }
      } catch (e) {
        console.warn("⚠️ Failed to print reports:", (e as Error).message);
      }

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Comprehensive match sync failed: ${error.message}`;
      progress.errors.push(error.message);
      console.error("❌ Comprehensive match sync failed:", error);
      throw error;
    }
  }

  /**
   * Find missing basic matches from Korastats
   */
  private async findMissingBasicMatches(): Promise<any[]> {
    try {
      // Get all tournaments
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        return [];
      }

      const missingMatches = [];

      for (const tournament of tournamentList.data) {
        // Check both tournament IDs (840 and 1441) since Korastats treats them as different tournaments
        const tournamentIdsToCheck =
          tournament.id === 840 ? [840, 1441] : [tournament.id];

        for (const tournamentId of tournamentIdsToCheck) {
          const matchListResponse =
            await this.korastatsService.getTournamentMatchList(tournamentId);

          if (matchListResponse.result === "Success" && matchListResponse.data) {
            for (const matchListItem of matchListResponse.data) {
              const existingMatch = await Models.Match.findOne({
                korastats_id: matchListItem.matchId,
              });
              if (!existingMatch) {
                missingMatches.push({
                  korastats_id: matchListItem.matchId,
                  tournament_id: tournamentId,
                  matchListItem: matchListItem,
                  tournament: tournament,
                });
              }
            }
          }
        }
      }

      return missingMatches;
    } catch (error) {
      console.error(`❌ Failed to find missing basic matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Find old basic matches (updated before cutoff date)
   */
  private async findOldBasicMatches(cutoffDate: Date): Promise<any[]> {
    try {
      const oldMatches = await Models.Match.find({
        lastSynced: { $lt: cutoffDate },
      })
        .select("korastats_id tournament_id lastSynced")
        .lean();

      console.log(
        `🔍 Found ${oldMatches.length} old basic matches (lastSynced < ${cutoffDate.toISOString()})`,
      );
      if (oldMatches.length > 0) {
        console.log(
          `📋 Examples of old matches:`,
          oldMatches.slice(0, 3).map((m) => ({
            korastats_id: m.korastats_id,
            lastSynced: m.lastSynced,
            lastSyncedISO: m.lastSynced?.toISOString(),
          })),
        );
      }
      return oldMatches.map((match) => ({
        korastats_id: match.korastats_id,
        tournament_id: match.tournament_id,
        isUpdate: true,
      }));
    } catch (error) {
      console.error(`❌ Failed to find old basic matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Find basic matches missing detailed data
   */
  private async findMissingDetailedMatches(): Promise<any[]> {
    try {
      const basicMatches = await Models.Match.find({})
        .select("korastats_id tournament_id")
        .lean();
      const missingDetailedMatches = [];

      for (const match of basicMatches) {
        const existingDetails = await Models.MatchDetails.findOne({
          korastats_id: match.korastats_id,
        });
        if (!existingDetails) {
          missingDetailedMatches.push({
            korastats_id: match.korastats_id,
            tournament_id: match.tournament_id,
          });
        }
      }

      return missingDetailedMatches;
    } catch (error) {
      console.error(`❌ Failed to find missing detailed matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Find old detailed matches (updated before cutoff date)
   */
  private async findOldDetailedMatches(cutoffDate: Date): Promise<any[]> {
    try {
      const oldDetailedMatches = await Models.MatchDetails.find({
        updatedAt: { $lt: cutoffDate },
      })
        .select("korastats_id")
        .lean();

      const result = [];
      for (const matchDetails of oldDetailedMatches) {
        const basicMatch = await Models.Match.findOne({
          korastats_id: matchDetails.korastats_id,
        })
          .select("tournament_id")
          .lean();
        if (basicMatch) {
          result.push({
            korastats_id: matchDetails.korastats_id,
            tournament_id: basicMatch.tournament_id,
            isUpdate: true,
          });
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to find old detailed matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Sync a batch of basic matches
   */
  private async syncBasicMatchesBatch(
    matches: any[],
    progress: MatchSyncProgress,
  ): Promise<void> {
    const batchSize = 1; // Reduced to 1 to avoid rate limiting
    const delayBetweenBatches = 3000; // Increased delay
    const delayBetweenRequests = 1000; // Delay between individual requests

    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      console.log(
        `📦 Processing basic matches batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)}`,
      );

      const batchPromises = batch.map(async (match) => {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            progress.current = `Syncing basic match ${match.korastats_id} (attempt ${retryCount + 1}/${maxRetries})...`;

            if (match.matchListItem && match.tournament) {
              // New match from Korastats - get standings data with retry
              const stageId = match.tournament.stages[0].id;

              // Add delay before API call
              if (retryCount > 0) {
                await new Promise((resolve) =>
                  setTimeout(resolve, delayBetweenRequests * retryCount),
                );
              }

              const standingsResponse =
                await this.korastatsService.getTournamentGroupStandings(
                  match.tournament_id,
                  stageId,
                );
              const standingsData =
                standingsResponse.result === "Success" ? standingsResponse.data : null;

              console.log(
                `🔧 DEBUG: About to call syncSingleBasicMatch for match ${match.korastats_id}`,
              );
              console.log(`🔧 DEBUG: matchListItem:`, !!match.matchListItem);
              console.log(`🔧 DEBUG: tournament:`, !!match.tournament);
              await this.syncSingleBasicMatch(
                match.matchListItem,
                match.tournament,
                standingsData,
                true,
              );
            } else if (match.isUpdate) {
              console.log(`🔧 DEBUG: Processing update for match ${match.korastats_id}`);
              // Update existing match
              const existingMatch = await Models.Match.findOne({
                korastats_id: match.korastats_id,
              });
              if (existingMatch) {
                console.log(`🔧 DEBUG: Found existing match ${match.korastats_id}`);

                // Check both tournament IDs (840 and 1441) since Korastats treats them as different tournaments
                const tournamentIdsToCheck =
                  match.tournament_id === 840 ? [840, 1441] : [match.tournament_id];
                let matchListItem = null;
                let foundTournamentId = null;

                for (const tournamentId of tournamentIdsToCheck) {
                  console.log(
                    `🔧 DEBUG: Checking tournament ${tournamentId} for match ${match.korastats_id}`,
                  );
                  const matchListResponse =
                    await this.korastatsService.getTournamentMatchList(tournamentId);

                  if (matchListResponse.result === "Success" && matchListResponse.data) {
                    matchListItem = matchListResponse.data.find(
                      (m) => m.matchId === match.korastats_id,
                    );
                    if (matchListItem) {
                      foundTournamentId = tournamentId;
                      console.log(
                        `🔧 DEBUG: Found match ${match.korastats_id} in tournament ${tournamentId}`,
                      );
                      break;
                    }
                  }
                }

                if (matchListItem) {
                  const tournamentResponse =
                    await this.korastatsService.getTournamentStructure(foundTournamentId);
                  console.log(
                    `🔧 DEBUG: Tournament structure response for ${match.korastats_id}:`,
                    tournamentResponse.result,
                  );
                  if (
                    tournamentResponse.result === "Success" &&
                    tournamentResponse.data
                  ) {
                    // Get standings data for the update
                    const stageId = tournamentResponse.data.stages[0].id;
                    const standingsResponse =
                      await this.korastatsService.getTournamentGroupStandings(
                        foundTournamentId,
                        stageId,
                      );
                    const standingsData =
                      standingsResponse.result === "Success"
                        ? standingsResponse.data
                        : null;

                    console.log(
                      `🔧 DEBUG: About to call syncSingleBasicMatch for update ${match.korastats_id}`,
                    );
                    await this.syncSingleBasicMatch(
                      matchListItem,
                      tournamentResponse.data,
                      standingsData,
                      true,
                    );
                  } else {
                    console.warn(
                      `⚠️ Failed to get tournament structure for ${match.tournament_id}, skipping match ${match.korastats_id}`,
                    );
                    progress.completed++; // Count as completed to avoid infinite retry
                  }
                } else {
                  console.warn(`⚠️ MatchListItem not found for ${match.korastats_id}`);
                  progress.completed++; // Count as completed to avoid infinite retry
                }
              } else {
                console.warn(`⚠️ Existing match not found for ${match.korastats_id}`);
                progress.completed++; // Count as completed to avoid infinite retry
              }
            }

            progress.completed++;
            console.log(`✅ Synced basic match ${match.korastats_id}`);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.warn(
              `⚠️ Attempt ${retryCount}/${maxRetries} failed for match ${match.korastats_id}: ${error.message}`,
            );

            if (retryCount >= maxRetries) {
              console.error(
                `❌ Failed to sync basic match ${match.korastats_id} after ${maxRetries} attempts:`,
                error.message,
              );
              progress.failed++;
              progress.errors.push(`Basic match ${match.korastats_id}: ${error.message}`);

              // If it's a network error, add extra delay before next match
              if (
                error.message.includes("socket hang up") ||
                error.message.includes("timeout")
              ) {
                console.log(`⏳ Adding extra delay due to network error...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }
            } else {
              // Wait before retry with exponential backoff
              const retryDelay = delayBetweenRequests * Math.pow(2, retryCount - 1);
              console.log(`⏳ Retrying in ${retryDelay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }
      });

      await Promise.allSettled(batchPromises);

      if (i + batchSize < matches.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }
  }

  /**
   * Check if a match has valid data available from Korastats
   * Returns true if match has sufficient data, false if it should be skipped
   */
  private async checkMatchDataAvailability(matchId: number): Promise<{
    hasValidData: boolean;
    dataStatus: {
      timeline: boolean;
      squad: boolean;
      playerStats: boolean;
      formationHome: boolean;
      formationAway: boolean;
      video: boolean;
      summary: boolean;
      possession: boolean;
    };
    errors: string[];
  }> {
    const dataStatus = {
      timeline: false,
      squad: false,
      playerStats: false,
      formationHome: false,
      formationAway: false,
      video: false,
      summary: false,
      possession: false,
    };
    const errors: string[] = [];

    try {
      // Fetch all required data from multiple Korastats endpoints
      const [
        matchTimelineResponse,
        matchSquadResponse,
        matchPlayerStatsResponse,
        matchFormationHomeResponse,
        matchFormationAwayResponse,
        matchVideoResponse,
        matchSummaryResponse,
        matchPossessionResponse,
      ] = await Promise.allSettled([
        this.korastatsService.getMatchTimeline(matchId),
        this.korastatsService.getMatchSquad(matchId),
        this.korastatsService.getMatchPlayersStats(matchId),
        this.korastatsService.getMatchFormation(matchId, "home"),
        this.korastatsService.getMatchFormation(matchId, "away"),
        this.korastatsService.getMatchVideo(matchId),
        this.korastatsService.getMatchSummary(matchId),
        this.korastatsService.getMatchPossessionTimeline(matchId),
      ]);

      // Check timeline
      if (
        matchTimelineResponse.status === "fulfilled" &&
        matchTimelineResponse.value.result === "Success" &&
        matchTimelineResponse.value.data?.timeline?.length > 0
      ) {
        dataStatus.timeline = true;
      } else {
        errors.push("Timeline: No data or failed");
      }

      // Check squad
      if (
        matchSquadResponse.status === "fulfilled" &&
        matchSquadResponse.value.result === "Success" &&
        matchSquadResponse.value.data?.[0]?.home?.squad?.length > 0 &&
        matchSquadResponse.value.data?.[0]?.away?.squad?.length > 0
      ) {
        dataStatus.squad = true;
      } else {
        if (matchSquadResponse.status === "rejected") {
          errors.push(`Squad: ${matchSquadResponse.reason.message}`);
        } else {
          errors.push("Squad: No data or empty squads");
        }
      }

      // Check player stats
      if (
        matchPlayerStatsResponse.status === "fulfilled" &&
        matchPlayerStatsResponse.value.result === "Success" &&
        matchPlayerStatsResponse.value.data?.players?.length > 0
      ) {
        dataStatus.playerStats = true;
      } else {
        errors.push("PlayerStats: No data or failed");
      }

      // Check formations
      if (
        matchFormationHomeResponse.status === "fulfilled" &&
        matchFormationHomeResponse.value.result === "Success" &&
        matchFormationHomeResponse.value.data?.lineupFormation?.length > 0
      ) {
        dataStatus.formationHome = true;
      } else {
        errors.push("FormationHome: No data or failed");
      }

      if (
        matchFormationAwayResponse.status === "fulfilled" &&
        matchFormationAwayResponse.value.result === "Success" &&
        matchFormationAwayResponse.value.data?.lineupFormation?.length > 0
      ) {
        dataStatus.formationAway = true;
      } else {
        errors.push("FormationAway: No data or failed");
      }

      // Check video
      if (
        matchVideoResponse.status === "fulfilled" &&
        matchVideoResponse.value.result === "Success" &&
        matchVideoResponse.value.data
      ) {
        dataStatus.video = true;
      } else {
        errors.push("Video: No data or failed");
      }

      // Check summary
      if (
        matchSummaryResponse.status === "fulfilled" &&
        matchSummaryResponse.value.result === "Success" &&
        matchSummaryResponse.value.data
      ) {
        const summary = matchSummaryResponse.value.data;
        // Check correct structure: home.team.id/name and away.team.id/name
        if (
          summary.home?.team?.id &&
          summary.home?.team?.name &&
          summary.away?.team?.id &&
          summary.away?.team?.name &&
          summary.home?.stats &&
          summary.away?.stats
        ) {
          dataStatus.summary = true;
        } else {
          errors.push("Summary: Teams missing required properties or stats");
        }
      } else {
        errors.push("Summary: No data or failed");
      }

      // Check possession
      if (
        matchPossessionResponse.status === "fulfilled" &&
        matchPossessionResponse.value.result === "Success" &&
        matchPossessionResponse.value.data?.home?.possession?.length > 0 &&
        matchPossessionResponse.value.data?.away?.possession?.length > 0
      ) {
        dataStatus.possession = true;
      } else {
        errors.push("Possession: No data or failed");
      }

      // Determine if match has sufficient data
      // We need at least timeline, squad, and playerStats for a valid match
      const hasValidData =
        dataStatus.timeline && dataStatus.squad && dataStatus.playerStats;

      return { hasValidData, dataStatus, errors };
    } catch (error) {
      errors.push(`General error: ${error.message}`);
      return { hasValidData: false, dataStatus, errors };
    }
  }

  /**
   * Get list of matches with insufficient data
   */
  async getMatchesWithInsufficientData(
    cutoffDate: Date = new Date("2025-10-04T14:25:00Z"),
  ): Promise<{
    insufficientDataMatches: Array<{
      matchId: number;
      tournamentId: number;
      tournamentName: string;
      dataStatus: any;
      errors: string[];
    }>;
    totalChecked: number;
  }> {
    console.log("🔍 Checking matches for data availability...");

    const insufficientDataMatches = [];
    const oldDetailedMatches = await this.findOldDetailedMatches(cutoffDate);
    let totalChecked = 0;

    console.log(`📋 Checking ${oldDetailedMatches.length} old detailed matches...`);

    for (const match of oldDetailedMatches) {
      try {
        totalChecked++;
        console.log(
          `🔍 Checking match ${match.korastats_id} (${totalChecked}/${oldDetailedMatches.length})...`,
        );

        // Get tournament name
        const tournamentList = await this.korastatsService.getTournamentList();
        const tournament = tournamentList.data?.find((t) => t.id === match.tournament_id);
        const tournamentName =
          tournament?.tournament || `Tournament ${match.tournament_id}`;

        // Check data availability
        const { hasValidData, dataStatus, errors } =
          await this.checkMatchDataAvailability(match.korastats_id);

        if (!hasValidData) {
          insufficientDataMatches.push({
            matchId: match.korastats_id,
            tournamentId: match.tournament_id,
            tournamentName,
            dataStatus,
            errors,
          });
          console.log(`❌ Match ${match.korastats_id} has insufficient data:`, {
            tournament: tournamentName,
            errors: errors.slice(0, 3), // Show first 3 errors
          });
        } else {
          console.log(`✅ Match ${match.korastats_id} has sufficient data`);
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Error checking match ${match.korastats_id}:`, error.message);
      }
    }

    console.log(`📊 Data availability check completed:`);
    console.log(`   Total checked: ${totalChecked}`);
    console.log(`   Insufficient data: ${insufficientDataMatches.length}`);
    console.log(`   Sufficient data: ${totalChecked - insufficientDataMatches.length}`);

    return { insufficientDataMatches, totalChecked };
  }

  /**
   * Sync a batch of detailed matches
   */
  private async syncDetailedMatchesBatch(
    matches: any[],
    progress: MatchSyncProgress,
  ): Promise<void> {
    const batchSize = 1; // Reduced to 1 to avoid rate limiting
    const delayBetweenBatches = 3000;
    const delayBetweenRequests = 1000;
    const matchesInsufficientData: {
      matchId: number;
      tournamentId: number;
      tournamentName: string;
      dataStatus: any;
      errors: string[];
    }[] = [];
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      console.log(
        `📦 Processing detailed matches batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)}`,
      );

      const batchPromises = batch.map(async (match) => {
        const maxRetries = 2;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            progress.current = `Syncing detailed match ${match.korastats_id} (attempt ${retryCount + 1}/${maxRetries})...`;

            // Check if match has sufficient data before attempting sync
            const availability = await this.checkMatchDataAvailability(
              match.korastats_id,
            );
            const { hasValidData, dataStatus, errors } = availability;

            // Proceed even if invalid; we'll use defaults in mapper via flag
            const dataAvailableFlag = !!hasValidData;

            // Add delay before API call
            if (retryCount > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, delayBetweenRequests * retryCount),
              );
            }

            await this.syncSingleDetailedMatch(
              match.korastats_id,
              match.tournament_id,
              true,
              dataAvailableFlag,
            );

            // Build reports entry for insufficient data
            if (!dataAvailableFlag) {
              const matchBasic = await Models.Match.findOne({
                korastats_id: match.korastats_id,
              });
              const tournamentName =
                matchBasic?.league?.name || `Tournament ${match.tournament_id}`;
              const season = matchBasic?.league?.season || 0; // optional to resolve
              const matchName = `${matchBasic?.teams?.home?.name || "Home"} vs ${matchBasic?.teams?.away?.name || "Away"}`;
              this.summaryReport.push({
                matchId: match.korastats_id,
                tournamentId: match.tournament_id,
                tournamentName,
                season: season.toString(),
                matchName,
                dataStatus,
              });
              this.detailedReport.push({
                matchId: match.korastats_id,
                tournamentId: match.tournament_id,
                tournamentName,
                season: season.toString(),
                matchName,
                dataStatus,
                detailedIssues: { errors },
                defaultDataUsed: {
                  timeline: !dataStatus.timeline,
                  squad: !dataStatus.squad,
                  playerStats: !dataStatus.playerStats,
                  formationHome: !dataStatus.formationHome,
                  formationAway: !dataStatus.formationAway,
                  video: !dataStatus.video,
                  summary: !dataStatus.summary,
                  possession: !dataStatus.possession,
                },
                processingNotes: [
                  "Used default Korastats-shaped structures for missing endpoints",
                ],
              });
            }

            progress.completed++;
            console.log(`✅ Synced detailed match ${match.korastats_id}`);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.warn(
              `⚠️ Attempt ${retryCount}/${maxRetries} failed for detailed match ${match.korastats_id}: ${error.message}`,
            );

            if (retryCount >= maxRetries) {
              console.error(
                `❌ Failed to sync detailed match ${match.korastats_id} after ${maxRetries} attempts:`,
                error.message,
              );
              progress.failed++;
              progress.errors.push(
                `Detailed match ${match.korastats_id}: ${error.message}`,
              );

              // If it's a network error, add extra delay before next match
              if (
                error.message.includes("socket hang up") ||
                error.message.includes("timeout")
              ) {
                console.log(`⏳ Adding extra delay due to network error...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }
            } else {
              // Wait before retry with exponential backoff
              const retryDelay = delayBetweenRequests * Math.pow(2, retryCount - 1);
              console.log(`⏳ Retrying in ${retryDelay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }
      });

      await Promise.allSettled(batchPromises);

      if (i + batchSize < matches.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }
    console.log(`📊 Synced ${progress.completed} detailed matches`);
    console.log(`❌ Failed to sync ${progress.failed} detailed matches`);
    console.log(`🔍 Insufficient data matches: ${matchesInsufficientData.length}`);
    console.log(`🔍 Insufficient data matches: ${matchesInsufficientData}`);
  }
}

