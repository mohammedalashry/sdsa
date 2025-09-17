// src/syncer/tournament-data.service.ts
// Service for collecting comprehensive tournament data from KoraStats API
// Provides progress tracking and proper error handling

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  KorastatsTournamentListResponse,
  KorastatsTournamentStructureResponse,
  KorastatsTournamentTeamListResponse,
  KorastatsTournamentCoachListResponse,
  KorastatsTournamentRefereeListResponse,
} from "@/integrations/korastats/types";

export interface TournamentDataProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface TournamentDataResult {
  tournamentId: number;
  success: boolean;
  data?: {
    tournamentList: any;
    tournamentStructure: any;
    matchList: any[];
    listStatTypes: any[];
  };
  error?: string;
}

export class TournamentDataService {
  private korastatsService: KorastatsService;
  private progress: TournamentDataProgress;

  constructor() {
    this.korastatsService = new KorastatsService();
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
   * Collect comprehensive tournament data for a single tournament
   */
  async collectTournamentData(tournamentId: number): Promise<TournamentDataResult> {
    try {
      console.log(`🔄 Collecting data for tournament ${tournamentId}`);

      // Collect only required data in parallel for better performance
      const [tournamentStructureResponse, matchListResponse, listStatTypesResponse] =
        await Promise.allSettled([
          this.korastatsService.getTournamentStructure(tournamentId),
          this.korastatsService.getTournamentMatchList(tournamentId),
          this.korastatsService.getListStatTypes({} as any), // StatType parameter is not used in the method
        ]);

      // Check if all required data was collected successfully
      const requiredData = [
        { name: "TournamentStructure", response: tournamentStructureResponse },
        { name: "MatchList", response: matchListResponse },
        { name: "ListStatTypes", response: listStatTypesResponse },
      ];
      //console.log("matchListResponse", matchListResponse);
      const failedData = requiredData.filter(
        (item) => item.response.status === "rejected" || !item.response.value?.data,
      );
      console.log("failedData", failedData);  
      if (failedData.length > 0) {
        const errorMessage = `Failed to collect: ${failedData.map((item) => item.name).join(", ")}`;
        console.error(`❌ ${errorMessage} for tournament ${tournamentId}`);

        return {
          tournamentId,
          success: false,
          error: errorMessage,
        };
      }

      // Extract data from successful responses
      const data = {
        tournamentList: null, // Will be provided by the calling method
        tournamentStructure: (tournamentStructureResponse as PromiseFulfilledResult<any>)
          .value.data,
        matchList: (matchListResponse as PromiseFulfilledResult<any>).value.data || [],
        listStatTypes:
          (listStatTypesResponse as PromiseFulfilledResult<any>).value.data || [],
      };

      console.log(`✅ Successfully collected data for tournament ${tournamentId}`);

      return {
        tournamentId,
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage = `Unexpected error collecting data for tournament ${tournamentId}: ${error.message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        tournamentId,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Collect tournament data for multiple tournaments with progress tracking
   */
  async collectTournamentsData(
    tournamentIds: number[],
    onProgress?: (progress: TournamentDataProgress) => void,
  ): Promise<TournamentDataResult[]> {
    this.resetProgress();
    this.progress.total = tournamentIds.length;
    this.progress.current = `Collecting data for ${tournamentIds.length} tournaments...`;

    const results: TournamentDataResult[] = [];

    // Process tournaments in batches to avoid overwhelming the API
    const batchSize = 3; // Smaller batches for tournaments due to complexity
    const delayBetweenBatches = 2000; // 2 second delay

    for (let i = 0; i < tournamentIds.length; i += batchSize) {
      const batch = tournamentIds.slice(i, i + batchSize);

      this.progress.current = `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tournamentIds.length / batchSize)}...`;

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (tournamentId) => {
          const result = await this.collectTournamentData(tournamentId);

          if (result.success) {
            this.progress.completed++;
          } else {
            this.progress.failed++;
            this.progress.errors.push(`Tournament ${tournamentId}: ${result.error}`);
          }

          // Update progress callback
          if (onProgress) {
            onProgress({ ...this.progress });
          }

          return result;
        }),
      );

      results.push(...batchResults);

      // Add delay between batches to respect API rate limits
      if (i + batchSize < tournamentIds.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.progress.endTime = new Date();
    this.progress.current = `Completed collecting data for ${tournamentIds.length} tournaments. ${this.progress.completed} successful, ${this.progress.failed} failed.`;

    console.log(`✅ Tournament data collection completed:`, {
      total: this.progress.total,
      completed: this.progress.completed,
      failed: this.progress.failed,
      duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
    });

    return results;
  }

  /**
   * Get tournament list from KoraStats
   */
  async getTournamentList(): Promise<any[]> {
    try {
      console.log("🔄 Fetching tournament list from KoraStats...");
      const response = await this.korastatsService.getTournamentList();

      if (response.result === "Success" && response.data) {
        console.log(`✅ Fetched ${response.data.length} tournaments`);
        return response.data;
      } else {
        throw new Error(
          `Failed to fetch tournament list: ${response.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to fetch tournament list:", error);
      throw error;
    }
  }

  /**
   * Get current progress
   */
  getProgress(): TournamentDataProgress {
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

