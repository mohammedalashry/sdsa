// src/scripts/check-tournament-mapping.ts
// Script to check tournament ID mapping

import mongoose from "mongoose";
import { connectToDatabase } from "../db/mogodb/connection";

async function checkTournamentMapping() {
  try {
    console.log("🔍 Checking tournament ID mapping...");
    
    // Connect to database
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    
    // Check tournaments collection
    console.log("\n🏆 Checking tournaments collection:");
    const tournamentsCollection = db.collection('tournaments');
    const tournaments = await tournamentsCollection.find({}).toArray();
    
    console.log(`  Total tournaments: ${tournaments.length}`);
    
    tournaments.forEach(tournament => {
      console.log(`  - Tournament ID: ${tournament.korastats_id}, Name: ${tournament.name}, Season: ${tournament.season}`);
    });
    
    // Check if tournament 62 exists
    const tournament62 = await tournamentsCollection.findOne({ korastats_id: 62 });
    if (tournament62) {
      console.log(`\n✅ Tournament 62 found: ${tournament62.name} (${tournament62.season})`);
    } else {
      console.log(`\n❌ Tournament 62 not found in tournaments collection`);
    }
    
    // Check if tournament 840 exists
    const tournament840 = await tournamentsCollection.findOne({ korastats_id: 840 });
    if (tournament840) {
      console.log(`✅ Tournament 840 found: ${tournament840.name} (${tournament840.season})`);
    } else {
      console.log(`❌ Tournament 840 not found in tournaments collection`);
    }
    
  } catch (error) {
    console.error("❌ Error checking tournament mapping:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the check
checkTournamentMapping();

