// src/scripts/check-matches-data.ts
// Script to check what data is actually in the matches collection

import mongoose from "mongoose";
import { connectToDatabase } from "../db/mogodb/connection";

async function checkMatchesData() {
  try {
    console.log("🔍 Checking matches collection data...");

    // Connect to database
    await connectToDatabase();

    const db = mongoose.connection.db;

    // Check matches collection
    console.log("\n🏈 Checking matches collection:");
    const matchesCollection = db.collection("matches");
    const matchCount = await matchesCollection.countDocuments();
    console.log(`  Total matches: ${matchCount}`);

    if (matchCount > 0) {
      // Get unique tournament IDs
      const tournamentIds = await matchesCollection.distinct("tournament_id");
      console.log(`  Unique tournament IDs: ${tournamentIds.join(", ")}`);

      // Get unique seasons
      const seasons = await matchesCollection.distinct("season");
      console.log(`  Unique seasons: ${seasons.join(", ")}`);

      // Get sample match
      const sampleMatch = await matchesCollection.findOne();
      console.log("\n  Sample match structure:");
      console.log(JSON.stringify(sampleMatch, null, 2));

      // Check for league 840 specifically
      const league840Matches = await matchesCollection.countDocuments({
        tournament_id: 840,
      });
      console.log(`\n  Matches with tournament_id 840: ${league840Matches}`);

      // Check for league 62 specifically
      const league62Matches = await matchesCollection.countDocuments({
        tournament_id: 62,
      });
      console.log(`  Matches with tournament_id 62: ${league62Matches}`);
    }
  } catch (error) {
    console.error("❌ Error checking matches data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the check
checkMatchesData();


