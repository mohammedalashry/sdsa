// src/syncer/match-data.service.ts
// Service for collecting comprehensive match data from KoraStats API
// Provides progress tracking and proper error handling

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  KorastatsMatchPlayersStats,
  KorastatsMatchFormation,
  KorastatsMatchTimeline,
  KorastatsMatchSummary,
  KorastatsMatchSquad,
  KorastatsMatchPossessionTimeline,
  KorastatsMatchVideo,
} from "@/integrations/korastats/types/fixture.types";

export interface MatchDataProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export interface MatchDataResult {
  matchId: number;
  success: boolean;
  data?: {
    matchSummary: KorastatsMatchSummary;
    matchSquad: KorastatsMatchSquad;
    matchTimeline: KorastatsMatchTimeline;
    matchFormationHome: KorastatsMatchFormation;
    matchFormationAway: KorastatsMatchFormation;
    matchPlayersStats: KorastatsMatchPlayersStats;
    matchPossessionTimeline: KorastatsMatchPossessionTimeline;
    matchVideo: KorastatsMatchVideo;
  };
  error?: string;
}

export class MatchDataService {
  private korastatsService: KorastatsService;
  private progress: MatchDataProgress;

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
   * Collect comprehensive match data for a single match
   */
  async collectMatchData(matchId: number): Promise<MatchDataResult> {
    try {
      console.log(`🔄 Collecting data for match ${matchId}`);

      // Collect all required data in parallel for better performance
      const [
        matchSummaryResponse,
        matchSquadResponse,
        matchTimelineResponse,
        matchFormationHomeResponse,
        matchFormationAwayResponse,
        matchPlayersStatsResponse,
        matchPossessionTimelineResponse,
        matchVideoResponse,
      ] = await Promise.allSettled([
        this.korastatsService.getMatchSummary(matchId),
        this.korastatsService.getMatchSquad(matchId),
        this.korastatsService.getMatchTimeline(matchId),
        this.korastatsService.getMatchFormation(matchId, "home"),
        this.korastatsService.getMatchFormation(matchId, "away"),
        this.korastatsService.getMatchPlayersStats(matchId),
        this.korastatsService.getMatchPossessionTimeline(matchId),
        this.korastatsService.getMatchVideo(matchId),
      ]);

      // Check if all required data was collected successfully
      const requiredData = [
        { name: "MatchSummary", response: matchSummaryResponse },
        { name: "MatchSquad", response: matchSquadResponse },
        { name: "MatchTimeline", response: matchTimelineResponse },
        { name: "MatchFormationHome", response: matchFormationHomeResponse },
        { name: "MatchFormationAway", response: matchFormationAwayResponse },
        { name: "MatchPlayersStats", response: matchPlayersStatsResponse },
        { name: "MatchPossessionTimeline", response: matchPossessionTimelineResponse },
        { name: "MatchVideo", response: matchVideoResponse },
      ];

      const failedData = requiredData.filter(
        (item) => item.response.status === "rejected" || !item.response.value?.data,
      );

      if (failedData.length > 0) {
        const errorMessage = `Failed to collect: ${failedData.map((item) => item.name).join(", ")}`;
        console.error(`❌ ${errorMessage} for match ${matchId}`);

        return {
          matchId,
          success: false,
          error: errorMessage,
        };
      }

      // Extract data from successful responses
      const squadData = (matchSquadResponse as PromiseFulfilledResult<any>).value.data;
      const data = {
        matchSummary: (matchSummaryResponse as PromiseFulfilledResult<any>).value.data,
        matchSquad: Array.isArray(squadData) ? squadData[0] : squadData, // Squad data is in array format
        matchTimeline: (matchTimelineResponse as PromiseFulfilledResult<any>).value.data,
        matchFormationHome: (matchFormationHomeResponse as PromiseFulfilledResult<any>)
          .value.data,
        matchFormationAway: (matchFormationAwayResponse as PromiseFulfilledResult<any>)
          .value.data,
        matchPlayersStats: (matchPlayersStatsResponse as PromiseFulfilledResult<any>)
          .value.data,
        matchPossessionTimeline: (
          matchPossessionTimelineResponse as PromiseFulfilledResult<any>
        ).value.data,
        matchVideo: (matchVideoResponse as PromiseFulfilledResult<any>).value.data,
      };

      console.log(`✅ Successfully collected data for match ${matchId}`);

      return {
        matchId,
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage = `Unexpected error collecting data for match ${matchId}: ${error.message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        matchId,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Collect match data for multiple matches with progress tracking
   */
  async collectMatchesData(
    matchIds: number[],
    onProgress?: (progress: MatchDataProgress) => void,
  ): Promise<MatchDataResult[]> {
    this.resetProgress();
    this.progress.total = matchIds.length;
    this.progress.current = `Collecting data for ${matchIds.length} matches...`;

    const results: MatchDataResult[] = [];

    // Process matches in batches to avoid overwhelming the API
    const batchSize = 5;
    const delayBetweenBatches = 1000; // 1 second delay

    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);

      this.progress.current = `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchIds.length / batchSize)}...`;

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (matchId) => {
          const result = await this.collectMatchData(matchId);

          if (result.success) {
            this.progress.completed++;
          } else {
            this.progress.failed++;
            this.progress.errors.push(`Match ${matchId}: ${result.error}`);
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
      if (i + batchSize < matchIds.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.progress.endTime = new Date();
    this.progress.current = `Completed collecting data for ${matchIds.length} matches. ${this.progress.completed} successful, ${this.progress.failed} failed.`;

    console.log(`✅ Match data collection completed:`, {
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
  getProgress(): MatchDataProgress {
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

