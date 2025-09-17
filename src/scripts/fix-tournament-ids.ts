// src/scripts/fix-tournament-ids.ts
// Script to fix tournament IDs in matches collection

import mongoose from "mongoose";
import { connectToDatabase } from "../db/mogodb/connection";

async function fixTournamentIds() {
  try {
    console.log("🔧 Fixing tournament IDs in matches collection...");
    
    // Connect to database
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    
    // Update all matches with tournament_id 62 to 840 (Pro League)
    const matchesCollection = db.collection('matches');
    
    console.log("📊 Before update:");
    const beforeCount62 = await matchesCollection.countDocuments({ tournament_id: 62 });
    const beforeCount840 = await matchesCollection.countDocuments({ tournament_id: 840 });
    console.log(`  Matches with tournament_id 62: ${beforeCount62}`);
    console.log(`  Matches with tournament_id 840: ${beforeCount840}`);
    
    // Update tournament_id from 62 to 840
    const updateResult = await matchesCollection.updateMany(
      { tournament_id: 62 },
      { $set: { tournament_id: 840 } }
    );
    
    console.log(`\n✅ Updated ${updateResult.modifiedCount} matches from tournament_id 62 to 840`);
    
    console.log("\n📊 After update:");
    const afterCount62 = await matchesCollection.countDocuments({ tournament_id: 62 });
    const afterCount840 = await matchesCollection.countDocuments({ tournament_id: 840 });
    console.log(`  Matches with tournament_id 62: ${afterCount62}`);
    console.log(`  Matches with tournament_id 840: ${afterCount840}`);
    
    // Test the fixtures endpoint
    console.log("\n🧪 Testing fixtures endpoint...");
    const testMatches = await matchesCollection.find({ 
      tournament_id: 840, 
      season: "2024/2025" 
    }).limit(5).toArray();
    
    console.log(`  Found ${testMatches.length} matches for tournament 840, season 2024/2025`);
    if (testMatches.length > 0) {
      console.log(`  Sample match: ${testMatches[0].teams?.home?.name} vs ${testMatches[0].teams?.away?.name}`);
    }
    
  } catch (error) {
    console.error("❌ Error fixing tournament IDs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the fix
fixTournamentIds();


