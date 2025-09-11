// src/scripts/test-matches-syncer-limited.ts
// Test script to verify the matches syncer with limit for testing

import { SyncerService } from "../syncer/syncer.service";

async function testMatchesSyncerLimited() {
  console.log("⚽ Testing Matches Syncer with Limit...");

  const syncerService = new SyncerService();

  try {
    // Test with limited matches for testing
    const options = {
      tournamentIds: [1], // Test with first tournament
      batchSize: 2,
      delayBetweenBatches: 1000,
      limit: 5, // Limit to 5 matches for testing
    };

    console.log("📊 Starting comprehensive matches sync with limit...");
    const progress = await syncerService.syncMatchesComprehensive(options);

    console.log("✅ Matches syncer flow completed successfully!");
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
      console.log("⚠️ Errors encountered:", progress.errors.slice(0, 5)); // Show first 5 errors
    }
  } catch (error) {
    console.error("❌ Matches syncer flow failed:", error);
    process.exit(1);
  }
}

// Run the test
testMatchesSyncerLimited()
  .then(() => {
    console.log("🎉 Matches test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Matches test failed:", error);
    process.exit(1);
  });

