// src/scripts/test-entity-sync.ts
// Test script for entity data syncing (players, coaches, referees)

import "dotenv/config";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { EntityDataService } from "../syncer/entity-data.service";

async function testEntitySync() {
  console.log("🧪 Testing Entity Data Sync...");

  const mongoService = new KorastatsMongoService();
  await mongoService.connect();

  const entityService = new EntityDataService();

  try {
    // Test with a small limit for quick testing
    const options = {
      batchSize: 2,
      delayBetweenBatches: 500,
      forceResync: false,
      skipExisting: false,
      limit: 5, // Only test with 5 entities
    };

    console.log("👤 Testing Players Sync...");
    const playersProgress = await entityService.syncPlayersData(options);
    console.log("Players Progress:", playersProgress);

    console.log("\n👨‍💼 Testing Coaches Sync...");
    const coachesProgress = await entityService.syncCoachesData(options);
    console.log("Coaches Progress:", coachesProgress);

    console.log("\n👨‍⚖️ Testing Referees Sync...");
    const refereesProgress = await entityService.syncRefereesData(options);
    console.log("Referees Progress:", refereesProgress);

    console.log("\n✅ Entity Data Sync Test Completed!");
  } catch (error) {
    console.error("❌ Entity Data Sync Test Failed:", error);
  } finally {
    await mongoService.disconnect();
  }
}

// Run the test
testEntitySync();

