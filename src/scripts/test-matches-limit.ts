#!/usr/bin/env ts-node

/**
 * Quick test script for matches syncer with limit
 * Usage: npx ts-node --require tsconfig-paths/register src/scripts/test-matches-limit.ts [limit]
 */

import { SyncerService } from "../syncer/syncer.service";
import { connectToDatabase } from "../db/mogodb/connection";

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 5; // Default to 5 matches

  console.log("⚽ Testing Matches Syncer with Limit...");
  console.log(`📊 Limit: ${limit} matches`);

  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await connectToDatabase();
    console.log("✅ MongoDB connected successfully");

    // Initialize syncer
    const syncer = new SyncerService();

    // Test with limited matches
    const options = {
      tournamentIds: [1], // Test with first tournament
      batchSize: 2,
      delayBetweenBatches: 1000,
      limit: limit, // Use the limit from command line
    };

    console.log("📊 Starting comprehensive matches sync with limit...");
    const progress = await syncer.syncMatchesComprehensive(options);

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
      console.log("⚠️ First 5 errors encountered:", progress.errors.slice(0, 5));
    }
  } catch (error) {
    console.error("❌ Matches syncer flow failed:", error);
    process.exit(1);
  } finally {
    console.log("👋 Disconnecting from MongoDB...");
    process.exit(0);
  }
}

// Run the test
main().catch((error) => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});

