// src/scripts/test-syncer.ts
// Test script to identify syncer service issues

import "dotenv/config";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { SyncerService } from "../syncer/syncer-clean.service";

async function testSyncer() {
  console.log("🧪 Testing Syncer Service...");

  const mongoService = new KorastatsMongoService();
  await mongoService.connect();

  const syncerService = new SyncerService();

  try {
    // Test basic functionality
    console.log("🔍 Testing basic syncer methods...");

    // Test tournaments sync
    console.log("🏆 Testing tournaments sync...");
    const tournamentsProgress = await syncerService.syncTournamentsComprehensive({
      limit: 2, // Test with small limit
    });
    console.log("Tournaments Progress:", tournamentsProgress);

    // Test matches sync
    console.log("⚽ Testing matches sync...");
    const matchesProgress = await syncerService.syncMatchesComprehensive({
      limit: 2, // Test with small limit
    });
    console.log("Matches Progress:", matchesProgress);

    console.log("✅ Syncer Service Test Completed!");
  } catch (error) {
    console.error("❌ Syncer Service Test Failed:", error);
  } finally {
    await mongoService.disconnect();
  }
}

// Run the test
testSyncer();

