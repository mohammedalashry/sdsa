#!/usr/bin/env ts-node

/**
 * Check Tournament Data Script
 *
 * This script checks what tournament data we have in MongoDB
 */

import { connectToDatabase } from "../db/mogodb/connection";
import { Models } from "../db/mogodb/models";

async function checkTournaments() {
  console.log("🔍 Checking tournament data in MongoDB...");

  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log("✅ MongoDB connected");

    // Get all tournaments
    const tournaments = await Models.Tournament.find({});
    console.log(`📊 Found ${tournaments.length} tournaments:`);

    tournaments.forEach((tournament, index) => {
      console.log(`\n${index + 1}. ${tournament.name} (${tournament.season})`);
      console.log(`   ID: ${tournament.korastats_id}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Start: ${tournament.start_date}`);
      console.log(`   End: ${tournament.end_date}`);
      console.log(`   Country: ${tournament.country?.name}`);
    });

    // Check for active tournaments specifically
    const activeTournaments = await Models.Tournament.find({ status: "active" });
    console.log(`\n🏆 Active tournaments: ${activeTournaments.length}`);

    if (activeTournaments.length === 0) {
      console.log("❌ No active tournaments found!");
      console.log("Available statuses:", [...new Set(tournaments.map((t) => t.status))]);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkTournaments().catch(console.error);

