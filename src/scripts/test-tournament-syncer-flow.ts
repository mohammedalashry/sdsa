// src/scripts/test-tournament-syncer-flow.ts
// Test script to verify the complete tournament syncer flow

import { SyncerService } from "../syncer/syncer.service";

async function testTournamentSyncerFlow() {
  console.log("🏆 Testing Tournament Syncer Flow...");

  const syncerService = new SyncerService();

  try {
    // Test with a small subset of tournaments
    const options = {
      tournamentIds: [1, 2, 3], // Test with first 3 tournaments
      batchSize: 2,
      delayBetweenBatches: 1000,
      limit: 1, // Limit to 1 tournament for testing
    };

    console.log("📊 Starting comprehensive tournaments sync...");
    const progress = await syncerService.syncTournamentsComprehensive(options);

    console.log("✅ Tournament syncer flow completed successfully!");
    console.log("📈 Final Progress:", {
      total: progress.total,
      completed: progress.completed,
      failed: progress.failed,
      duration: progress.endTime
        ? progress.endTime.getTime() - progress.startTime.getTime()
        : 0,
      errors: progress.errors.length,
    });

    if (progress.errors.length > 0) {
      console.log("⚠️ Errors encountered:", progress.errors);
    }
  } catch (error) {
    console.error("❌ Tournament syncer flow failed:", error);
    process.exit(1);
  }
}

// Run the test
testTournamentSyncerFlow()
  .then(() => {
    console.log("🎉 Tournament test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Tournament test failed:", error);
    process.exit(1);
  });

