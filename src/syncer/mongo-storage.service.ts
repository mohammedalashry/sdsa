// src/syncer/mongo-storage.service.ts
// Service for storing mapped data in MongoDB with proper error handling

import { Models } from "../db/mogodb/models";
import { FixtureNew } from "../mapper/fixtureNew";
import { TournamentData } from "../mapper/leagueNew";
import { MatchInterface, LeagueInterface } from "../db/mogodb/schemas";

export interface StorageProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface StorageResult {
  matchId: number;
  success: boolean;
  operation: "created" | "updated" | "failed";
  error?: string;
}

export class MongoStorageService {
  private progress: StorageProgress;

  constructor() {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Initializing...",
      startTime: new Date(),
      errors: [],
    };
  }

  /**
   * Store a single match in MongoDB
   */
  async storeMatch(matchData): Promise<StorageResult> {
    try {
      console.log(`💾 Storing match ${matchData.korastats_id} in MongoDB`);

      // Check if match already exists
      const existingMatch = await Models.Match.findOne({
        korastats_id: matchData.korastats_id,
      });

      let operation: "created" | "updated";
      let storedMatch: MatchInterface;

      if (existingMatch) {
        // Update existing match
        storedMatch = (await Models.Match.findOneAndUpdate(
          { korastats_id: matchData.korastats_id },
          {
            ...matchData,
            updatedAt: new Date(),
            syncVersion: existingMatch.syncVersion + 1,
          },
          { new: true },
        )) as MatchInterface;
        operation = "updated";
        console.log(`✅ Updated match ${matchData.korastats_id} in MongoDB`);
      } else {
        // Create new match
        storedMatch = (await Models.Match.create({
          ...matchData,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncVersion: 1,
        })) as MatchInterface;
        operation = "created";
        console.log(`✅ Created match ${matchData.korastats_id} in MongoDB`);
      }

      return {
        matchId: matchData.korastats_id,
        success: true,
        operation,
      };
    } catch (error) {
      const errorMessage = `Failed to store match ${matchData.korastats_id}: ${error.message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        matchId: matchData.korastats_id,
        success: false,
        operation: "failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Store multiple matches in MongoDB with progress tracking
   */
  async storeMatches(
    matchesData: [],
    onProgress?: (progress: StorageProgress) => void,
  ): Promise<StorageResult[]> {
    this.resetProgress();
    this.progress.total = matchesData.length;
    this.progress.current = `Storing ${matchesData.length} matches in MongoDB...`;

    const results: StorageResult[] = [];

    // Process matches in batches to avoid overwhelming MongoDB
    const batchSize = 10;
    const delayBetweenBatches = 500; // 500ms delay

    for (let i = 0; i < matchesData.length; i += batchSize) {
      const batch = matchesData.slice(i, i + batchSize);

      this.progress.current = `Storing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchesData.length / batchSize)}...`;

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (matchData) => {
          const result = await this.storeMatch(matchData);

          if (result.success) {
            this.progress.completed++;
          } else {
            this.progress.failed++;
            this.progress.errors.push(`Match ${result.matchId}: ${result.error}`);
          }

          // Update progress callback
          if (onProgress) {
            onProgress({ ...this.progress });
          }

          return result;
        }),
      );

      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < matchesData.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.progress.endTime = new Date();
    this.progress.current = `Completed storing ${matchesData.length} matches. ${this.progress.completed} successful, ${this.progress.failed} failed.`;

    console.log(`✅ MongoDB storage completed:`, {
      total: this.progress.total,
      completed: this.progress.completed,
      failed: this.progress.failed,
      duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
    });

    return results;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalMatches: number;
    lastSync: Date | null;
    syncVersions: { [key: number]: number };
  }> {
    try {
      const totalMatches = await Models.Match.countDocuments();

      const lastSyncMatch = await Models.Match.findOne()
        .sort({ lastSynced: -1 })
        .select("lastSynced");

      const syncVersions = await Models.Match.aggregate([
        {
          $group: {
            _id: "$syncVersion",
            count: { $sum: 1 },
          },
        },
      ]);

      const syncVersionsMap = syncVersions.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as { [key: number]: number },
      );

      return {
        totalMatches,
        lastSync: lastSyncMatch?.lastSynced || null,
        syncVersions: syncVersionsMap,
      };
    } catch (error) {
      console.error("❌ Failed to get storage stats:", error);
      throw error;
    }
  }

  /**
   * Clean up old matches (optional utility)
   */
  async cleanupOldMatches(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Models.Match.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      console.log(
        `🧹 Cleaned up ${result.deletedCount} matches older than ${olderThanDays} days`,
      );
      return result.deletedCount;
    } catch (error) {
      console.error("❌ Failed to cleanup old matches:", error);
      throw error;
    }
  }

  /**
   * Store a single tournament in MongoDB
   */
  async storeTournament(tournamentData: TournamentData): Promise<StorageResult> {
    try {
      console.log(`💾 Storing tournament ${tournamentData.korastats_id} in MongoDB`);

      // Check if tournament already exists
      const existingTournament = await Models.League.findOne({
        korastats_id: tournamentData.korastats_id,
      });

      let operation: "created" | "updated";
      let storedTournament: LeagueInterface;

      if (existingTournament) {
        // Update existing tournament
        storedTournament = (await Models.League.findOneAndUpdate(
          { korastats_id: tournamentData.korastats_id },
          {
            ...tournamentData,
            updated_at: new Date(),
            sync_version: existingTournament.sync_version + 1,
          },
          { new: true },
        )) as LeagueInterface;
        operation = "updated";
        console.log(`✅ Updated tournament ${tournamentData.korastats_id} in MongoDB`);
      } else {
        // Create new tournament
        storedTournament = (await Models.League.create({
          ...tournamentData,
          created_at: new Date(),
          updated_at: new Date(),
          sync_version: 1,
        })) as LeagueInterface;
        operation = "created";
        console.log(`✅ Created tournament ${tournamentData.korastats_id} in MongoDB`);
      }

      return {
        matchId: tournamentData.korastats_id, // Reusing matchId field for tournament ID
        success: true,
        operation,
      };
    } catch (error) {
      const errorMessage = `Failed to store tournament ${tournamentData.korastats_id}: ${error.message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        matchId: tournamentData.korastats_id,
        success: false,
        operation: "failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Store multiple tournaments in MongoDB with progress tracking
   */
  async storeTournaments(
    tournamentsData: TournamentData[],
    onProgress?: (progress: StorageProgress) => void,
  ): Promise<StorageResult[]> {
    this.resetProgress();
    this.progress.total = tournamentsData.length;
    this.progress.current = `Storing ${tournamentsData.length} tournaments in MongoDB...`;

    const results: StorageResult[] = [];

    // Process tournaments in batches to avoid overwhelming MongoDB
    const batchSize = 5; // Smaller batches for tournaments
    const delayBetweenBatches = 1000; // 1 second delay

    for (let i = 0; i < tournamentsData.length; i += batchSize) {
      const batch = tournamentsData.slice(i, i + batchSize);

      this.progress.current = `Storing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tournamentsData.length / batchSize)}...`;

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (tournamentData) => {
          const result = await this.storeTournament(tournamentData);

          if (result.success) {
            this.progress.completed++;
          } else {
            this.progress.failed++;
            this.progress.errors.push(`Tournament ${result.matchId}: ${result.error}`);
          }

          // Update progress callback
          if (onProgress) {
            onProgress({ ...this.progress });
          }

          return result;
        }),
      );

      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < tournamentsData.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.progress.endTime = new Date();
    this.progress.current = `Completed storing ${tournamentsData.length} tournaments. ${this.progress.completed} successful, ${this.progress.failed} failed.`;

    console.log(`✅ MongoDB tournament storage completed:`, {
      total: this.progress.total,
      completed: this.progress.completed,
      failed: this.progress.failed,
      duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
    });

    return results;
  }

  /**
   * Get current progress
   */
  getProgress(): StorageProgress {
    return { ...this.progress };
  }

  /**
   * Reset progress tracking
   */
  private resetProgress(): void {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Initializing...",
      startTime: new Date(),
      errors: [],
    };
  }
}

