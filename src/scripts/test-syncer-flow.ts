// src/scripts/test-syncer-flow.ts
// Test script to verify the complete syncer flow

import { SyncerService } from "../syncer/syncer.service";

async function testSyncerFlow() {
  console.log("🚀 Testing Syncer Flow...");

  const syncerService = new SyncerService();

  try {
    // Test with a small subset of tournaments
    const options = {
      tournamentIds: [1, 2], // Test with first 2 tournaments
      batchSize: 2,
      delayBetweenBatches: 1000,
    };

    console.log("📊 Starting comprehensive matches sync...");
    const progress = await syncerService.syncMatchesComprehensive(options);

    console.log("✅ Syncer flow completed successfully!");
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
    console.error("❌ Syncer flow failed:", error);
    process.exit(1);
  }
}

// Run the test
testSyncerFlow()
  .then(() => {
    console.log("🎉 Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });

