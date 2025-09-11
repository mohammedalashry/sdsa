// src/scripts/test-fixture-details.ts
// Test script to verify fixture details are working

import "dotenv/config";
import { FixturesRepository } from "../modules/fixtures/fixtures.repository";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { Models } from "../db/mogodb/models";

async function testFixtureDetails() {
  console.log("🧪 Testing Fixture Details...");

  try {
    // Connect to MongoDB
    const mongoService = new KorastatsMongoService();
    await mongoService.connect();

    // Get a sample match from MongoDB
    const sampleMatch = await Models.Match.findOne({}).limit(1);

    if (!sampleMatch) {
      console.log("❌ No matches found in MongoDB");
      return;
    }

    console.log(`📋 Testing fixture details for match ID: ${sampleMatch.korastats_id}`);
    console.log(
      `   Match: ${sampleMatch.teams?.home?.name} vs ${sampleMatch.teams?.away?.name}`,
    );
    console.log(`   Date: ${sampleMatch.date}`);

    // Test fixture details
    const fixturesRepo = new FixturesRepository();

    try {
      const fixtureDetails = await fixturesRepo.getFixtureDetails(
        sampleMatch.korastats_id,
      );

      console.log("✅ Fixture Details Retrieved Successfully!");
      console.log(`   Fixture ID: ${fixtureDetails.fixtureData.fixture.id}`);
      console.log(
        `   Teams: ${fixtureDetails.fixtureData.teams.home.name} vs ${fixtureDetails.fixtureData.teams.away.name}`,
      );
      console.log(
        `   Score: ${fixtureDetails.fixtureData.goals.home} - ${fixtureDetails.fixtureData.goals.away}`,
      );
      console.log(`   Status: ${fixtureDetails.fixtureData.fixture.status.long}`);
      console.log(`   Events: ${fixtureDetails.timelineData.length} events`);
      console.log(`   Player Stats: ${fixtureDetails.playerStatsData.length} players`);

      if (fixtureDetails.lineupsData && fixtureDetails.lineupsData.length > 0) {
        console.log(
          `   Lineups: ${fixtureDetails.lineupsData[0].startXI?.length || 0} starting players`,
        );
      } else {
        console.log(`   Lineups: No lineup data available`);
      }
    } catch (error) {
      console.log(`❌ Fixture Details Error: ${error.message}`);
      console.log("   Stack trace:", error.stack);
    }

    console.log("\n✅ Fixture Details test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testFixtureDetails();

