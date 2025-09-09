// ============================================================================
// src/integrations/korastats/automation/batch-collector.service.ts
import { KorastatsClient } from "@/integrations/korastats/client";
import { LeagueKorastatsService } from "@/integrations/korastats/services/league.service";
import {
  TournamentData,
  ITournamentData,
} from "@/db/mogodb/schemas/tournament-data.schema";
import { KorastatsMongoService } from "@/db/mogodb/connection";
import { KorastatsMongoStorage } from "./mongo-storage.service";
export class KorastatsBatchCollector {
  private korastatsClient: KorastatsClient;
  private leagueService: LeagueKorastatsService;
  private mongoService: KorastatsMongoService;
  private mongoStorage: KorastatsMongoStorage;

  constructor() {
    this.korastatsClient = new KorastatsClient();
    this.leagueService = new LeagueKorastatsService(this.korastatsClient);
    this.mongoService = new KorastatsMongoService();
    this.mongoStorage = new KorastatsMongoStorage();
  }
  /**
   * Main automation method - run this to collect all data
   */
  async runBatchCollection(): Promise<void> {
    console.log("🚀 Starting KoraStats batch data collection...");

    try {
      // Connect to MongoDB using the same approach as mongo-storage
      await this.mongoStorage.connect();

      // Step 1: Get tournament list
      console.log("📋 Getting tournament list...");
      const tournaments = await this.leagueService.getTournamentsList();

      if (!tournaments || tournaments.length === 0) {
        throw new Error("No tournaments found");
      }

      // Step 2: Take only first 3 tournaments
      /*
      const selectedTournaments = tournaments.slice(0, 3);
      console.log(
        `🎯 Processing ${selectedTournaments.length} tournaments:`,
        selectedTournaments.map((t) => `${t.id}: ${t.tournament}`),
      );
      // Step 3: Process each tournament
      for (const tournament of selectedTournaments) {
        await this.processTournament(tournament);
      }
        */
      // Find tournament with ID 840 for testing
      const testTournament = tournaments.find((t) => t.id === 934);
      if (testTournament) {
        await this.processTournament(testTournament);
      } else {
        console.log("❌ Tournament 840 not found in tournaments list");
        console.log(
          "Available tournaments:",
          tournaments.map((t) => `${t.id}: ${t.tournament}`),
        );
      }
      console.log("✅ Batch collection completed successfully!");

      // Final verification: Check if any data was actually stored
      await this.verifyStoredData();
    } catch (error) {
      console.error("❌ Batch collection failed:", error);
      throw error;
    } finally {
      await this.mongoStorage.disconnect();
    }
  }

  /**
   * Process single tournament - get matches and collect data for each
   */
  private async processTournament(tournament: any): Promise<void> {
    console.log(
      `\n🏟️  Processing tournament: ${tournament.tournament} (ID: ${tournament.id})`,
    );

    try {
      // Step 1: Get tournament match list using client.makeRequest
      console.log(`📅 Getting match list for tournament ${tournament.id}...`);
      const matchList: any = await this.korastatsClient.makeRequest(
        "TournamentMatchList",
        {
          tournament_id: tournament.id,
        },
      );

      if (!matchList?.data) {
        console.warn(`⚠️  No matches found for tournament ${tournament.id}`);
        return;
      }

      console.log(
        `📊 Found ${matchList.data.length} matches for tournament ${tournament.id}`,
      );

      // Step 2: Check existing matches to avoid reprocessing
      const existingTournament = await TournamentData.findOne({
        tournamentId: tournament.id,
      });

      const existingMatchIds = new Set(
        (existingTournament?.matches || []).map((match: any) => match.matchId),
      );

      console.log(`📊 Existing matches in DB: ${existingMatchIds.size}`);
      console.log(`📊 Total matches from API: ${matchList.data.length}`);

      // Step 3: Process only new matches
      const matchesData = [];
      const searchIndex = {
        matchesByDate: new Map<string, number[]>(),
        teamMatches: new Map<number, number[]>(),
        upcomingMatches: [] as number[],
        finishedMatches: [] as number[],
      };

      let processedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < 20; i++) {
        const match = matchList.data[i];

        // Skip if match already exists
        if (existingMatchIds.has(match.matchId)) {
          console.log(
            `⏭️  Skipping existing match ${i + 1}/${matchList.data.length}: ${match.st} (ID: ${match.matchId})`,
          );
          skippedCount++;
          continue;
        }

        console.log(
          `⚽ Processing new match ${i + 1}/${matchList.data.length}: ${match.st} (ID: ${match.matchId})`,
        );

        const matchData = await this.processMatch(match.matchId);
        if (matchData) {
          matchesData.push(matchData);
          this.updateSearchIndex(match, searchIndex);
          processedCount++;
        }

        // Small delay to avoid rate limiting
        await this.delay(300);
      }

      console.log(
        `📊 Processing summary: ${processedCount} new matches processed, ${skippedCount} existing matches skipped`,
      );
      console.log("matchesData", matchesData);

      // Step 4: Store in MongoDB (only if we have new matches or it's a new tournament)
      if (matchesData.length > 0 || !existingTournament) {
        await this.storeTournamentData({
          tournamentId: tournament.id,
          tournamentName: tournament.tournament,
          country: tournament.organizer?.country?.name || "Unknown",
          season: tournament.season,
          batchId: this.generateBatchId(),
          tournamentMatchList: matchList.data,
          matches: matchesData,
          searchIndex,
        });
      } else {
        console.log(`ℹ️  No new matches to store for tournament ${tournament.id}`);
        // Still update the tournament metadata (lastUpdated, etc.)
        await this.updateTournamentMetadata(tournament.id, {
          tournamentName: tournament.tournament,
          country: tournament.organizer?.country?.name || "Unknown",
          season: tournament.season,
          tournamentMatchList: matchList.data,
        });
      }

      console.log(`✅ Tournament ${tournament.id} processing completed!`);
    } catch (error) {
      console.error(`❌ Failed to process tournament ${tournament.id}:`, error);
      // Continue with next tournament instead of failing completely
    }
  }

  /**
   * Process single match - make 3 API calls using client.makeRequest
   */

  /**
   * Update tournament metadata without changing matches
   */
  private async updateTournamentMetadata(
    tournamentId: number,
    metadata: any,
  ): Promise<void> {
    try {
      console.log(`🔄 Updating metadata for tournament ${tournamentId}...`);

      await TournamentData.findOneAndUpdate(
        { tournamentId },
        {
          ...metadata,
          lastUpdated: new Date(),
        },
        { upsert: false }, // Don't create if doesn't exist
      );

      console.log(`✅ Tournament ${tournamentId} metadata updated`);
    } catch (error) {
      console.error(`❌ Failed to update tournament ${tournamentId} metadata:`, error);
      throw error;
    }
  }

  /**
   * Store tournament data in MongoDB with incremental updates
   */
  private async storeTournamentData(data: Partial<ITournamentData>): Promise<void> {
    try {
      console.log(`💾 Storing data for tournament ${data.tournamentId}...`);

      // Ensure we have a connection before using the model
      const connection = await this.mongoService.getConnection();
      console.log(`🔗 MongoDB connection state: ${connection.readyState}`);
      console.log(`🔗 MongoDB database name: ${connection.db?.databaseName}`);

      // Check if tournament already exists
      const existingTournament = await TournamentData.findOne({
        tournamentId: data.tournamentId,
      });

      let finalData = { ...data };

      if (existingTournament && data.matches) {
        console.log(
          `🔄 Tournament ${data.tournamentId} exists, performing incremental update...`,
        );
        console.log(`📊 Existing matches: ${existingTournament.matches?.length || 0}`);
        console.log(`📊 New matches: ${data.matches.length}`);

        // Get existing match IDs to avoid duplicates
        const existingMatchIds = new Set(
          (existingTournament.matches || []).map((match: any) => match.matchId),
        );

        // Filter out matches that already exist
        const newMatches = (data.matches || []).filter(
          (match: any) => !existingMatchIds.has(match.matchId),
        );

        console.log(`📊 New unique matches to add: ${newMatches.length}`);

        if (newMatches.length > 0) {
          // Append new matches to existing ones
          finalData.matches = [...(existingTournament.matches || []), ...newMatches];

          // Update search index by merging with existing
          if (existingTournament.searchIndex && data.searchIndex) {
            finalData.searchIndex = this.mergeSearchIndexes(
              existingTournament.searchIndex,
              data.searchIndex,
            );
          }
        } else {
          console.log(`ℹ️  No new matches to add for tournament ${data.tournamentId}`);
          // No new matches, just update metadata
          finalData = {
            ...data,
            matches: existingTournament.matches,
            searchIndex: existingTournament.searchIndex,
          };
        }
      }

      // Use the TournamentData model with the connected database
      const result = await TournamentData.findOneAndUpdate(
        { tournamentId: data.tournamentId },
        {
          ...finalData,
          lastUpdated: new Date(),
        },
        {
          upsert: true,
          new: true,
        },
      );

      console.log(`✅ Tournament ${data.tournamentId} data stored in MongoDB`);
      console.log(`📊 Stored document ID: ${result._id}`);
      console.log(`📊 Total matches count: ${result.matches?.length || 0}`);

      // Verify the data was actually stored by querying it back
      const verification = await TournamentData.findOne({
        tournamentId: data.tournamentId,
      });
      if (verification) {
        console.log(
          `✅ Verification: Data confirmed in database for tournament ${data.tournamentId}`,
        );
        console.log(`📊 Verified matches count: ${verification.matches?.length || 0}`);
      } else {
        console.error(
          `❌ Verification failed: No data found for tournament ${data.tournamentId}`,
        );
      }
    } catch (error) {
      console.error(`❌ Failed to store tournament ${data.tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Verify that data was actually stored in MongoDB
   */
  private async verifyStoredData(): Promise<void> {
    try {
      console.log("🔍 Verifying stored data...");

      const connection = await this.mongoService.getConnection();
      console.log(`🔗 Connection state during verification: ${connection.readyState}`);

      // Query all tournament data to see what's actually in the database
      const allTournaments = await TournamentData.find({}).limit(5);
      console.log(`📊 Found ${allTournaments.length} tournaments in database`);

      for (const tournament of allTournaments) {
        console.log(
          `📋 Tournament ${tournament.tournamentId}: ${tournament.tournamentName}`,
        );
        console.log(`   - Matches: ${tournament.matches?.length || 0}`);
        console.log(`   - Last Updated: ${tournament.lastUpdated}`);
      }

      if (allTournaments.length === 0) {
        console.error("❌ No tournament data found in database!");
      } else {
        console.log("✅ Data verification completed successfully");
      }
    } catch (error) {
      console.error("❌ Data verification failed:", error);
    }
  }

  /**
   * Merge search indexes from existing and new data
   */
  private mergeSearchIndexes(existingIndex: any, newIndex: any): any {
    const merged = {
      matchesByDate: new Map(existingIndex.matchesByDate || new Map()),
      teamMatches: new Map(existingIndex.teamMatches || new Map()),
      upcomingMatches: [...(existingIndex.upcomingMatches || [])],
      finishedMatches: [...(existingIndex.finishedMatches || [])],
    };

    // Merge matchesByDate
    if (newIndex.matchesByDate && newIndex.matchesByDate instanceof Map) {
      for (const [date, matchIds] of newIndex.matchesByDate) {
        if (!merged.matchesByDate.has(date)) {
          merged.matchesByDate.set(date, []);
        }
        const existingIds = (merged.matchesByDate.get(date) || []) as number[];
        const newIds = (matchIds as number[]).filter(
          (id: number) => !existingIds.includes(id),
        );
        merged.matchesByDate.set(date, [...existingIds, ...newIds]);
      }
    }

    // Merge teamMatches
    if (newIndex.teamMatches && newIndex.teamMatches instanceof Map) {
      for (const [teamId, matchIds] of newIndex.teamMatches) {
        if (!merged.teamMatches.has(teamId)) {
          merged.teamMatches.set(teamId, []);
        }
        const existingIds = (merged.teamMatches.get(teamId) || []) as number[];
        const newIds = (matchIds as number[]).filter(
          (id: number) => !existingIds.includes(id),
        );
        merged.teamMatches.set(teamId, [...existingIds, ...newIds]);
      }
    }

    // Merge upcoming and finished matches
    if (newIndex.upcomingMatches && Array.isArray(newIndex.upcomingMatches)) {
      const newUpcoming = newIndex.upcomingMatches.filter(
        (id: number) => !merged.upcomingMatches.includes(id),
      );
      merged.upcomingMatches.push(...newUpcoming);
    }

    if (newIndex.finishedMatches && Array.isArray(newIndex.finishedMatches)) {
      const newFinished = newIndex.finishedMatches.filter(
        (id: number) => !merged.finishedMatches.includes(id),
      );
      merged.finishedMatches.push(...newFinished);
    }

    return merged;
  }

  /**
   * Update search index for fast lookups
   */
  private updateSearchIndex(match: any, searchIndex: any): void {
    try {
      const matchDate = match.dateTime?.split("T")[0]; // Get date part
      const matchId = match.id;

      // Index by date
      if (matchDate) {
        if (!searchIndex.matchesByDate.has(matchDate)) {
          searchIndex.matchesByDate.set(matchDate, []);
        }
        searchIndex.matchesByDate.get(matchDate)!.push(matchId);
      }

      // Index by teams
      if (match.teams?.home?.id) {
        if (!searchIndex.teamMatches.has(match.teams.home.id)) {
          searchIndex.teamMatches.set(match.teams.home.id, []);
        }
        searchIndex.teamMatches.get(match.teams.home.id)!.push(matchId);
      }

      if (match.teams?.away?.id) {
        if (!searchIndex.teamMatches.has(match.teams.away.id)) {
          searchIndex.teamMatches.set(match.teams.away.id, []);
        }
        searchIndex.teamMatches.get(match.teams.away.id)!.push(matchId);
      }

      // Index by status
      const now = new Date();

      if (matchDate > now) {
        searchIndex.upcomingMatches.push(matchId);
      } else {
        searchIndex.finishedMatches.push(matchId);
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to update search index for match ${match.id}:`,
        error,
      );
    }
  }

  /**
   * Utility methods
   */
  private generateBatchId(): string {
    const now = new Date();
    return `batch_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now.getHours()}${now.getMinutes()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Public method to run incremental updates
   */
  async runIncrementalUpdate(): Promise<void> {
    console.log("🔄 Running incremental update...");
    // TODO: Implement logic to update only recent matches
    // For now, just run full collection
    await this.runBatchCollection();
  }
  private async processMatch(matchId: number): Promise<any | null> {
    try {
      console.log(`  📡 Making 5 API calls for match ${matchId}...`);

      // API Call 1: Match Summary
      console.log(`    📝 1/5: MatchSummary for match ${matchId}`);
      const matchSummary = await this.korastatsClient.makeRequest("MatchSummary", {
        match_id: matchId,
      });

      // API Call 2: Match Timeline (general match info & events)
      console.log(`    ⏱️  2/5: MatchTimeline for match ${matchId}`);
      const matchDetails = await this.korastatsClient.makeRequest("MatchTimeline", {
        match_id: matchId,
      });

      // API Call 3: Match Squad (lineups)
      console.log(`    👥 3/5: MatchSquad for match ${matchId}`);
      const matchLineup = await this.korastatsClient.makeRequest("MatchSquad", {
        match_id: matchId,
      });

      // API Call 4: Match Player Stats (detailed player statistics)
      console.log(`    📈 4/5: MatchPlayerStats for match ${matchId}`);
      const matchPlayerStats = await this.korastatsClient.makeRequest(
        "MatchPlayersStats",
        {
          match_id: matchId,
        },
      );

      console.log(`    ✅ Match ${matchId} data collected successfully`);

      return {
        matchId,
        matchSummary: (matchSummary as any)?.data || null,
        matchDetails: (matchDetails as any)?.data || null, // MatchTimeline
        matchLineup: (matchLineup as any)?.data || null, // MatchSquad (NEW)
        matchPlayerStats: (matchPlayerStats as any)?.data || null, // MatchPlayerStats (NEW)
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`  ❌ Failed to process match ${matchId}:`, error);
      return null;
    }
  }
}

