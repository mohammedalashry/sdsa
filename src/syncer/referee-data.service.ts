// src/syncer/referee-data.service.ts
// Service for collecting comprehensive referee data from KoraStats API
// Provides progress tracking, error handling, and integration with main syncer

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { RefereeNew } from "@/mapper/refereeNew";
import { RefereeInterface } from "@/db/mogodb/schemas/referee.schema";
import { ApiError } from "../core/middleware/error.middleware";
import {
  KorastatsEntityRefereeResponse,
  KorastatsTournamentRefereeListResponse,
} from "@/integrations/korastats/types";

export interface RefereeSyncOptions {
  tournamentId: number;
  season?: string;
  limit?: number;
  forceResync?: boolean;
  includeStats?: boolean;
  refereeIds?: number[]; // Sync specific referees
}

export interface RefereeSyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface RefereeDataResult {
  refereeId: number;
  success: boolean;
  data?: RefereeInterface;
  error?: string;
}

export class RefereeDataService {
  private korastatsService: KorastatsService;
  private refereeMapper: RefereeNew;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.refereeMapper = new RefereeNew();
  }

  // ===================================================================
  // MAIN SYNC METHODS
  // ===================================================================

  /**
   * Sync all referees from a tournament with comprehensive data
   * Uses: TournamentRefereeList + EntityReferee → Referee Schema
   */
  async syncTournamentReferees(
    options: RefereeSyncOptions,
  ): Promise<RefereeSyncProgress> {
    const progress: RefereeSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting tournament referee sync...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`⚽ Syncing referees for tournament ${options.tournamentId}...`);

      // Step 1: Get tournament referee list (primary data source)
      progress.current = "Fetching tournament referee list...";
      const refereeListResponse = await this.korastatsService.getTournamentRefereeList(
        options.tournamentId,
      );

      if (
        !refereeListResponse.data ||
        !refereeListResponse.data.referees ||
        refereeListResponse.data.referees.length === 0
      ) {
        console.log(`ℹ️ No referees found for tournament ${options.tournamentId}`);
        progress.endTime = new Date();
        return progress;
      }

      let referees = refereeListResponse.data.referees;

      // Filter by specific referee IDs if provided
      if (options.refereeIds && options.refereeIds.length > 0) {
        referees = referees.filter((referee) => options.refereeIds.includes(referee.id));
        console.log(`📢 Limited to ${options.refereeIds.length} specific referees`);
      }

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        referees = referees.slice(0, options.limit);
        console.log(`📢 Limited to ${options.limit} referees for testing`);
      }

      progress.total = referees.length;

      // Step 2: Process each referee
      for (const [index, referee] of referees.entries()) {
        try {
          progress.current = `Processing referee ${index + 1}/${referees.length}: ${referee.name}`;
          console.log(progress.current);

          await this.syncSingleReferee(
            referee.id,
            options.tournamentId,
            [referee], // Pass as array for mapper compatibility
            options.forceResync,
          );
          progress.completed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(
            `Referee ${referee.id} (${referee.name}): ${error.message}`,
          );
          console.error(`❌ Failed to sync referee ${referee.id}:`, error.message);
        }

        // Add small delay to respect API limits
        if (index < referees.length - 1 && index % 5 === 4) {
          console.log("⏱️ Pausing for API rate limiting...");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay every 5 referees
        }
      }

      progress.current = `Referee sync completed: ${progress.completed}/${progress.total} referees processed`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Referee sync failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Referee sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync specific referees by their IDs
   */
  async syncSpecificReferees(
    refereeIds: number[],
    tournamentId: number,
    forceResync: boolean = false,
  ): Promise<RefereeSyncProgress> {
    return this.syncTournamentReferees({
      tournamentId,
      refereeIds,
      forceResync,
      includeStats: true,
    });
  }

  /**
   * Sync referee career data (historical performance)
   */
  async syncRefereeCareerData(
    refereeId: number,
    forceResync: boolean = false,
  ): Promise<RefereeDataResult> {
    try {
      console.log(`📊 Syncing career data for referee ${refereeId}...`);

      // Check if already exists and not forcing resync
      if (!forceResync) {
        const existing = await Models.Referee.findOne({ korastats_id: refereeId });
        if (existing) {
          console.log(`⭐ Referee ${refereeId} already exists - skipping career sync`);
          return { refereeId, success: true, data: existing };
        }
      }

      // Fetch comprehensive referee data
      const [entityResponse] = await Promise.allSettled([
        this.korastatsService.getEntityReferee(refereeId),
      ]);

      // Extract successful responses
      const entityReferee = this.extractSuccessfulResponse(entityResponse, "entity");

      if (!entityReferee) {
        throw new Error("Failed to get basic referee information");
      }

      // Get tournament data for current season (if available)
      let tournamentReferees = [];
      let currentTournament = 0;
      try {
        currentTournament = await this.getCurrentTournamentId();
        if (currentTournament) {
          const refereeListResponse =
            await this.korastatsService.getTournamentRefereeList(currentTournament);
          if (refereeListResponse.data?.referees) {
            tournamentReferees = refereeListResponse.data.referees.filter(
              (referee) => referee.id === refereeId,
            );
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch tournament data for referee ${refereeId}`);
      }

      // Map to referee interface
      const refereeData = await this.refereeMapper.mapToReferee(
        entityReferee,
        tournamentReferees,
        currentTournament || 0,
      );

      // Store in MongoDB
      const savedReferee = await Models.Referee.findOneAndUpdate(
        { korastats_id: refereeId },
        refereeData,
        { upsert: true, new: true },
      );

      console.log(`✅ Synced career data for referee: ${refereeId}`);
      return { refereeId, success: true, data: savedReferee };
    } catch (error) {
      console.error(
        `❌ Failed to sync career data for referee ${refereeId}:`,
        error.message,
      );
      return { refereeId, success: false, error: error.message };
    }
  }

  /**
   * Update referee statistics for existing referees
   */
  async updateRefereeStatistics(
    tournamentId: number,
    forceUpdate: boolean = false,
  ): Promise<RefereeSyncProgress> {
    const progress: RefereeSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Starting referee statistics update...",
      startTime: new Date(),
      errors: [],
    };

    try {
      console.log(`📊 Updating referee statistics for tournament ${tournamentId}...`);

      // Get all existing referees
      const existingReferees = await Models.Referee.find({}).lean();
      progress.total = existingReferees.length;

      if (existingReferees.length === 0) {
        console.log("ℹ️ No existing referees found to update");
        progress.endTime = new Date();
        return progress;
      }

      // Get fresh tournament statistics
      const refereeListResponse =
        await this.korastatsService.getTournamentRefereeList(tournamentId);

      if (!refereeListResponse.data?.referees) {
        throw new Error("Failed to fetch tournament referee list");
      }

      const statsMap = new Map(
        refereeListResponse.data.referees.map((referee) => [referee.id, referee]),
      );

      // Update each referee's statistics
      for (const [index, referee] of existingReferees.entries()) {
        try {
          progress.current = `Updating referee ${index + 1}/${existingReferees.length}: ${referee.name}`;

          const newStats = statsMap.get(referee.korastats_id);
          if (newStats) {
            // Re-map statistics using the mapper
            const updatedStats = await this.refereeMapper.mapToReferee(
              {
                _type: "REFEREE",
                id: referee.korastats_id,
                fullname: referee.name,
                nationality: { id: 0, name: referee.country.name },
                dob: referee.birthDate,
                age: referee.age?.toString() || "0",
                retired: referee.status === "retired",
                gender: "male",
                image: referee.image || "",
              },
              [newStats],
              tournamentId,
            );

            // Update only statistics-related fields
            await Models.Referee.findOneAndUpdate(
              { korastats_id: referee.korastats_id },
              {
                career_stats: updatedStats.career_stats,
                matches: updatedStats.matches,
                last_synced: new Date(),
                updated_at: new Date(),
              },
            );

            progress.completed++;
          } else {
            console.log(`⚠️ No new statistics found for referee ${referee.korastats_id}`);
            progress.completed++;
          }
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Referee ${referee.korastats_id}: ${error.message}`);
          console.error(
            `❌ Failed to update referee ${referee.korastats_id}:`,
            error.message,
          );
        }
      }

      progress.current = `Statistics update completed: ${progress.completed}/${progress.total} referees updated`;
      progress.endTime = new Date();
      console.log(`✅ ${progress.current}`);

      return progress;
    } catch (error) {
      progress.current = `Statistics update failed: ${error.message}`;
      progress.endTime = new Date();
      progress.errors.push(error.message);
      console.error("❌ Referee statistics update failed:", error);
      throw error;
    }
  }

  // ===================================================================
  // SINGLE REFEREE SYNC METHODS
  // ===================================================================

  /**
   * Sync single referee with comprehensive data
   */
  private async syncSingleReferee(
    refereeId: number,
    tournamentId: number,
    tournamentReferees: any[],
    forceResync: boolean = false,
  ): Promise<void> {
    // Check if already exists and not forcing resync
    if (!forceResync) {
      const existing = await Models.Referee.findOne({ korastats_id: refereeId });
      if (existing) {
        console.log(`⭐ Skipping referee ${refereeId} - already exists`);
        return;
      }
    }

    try {
      // Fetch additional referee data in parallel
      const [entityResponse] = await Promise.allSettled([
        this.korastatsService.getEntityReferee(refereeId),
      ]);

      // Extract successful responses
      const entityReferee = this.extractSuccessfulResponse(entityResponse, "entity");

      if (!entityReferee) {
        throw new Error(
          "Failed to get basic referee information from EntityReferee endpoint",
        );
      }

      console.log(`📊 Referee ${refereeId} data availability:`, {
        entity: !!entityReferee,
        tournamentStats: tournamentReferees.length > 0,
      });

      // Use mapper to create comprehensive referee data
      const refereeData = await this.refereeMapper.mapToReferee(
        entityReferee,
        tournamentReferees,
        tournamentId,
      );

      // Store in MongoDB
      await Models.Referee.findOneAndUpdate({ korastats_id: refereeId }, refereeData, {
        upsert: true,
        new: true,
      });

      console.log(`✅ Synced referee data: ${refereeId} (${entityReferee.fullname})`);
    } catch (error) {
      console.error(`❌ Failed to sync referee ${refereeId}:`, error.message);
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
      console.warn(`⚠️ Failed to fetch referee ${dataType}:`, result.reason?.message);
    } else if (result.status === "fulfilled") {
      console.warn(`⚠️ No referee ${dataType} data available:`, result.value?.message);
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
   * Get sync status for referees in a tournament
   */
  async getRefereeSyncStatus(tournamentId: number): Promise<{
    totalReferees: number;
    syncedReferees: number;
    lastSync: Date | null;
    refereesWithStats: number;
  }> {
    try {
      const [totalFromTournament, syncedReferees, refereesWithStats, lastSyncReferee] =
        await Promise.all([
          // Get total referees from tournament
          this.korastatsService
            .getTournamentRefereeList(tournamentId)
            .then((response) => response.data?.referees?.length || 0)
            .catch(() => 0),

          // Count synced referees in database
          Models.Referee.countDocuments({}),

          // Count referees with statistics
          Models.Referee.countDocuments({ "career_stats.0": { $exists: true } }),

          // Get last synced referee
          Models.Referee.findOne({}, {}, { sort: { last_synced: -1 } }),
        ]);

      return {
        totalReferees: totalFromTournament,
        syncedReferees,
        lastSync: lastSyncReferee?.last_synced || null,
        refereesWithStats,
      };
    } catch (error) {
      console.error("Failed to get referee sync status:", error);
      return {
        totalReferees: 0,
        syncedReferees: 0,
        lastSync: null,
        refereesWithStats: 0,
      };
    }
  }

  /**
   * Clear all referee data (for re-sync)
   */
  async clearAllReferees(): Promise<void> {
    try {
      await Models.Referee.deleteMany({});
      console.log(`🗑️ Cleared all referee data`);
    } catch (error) {
      console.error("Failed to clear referee data:", error);
      throw error;
    }
  }

  /**
   * Sync missing referees from tournament
   */
  async syncMissingReferees(tournamentId: number): Promise<RefereeSyncProgress> {
    try {
      console.log(`🔍 Finding missing referees for tournament ${tournamentId}...`);

      // Get all tournament referees
      const refereeListResponse =
        await this.korastatsService.getTournamentRefereeList(tournamentId);

      if (!refereeListResponse.data?.referees) {
        throw new Error("Failed to fetch tournament referee list");
      }

      // Get existing referee IDs
      const existingRefereeIds = await Models.Referee.distinct("korastats_id");
      const existingSet = new Set(existingRefereeIds);

      // Find missing referees
      const missingReferees = refereeListResponse.data.referees.filter(
        (referee) => !existingSet.has(referee.id),
      );

      console.log(
        `📊 Found ${missingReferees.length} missing referees out of ${refereeListResponse.data.referees.length} total`,
      );

      if (missingReferees.length === 0) {
        return {
          total: 0,
          completed: 0,
          failed: 0,
          current: "No missing referees found",
          startTime: new Date(),
          endTime: new Date(),
          errors: [],
        };
      }

      // Sync missing referees
      return this.syncTournamentReferees({
        tournamentId,
        refereeIds: missingReferees.map((r) => r.id),
        forceResync: false,
        includeStats: true,
      });
    } catch (error) {
      console.error("❌ Failed to sync missing referees:", error);
      throw error;
    }
  }
}

