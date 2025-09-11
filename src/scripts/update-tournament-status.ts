#!/usr/bin/env ts-node

/**
 * Update Tournament Status Script
 *
 * This script updates tournament statuses for testing
 */

import { connectToDatabase } from "../db/mogodb/connection";
import { Models } from "../db/mogodb/models";

async function updateTournamentStatus() {
  console.log("🔄 Updating tournament statuses for testing...");

  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log("✅ MongoDB connected");

    // Update ALL tournaments to active for testing
    const result = await Models.Tournament.updateMany(
      {}, // Update all tournaments
      {
        status: "active",
      },
    );

    console.log("✅ Updated tournament status:", result);

    // Check the updated tournament
    const tournament = await Models.Tournament.findOne({ korastats_id: 840 });
    console.log("📊 Updated tournament:", {
      name: tournament?.name,
      status: tournament?.status,
      start_date: tournament?.start_date,
      end_date: tournament?.end_date,
    });

    // Check active tournaments
    const activeTournaments = await Models.Tournament.find({ status: "active" });
    console.log(`\n🏆 Active tournaments: ${activeTournaments.length}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

updateTournamentStatus().catch(console.error);

