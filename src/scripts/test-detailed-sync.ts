// src/scripts/test-detailed-sync.ts
// Debug script to test detailed match sync

import "tsconfig-paths/register";
import { MatchDataService } from "../syncer/match-data.service";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { Models } from "../db/mogodb/models";

async function main() {
  console.log("🔍 Testing Detailed Match Sync");
  console.log("==============================");

  const mongoService = new KorastatsMongoService();
  const matchDataService = new MatchDataService();

  try {
    await mongoService.connect();
    console.log("✅ Connected to MongoDB");

    // =================================================================
    // TEST 1: Check current match status
    // =================================================================
    console.log("\n📊 TEST 1: Current Match Status");
    console.log("-".repeat(40));

    const tournamentId = 271; // Saudi Pro League

    // Get all matches for this tournament
    const allMatches = await Models.Match.find({ tournament_id: tournamentId })
      .sort({ "fixture.timestamp": -1 })
      .limit(10)
      .lean();

    console.log(`Found ${allMatches.length} matches for tournament ${tournamentId}`);

    if (allMatches.length > 0) {
      console.log("\n🔍 Match statuses:");
      const statusCounts = allMatches.reduce(
        (counts, match) => {
          const status = match.fixture?.status?.short || "UNKNOWN";
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      );

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} matches`);
      });

      console.log("\n🔍 Sample matches:");
      allMatches.slice(0, 5).forEach((match, index) => {
        console.log(
          `  ${index + 1}. ${match.teams?.home?.name} vs ${match.teams?.away?.name}`,
        );
        console.log(
          `     Status: ${match.fixture?.status?.short} (${match.fixture?.status?.long})`,
        );
        console.log(`     Date: ${new Date(match.fixture?.date).toLocaleDateString()}`);
        console.log(
          `     Data Available: events=${match.dataAvailable?.events}, stats=${match.dataAvailable?.stats}`,
        );
        console.log(`     Match ID: ${match.korastats_id}`);
      });
    }

    // =================================================================
    // TEST 2: Check MatchDetails collection
    // =================================================================
    console.log("\n📋 TEST 2: MatchDetails Collection Status");
    console.log("-".repeat(40));

    const detailedMatches = await Models.MatchDetails.find({
      tournament_id: tournamentId,
    }).lean();
    console.log(
      `Found ${detailedMatches.length} detailed matches for tournament ${tournamentId}`,
    );

    if (detailedMatches.length > 0) {
      console.log("\n🔍 Sample detailed matches:");
      detailedMatches.slice(0, 3).forEach((match, index) => {
        console.log(`  ${index + 1}. Match ID: ${match.korastats_id}`);
        console.log(`     Timeline Events: ${match.timelineData?.length || 0}`);
        console.log(`     Lineups: ${match.lineupsData?.length || 0}`);
        console.log(`     Player Stats: ${match.playerStatsData?.length || 0}`);
        console.log(`     Last Synced: ${match.lastSynced}`);
      });
    }

    // =================================================================
    // TEST 3: Get sync status
    // =================================================================
    console.log("\n📈 TEST 3: Sync Status");
    console.log("-".repeat(40));

    const syncStatus = await matchDataService.getSyncStatus(tournamentId);
    console.log("Sync Status:", syncStatus);

    // =================================================================
    // TEST 4: Test detailed sync for specific tournament
    // =================================================================
    console.log("\n🔄 TEST 4: Test Detailed Sync");
    console.log("-".repeat(40));

    try {
      console.log(`Testing detailed sync for tournament ${tournamentId}...`);

      const detailedSyncResult = await matchDataService.syncDetailedMatches({
        tournamentId: tournamentId,
        limit: 3, // Test with just 3 matches
        forceResync: false,
        includeDetails: true,
        includeAnalytics: false,
      });

      console.log("✅ Detailed sync result:", detailedSyncResult);

      // Check if any data was added
      const newDetailedCount = await Models.MatchDetails.countDocuments({
        tournament_id: tournamentId,
      });
      console.log(`📊 MatchDetails count after sync: ${newDetailedCount}`);
    } catch (error) {
      console.error("❌ Detailed sync failed:", error.message);
    }

    // =================================================================
    // TEST 5: Force sync a specific finished match
    // =================================================================
    console.log("\n🔄 TEST 5: Force Sync Specific Match");
    console.log("-".repeat(40));

    // Find a finished match
    const finishedMatch = await Models.Match.findOne({
      tournament_id: tournamentId,
      "fixture.status.short": "FT",
    }).lean();

    if (finishedMatch) {
      console.log(
        `Found finished match: ${finishedMatch.teams?.home?.name} vs ${finishedMatch.teams?.away?.name}`,
      );
      console.log(`Match ID: ${finishedMatch.korastats_id}`);

      try {
        const forceSync = await matchDataService.forceDetailedSyncForMatches([
          finishedMatch.korastats_id,
        ]);
        console.log("✅ Force sync result:", forceSync);

        // Check the detailed data
        const detailedData = await Models.MatchDetails.findOne({
          korastats_id: finishedMatch.korastats_id,
        }).lean();
        if (detailedData) {
          console.log("✅ Detailed data found:");
          console.log(`  Timeline Events: ${detailedData.timelineData?.length || 0}`);
          console.log(`  Lineups: ${detailedData.lineupsData?.length || 0}`);
          console.log(`  Player Stats: ${detailedData.playerStatsData?.length || 0}`);
        } else {
          console.log("❌ No detailed data found after force sync");
        }
      } catch (error) {
        console.error("❌ Force sync failed:", error.message);
      }
    } else {
      console.log("⚠️ No finished matches found for testing");
    }

    // =================================================================
    // TEST 6: Final status check
    // =================================================================
    console.log("\n📊 TEST 6: Final Status Check");
    console.log("-".repeat(40));

    const finalStats = await Promise.all([
      Models.Match.countDocuments({ tournament_id: tournamentId }),
      Models.MatchDetails.countDocuments({ tournament_id: tournamentId }),
      Models.Match.countDocuments({
        tournament_id: tournamentId,
        "fixture.status.short": "FT",
      }),
      Models.Match.countDocuments({
        tournament_id: tournamentId,
        "dataAvailable.events": true,
      }),
    ]);

    console.log(`📈 Final Statistics:`);
    console.log(`  Total Matches: ${finalStats[0]}`);
    console.log(`  Detailed Matches: ${finalStats[1]}`);
    console.log(`  Finished Matches: ${finalStats[2]}`);
    console.log(`  Matches with Events Data: ${finalStats[3]}`);
    console.log(
      `  Detailed Coverage: ${finalStats[0] > 0 ? ((finalStats[1] / finalStats[0]) * 100).toFixed(1) : 0}%`,
    );

    console.log("\n✅ Detailed sync testing completed!");
  } catch (error) {
    console.error("\n❌ Testing failed:", error);
  } finally {
    await mongoService.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Individual test functions
export async function testSingleMatchDetailedSync(matchId: number) {
  console.log(`🧪 Testing detailed sync for single match: ${matchId}`);

  const mongoService = new KorastatsMongoService();
  const matchDataService = new MatchDataService();

  try {
    await mongoService.connect();

    // Get match info
    const match = await Models.Match.findOne({ korastats_id: matchId }).lean();
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    console.log(`Match: ${match.teams?.home?.name} vs ${match.teams?.away?.name}`);
    console.log(`Status: ${match.fixture?.status?.short}`);

    // Force sync detailed data
    const result = await matchDataService.forceDetailedSyncForMatches([matchId]);
    console.log("Sync result:", result);

    // Check result
    const detailed = await Models.MatchDetails.findOne({ korastats_id: matchId }).lean();
    if (detailed) {
      console.log("✅ Detailed data created:");
      console.log(`  Events: ${detailed.timelineData?.length || 0}`);
      console.log(`  Lineups: ${detailed.lineupsData?.length || 0}`);
      console.log(`  Player Stats: ${detailed.playerStatsData?.length || 0}`);
    } else {
      console.log("❌ No detailed data found");
    }
  } finally {
    await mongoService.disconnect();
  }
}

export async function clearDetailedData(tournamentId: number) {
  console.log(`🗑️ Clearing detailed data for tournament ${tournamentId}`);

  const mongoService = new KorastatsMongoService();

  try {
    await mongoService.connect();

    const result = await Models.MatchDetails.deleteMany({ tournament_id: tournamentId });
    console.log(`Deleted ${result.deletedCount} detailed match records`);

    // Reset dataAvailable flags
    await Models.Match.updateMany(
      { tournament_id: tournamentId },
      {
        $set: {
          "dataAvailable.events": false,
          "dataAvailable.stats": false,
          "dataAvailable.formations": false,
          "dataAvailable.playerStats": false,
          "dataAvailable.video": false,
        },
      },
    );
    console.log("Reset dataAvailable flags for all matches");
  } finally {
    await mongoService.disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("🎉 Test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

