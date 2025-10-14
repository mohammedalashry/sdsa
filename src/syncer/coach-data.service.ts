// src/syncer/coach-data.service.ts
// Service for collecting comprehensive coach data from KoraStats API
// Provides progress tracking, error handling, and integration with main syncer

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { CoachNew } from "@/mapper/coachNew";
import { CoachInterface } from "@/db/mogodb/schemas/coach.schema";
import { ApiError } from "../core/middleware/error.middleware";
import {
  KorastatsEntityCoachResponse,
  KorastatsTournamentCoachListResponse,
} from "@/integrations/korastats/types";

export interface CoachSyncOptions {
  tournamentId: number;
  season?: string;
  limit?: number;
  forceResync?: boolean;
  includeStats?: boolean;
  includeAnalytics?: boolean;
  coachIds?: number[]; // Sync specific coaches
}

export interface CoachSyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface CoachDataResult {
  coachId: number;
  success: boolean;
  data?: CoachInterface;
  error?: string;
}

export class CoachDataService {
  private korastatsService: KorastatsService;
  private coachMapper: CoachNew;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.coachMapper = new CoachNew();
  }

  // ===================================================================
  // MAIN SYNC METHODS
  // ===================================================================

  /**
   * Sync coaches for ALL tournaments returned by Korastats TournamentList
   * - Iterates tournaments, calls syncTournamentCoaches for each
   * - Merges coach stats by league+season using existing merge logic
   */
  async syncAllTournamentsCoaches(
    limitPerTournament?: number,
  ): Promise<CoachSyncProgress> {
    const aggregate: CoachSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting all-tournaments coach sync...",
      startTime: new Date(),
      errors: [],
    };

    try {
      const tournamentsResp = await this.korastatsService.getTournamentList();
      const tournaments = tournamentsResp?.data || [];
      if (!tournaments.length) {
        console.log("ℹ️ No tournaments found from TournamentList");
        aggregate.endTime = new Date();
        return aggregate;
      }

      // Process tournaments sequentially to avoid API overload
      for (const t of tournaments) {
        const tournamentId = t.id;
        const tName = (t as any)?.tournament || (t as any)?.name || "Unknown";
        console.log(`👔 Syncing coaches for tournament ${tournamentId} (${tName})`);
        const progress = await this.syncTournamentCoaches({
          tournamentId,
          limit: limitPerTournament,
          includeStats: true,
          includeAnalytics: true,
          forceResync: false,
        });

        aggregate.total += progress.total;
        aggregate.completed += progress.completed;
        aggregate.failed += progress.failed;
        aggregate.errors.push(...(progress.errors || []));
      }

      aggregate.current = `All-tournaments coach sync completed: ${aggregate.completed}/${aggregate.total}`;
      aggregate.endTime = new Date();
      console.log(`✅ ${aggregate.current}`);
      return aggregate;
    } catch (error) {
      aggregate.current = `All-tournaments coach sync failed: ${(error as any)?.message}`;
      aggregate.endTime = new Date();
      aggregate.errors.push((error as any)?.message);
      console.error("❌ All-tournaments coach sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync all coaches from a tournament with comprehensive data
   * Uses: TournamentCoachList + EntityCoach → Coach Schema
   */
  async syncTournamentCoaches(options: CoachSyncOptions): Promise<CoachSyncProgress> {
    const progress: CoachSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting tournament coach sync...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`⚽ Syncing coaches for tournament ${options.tournamentId}...`);
      // Step 1: Get tournament coach list (primary data source)
      progress.current = "Fetching tournament coach list...";
      const coachListResponse = await this.korastatsService.getTournamentCoachList(
        options.tournamentId,
      );

      if (!coachListResponse.data || coachListResponse.data.length === 0) {
        console.log(`ℹ️ No coaches found for tournament ${options.tournamentId}`);
        progress.endTime = new Date();
        return progress;
      }

      let coaches = coachListResponse.data;

      // Filter by specific coach IDs if provided
      if (options.coachIds && options.coachIds.length > 0) {
        coaches = coaches.filter((coach) => options.coachIds.includes(coach.id));
        console.log(`📢 Limited to ${options.coachIds.length} specific coaches`);
      }

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        coaches = coaches.slice(0, options.limit);
        console.log(`📢 Limited to ${options.limit} coaches for testing`);
      }

      progress.total = coaches.length;

      // Step 2: Process each coach
      for (const [index, coach] of coaches.entries()) {
        try {
          progress.current = `Processing coach ${index + 1}/${coaches.length}: ${coach.name}`;
          console.log(progress.current);

          await this.syncSingleCoach(
            coach.id,
            options.tournamentId,
            [coach], // Pass as array for mapper compatibility
            options.forceResync,
          );
          progress.completed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Coach ${coach.id} (${coach.name}): ${error.message}`);
          console.error(`❌ Failed to sync coach ${coach.id}:`, error.message);
        }

        // Add small delay to respect API limits
        if (index < coaches.length - 1 && index % 5 === 4) {
          console.log("⏱️ Pausing for API rate limiting...");
          await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay every 5 coaches
        }
      }

      progress.current = `Coach sync completed: ${progress.completed}/${progress.total} coaches processed`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Coach sync failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Coach sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync specific coaches by their IDs
   */
  async syncSpecificCoaches(
    coachIds: number[],
    tournamentId: number,
    forceResync: boolean = false,
  ): Promise<CoachSyncProgress> {
    return this.syncTournamentCoaches({
      tournamentId,
      coachIds,
      forceResync,
      includeStats: true,
      includeAnalytics: true,
    });
  }

  /**
   * Sync coach career data (historical performance)
   */
  async syncCoachCareerData(
    coachId: number,
    forceResync: boolean = false,
  ): Promise<CoachDataResult> {
    try {
      console.log(`📊 Syncing career data for coach ${coachId}...`);

      // Check if already exists and not forcing resync
      if (!forceResync) {
        const existing = await Models.Coach.findOne({ korastats_id: coachId });
        if (existing) {
          console.log(`⭐ Coach ${coachId} already exists - skipping career sync`);
          return { coachId, success: true, data: existing };
        }
      }

      // Fetch comprehensive coach data
      const [entityResponse] = await Promise.allSettled([
        this.korastatsService.getEntityCoach(coachId),
      ]);

      // Extract successful responses
      const entityCoach = (entityResponse as any).root?.object;

      if (!entityCoach) {
        throw new Error("Failed to get basic coach information");
      }

      // Get tournament data for current season (if available)
      let tournamentCoaches = [];
      let currentTournament = 0;
      try {
        currentTournament = await this.getCurrentTournamentId();
        if (currentTournament) {
          const coachListResponse =
            await this.korastatsService.getTournamentCoachList(currentTournament);
          if (coachListResponse.data) {
            tournamentCoaches = coachListResponse.data.filter(
              (coach) => coach.id === coachId,
            );
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch tournament data for coach ${coachId}`);
      }

      // Map to coach interface
      const coachData = await this.coachMapper.mapToCoach(
        entityCoach,
        tournamentCoaches,
        currentTournament || 0,
      );

      // Store in MongoDB (merge stats if exists)
      const existingCoach = await Models.Coach.findOne({ korastats_id: coachId });
      if (existingCoach) {
        await this.mergeCoachStats(existingCoach as unknown as CoachInterface, coachData);
      } else {
        await Models.Coach.findOneAndUpdate({ korastats_id: coachId }, coachData, {
          upsert: true,
          new: true,
        });
      }

      console.log(`✅ Synced career data for coach: ${coachId}`);
      const latest = await Models.Coach.findOne({ korastats_id: coachId });
      return { coachId, success: true, data: latest as unknown as CoachInterface };
    } catch (error) {
      console.error(`❌ Failed to sync career data for coach ${coachId}:`, error.message);
      return { coachId, success: false, error: error.message };
    }
  }

  /**
   * Update coach statistics for existing coaches
   */
  async updateCoachStatistics(
    tournamentId: number,
    forceUpdate: boolean = false,
  ): Promise<CoachSyncProgress> {
    const progress: CoachSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting coach statistics update...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`📊 Updating coach statistics for tournament ${tournamentId}...`);

      // Get all existing coaches
      const existingCoaches = await Models.Coach.find({}).lean();
      progress.total = existingCoaches.length;

      if (existingCoaches.length === 0) {
        console.log("ℹ️ No existing coaches found to update");
        progress.endTime = new Date();
        return progress;
      }

      // Get fresh tournament statistics
      const coachListResponse =
        await this.korastatsService.getTournamentCoachList(tournamentId);

      if (!coachListResponse.data) {
        throw new Error("Failed to fetch tournament coach statistics");
      }

      const statsMap = new Map(coachListResponse.data.map((coach) => [coach.id, coach]));

      // Update each coach's statistics
      for (const [index, coach] of existingCoaches.entries()) {
        try {
          progress.current = `Updating coach ${index + 1}/${existingCoaches.length}: ${coach.name}`;

          const newStats = statsMap.get(coach.korastats_id);
          if (newStats) {
            // Re-map statistics using the mapper
            const updatedStats = await this.coachMapper.mapToCoach(
              {
                _type: "COACH",
                id: coach.korastats_id,
                fullname: coach.name,
                nationality: { id: 0, name: coach.nationality.name },
                dob: coach.birth.date.toISOString(),
                age: coach.age.toString(),
                retired: coach.status === "retired",
                gender: "male",
                image: coach.photo,
                last_updated: new Date().toISOString(),
              },
              [newStats],
              tournamentId,
            );

            // Merge statistics by league+season (do not replace)
            await this.mergeCoachStats(coach as unknown as CoachInterface, updatedStats);

            progress.completed++;
          } else {
            console.log(`⚠️ No new statistics found for coach ${coach.korastats_id}`);
            progress.completed++;
          }
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Coach ${coach.korastats_id}: ${error.message}`);
          console.error(
            `❌ Failed to update coach ${coach.korastats_id}:`,
            error.message,
          );
        }
      }

      progress.current = `Statistics update completed: ${progress.completed}/${progress.total} coaches updated`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Statistics update failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Coach statistics update failed:", error);
      throw error;
    }
  }

  // ===================================================================
  // SINGLE COACH SYNC METHODS
  // ===================================================================

  /**
   * Sync single coach with comprehensive data
   */
  private async syncSingleCoach(
    coachId: number,
    tournamentId: number,
    tournamentCoaches: any[],
    forceResync: boolean = false,
  ): Promise<void> {
    // If exists and not forcing resync, we will merge instead of skipping
    const existingForMerge = await Models.Coach.findOne({ korastats_id: coachId });

    try {
      // Fetch additional coach data in parallel
      const [entityResponse] = await Promise.allSettled([
        this.korastatsService.getEntityCoach(coachId),
      ]);
      console.log("entityResponse MODA", entityResponse);
      // Extract successful responses
      const entityCoach = (entityResponse as any).value.root?.object;

      if (!entityCoach) {
        throw new Error(
          "Failed to get basic coach information from EntityCoach endpoint",
        );
      }

      console.log(`📊 Coach ${coachId} data availability:`, {
        entity: !!entityCoach,
        tournamentStats: tournamentCoaches.length > 0,
      });

      // Use mapper to create comprehensive coach data
      const coachData = await this.coachMapper.mapToCoach(
        entityCoach,
        tournamentCoaches,
        tournamentId,
      );

      // Store in MongoDB (merge if exists)
      if (existingForMerge && !forceResync) {
        await this.mergeCoachStats(
          existingForMerge as unknown as CoachInterface,
          coachData,
        );
      } else {
        await Models.Coach.findOneAndUpdate({ korastats_id: coachId }, coachData, {
          upsert: true,
          new: true,
        });
      }

      console.log(`✅ Synced coach data: ${coachId} (${entityCoach.fullname})`);
    } catch (error) {
      console.error(`❌ Failed to sync coach ${coachId}:`, error.message);
      throw error;
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Merge coach stats ensuring uniqueness by league.id + season
   */
  private async mergeCoachStats(
    existingCoach: CoachInterface,
    newCoachData: CoachInterface,
  ): Promise<void> {
    try {
      const existingStats = existingCoach.stats || [];
      const newStatsArray = newCoachData.stats || [];

      const existingMap = new Map<string, number>();
      existingStats.forEach((stat, idx) => {
        const leagueId = (stat as any)?.league?.id ?? (stat as any)?.league; // schema may be string earlier
        const season = (stat as any)?.league?.season ?? 0;
        const key = `${leagueId}-${season}`;
        existingMap.set(key, idx);
      });

      const merged = [...existingStats];
      for (const ns of newStatsArray) {
        const leagueId = (ns as any)?.league?.id ?? (ns as any)?.league;
        const season = (ns as any)?.league?.season ?? 0;
        const key = `${leagueId}-${season}`;
        if (existingMap.has(key)) {
          const i = existingMap.get(key)!;
          merged[i] = ns;
        } else {
          merged.push(ns);
        }
      }

      // Update combined coach performance if provided on new data
      const coachPerformance =
        newCoachData.coachPerformance || existingCoach.coachPerformance;

      await Models.Coach.findOneAndUpdate(
        { korastats_id: existingCoach.korastats_id },
        {
          stats: merged,
          coachPerformance,
          last_synced: new Date(),
          updated_at: new Date(),
        },
      );
    } catch (error) {
      console.error(
        `❌ Failed merging coach stats for ${existingCoach.korastats_id}:`,
        (error as any)?.message || error,
      );
      throw error;
    }
  }

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
      console.warn(`⚠️ Failed to fetch coach ${dataType}:`, result.reason?.message);
    } else if (result.status === "fulfilled") {
      console.warn(`⚠️ No coach ${dataType} data available:`, result.value?.message);
    }

    return null;
  }

  /**
   * Get current tournament ID (helper method)
   */
  private async getCurrentTournamentId(): Promise<number | null> {
    try {
      const tournamentResponse = await this.korastatsService.getTournamentList();
      if (tournamentResponse.data && tournamentResponse.data.length > 0) {
        // Return the first active tournament
        return tournamentResponse.data[0].id;
      }
    } catch (error) {
      console.warn("Could not determine current tournament ID");
    }
    return null;
  }

  /**
   * Get sync status for coaches in a tournament
   */
  async getCoachSyncStatus(tournamentId: number): Promise<{
    totalCoaches: number;
    syncedCoaches: number;
    lastSync: Date | null;
    coachesWithStats: number;
  }> {
    try {
      const [totalFromTournament, syncedCoaches, coachesWithStats, lastSyncCoach] =
        await Promise.all([
          // Get total coaches from tournament
          this.korastatsService
            .getTournamentCoachList(tournamentId)
            .then((response) => response.data?.length || 0)
            .catch(() => 0),

          // Count synced coaches in database
          Models.Coach.countDocuments({}),

          // Count coaches with statistics
          Models.Coach.countDocuments({ "stats.0": { $exists: true } }),

          // Get last synced coach
          Models.Coach.findOne({}, {}, { sort: { last_synced: -1 } }),
        ]);

      return {
        totalCoaches: totalFromTournament,
        syncedCoaches,
        lastSync: lastSyncCoach?.last_synced || null,
        coachesWithStats,
      };
    } catch (error) {
      console.error("Failed to get coach sync status:", error);
      return {
        totalCoaches: 0,
        syncedCoaches: 0,
        lastSync: null,
        coachesWithStats: 0,
      };
    }
  }

  /**
   * Clear all coach data (for re-sync)
   */
  async clearAllCoaches(): Promise<void> {
    try {
      await Models.Coach.deleteMany({});
      console.log(`🗑️ Cleared all coach data`);
    } catch (error) {
      console.error("Failed to clear coach data:", error);
      throw error;
    }
  }

  /**
   * Sync missing coaches from tournament
   */
  async syncMissingCoaches(tournamentId: number): Promise<CoachSyncProgress> {
    try {
      console.log(`🔍 Finding missing coaches for tournament ${tournamentId}...`);

      // Get all tournament coaches
      const coachListResponse =
        await this.korastatsService.getTournamentCoachList(tournamentId);

      if (!coachListResponse.data) {
        throw new Error("Failed to fetch tournament coach list");
      }

      // Get existing coach IDs
      const existingCoachIds = await Models.Coach.distinct("korastats_id");
      const existingSet = new Set(existingCoachIds);

      // Find missing coaches
      const missingCoaches = coachListResponse.data.filter(
        (coach) => !existingSet.has(coach.id),
      );

      console.log(
        `📊 Found ${missingCoaches.length} missing coaches out of ${coachListResponse.data.length} total`,
      );

      if (missingCoaches.length === 0) {
        return {
          total: 0,
          completed: 0,
          failed: 0,
          current: "No missing coaches found",
          startTime: new Date(),
          endTime: new Date(),
          errors: [],
        };
      }

      // Sync missing coaches
      return this.syncTournamentCoaches({
        tournamentId,
        coachIds: missingCoaches.map((c) => c.id),
        forceResync: false,
        includeStats: true,
        includeAnalytics: true,
      });
    } catch (error) {
      console.error("❌ Failed to sync missing coaches:", error);
      throw error;
    }
  }
}

