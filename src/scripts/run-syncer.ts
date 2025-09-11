#!/usr/bin/env ts-node

/**
 * SDSA Syncer Runner Script
 *
 * This script demonstrates how to use the comprehensive syncer to populate MongoDB
 * with data from KoraStats API.
 *
 * Usage:
 *   npm run sync:leagues    - Sync leagues/tournaments
 *   npm run sync:matches    - Sync matches
 *   npm run sync:teams      - Sync teams
 *   npm run sync:players    - Sync players
 *   npm run sync:all        - Sync all modules
 */

import { SyncerService } from "../syncer/syncer.service";
import { connectToDatabase } from "../db/mogodb/connection";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const limit = args[1] ? parseInt(args[1]) : undefined; // Optional limit parameter

  console.log("🚀 SDSA Syncer Starting...");
  console.log(`📋 Command: ${command || "help"}`);
  if (limit) {
    console.log(`📊 Limit: ${limit} items`);
  }

  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await connectToDatabase();
    console.log("✅ MongoDB connected successfully");

    // Initialize syncer
    const syncer = new SyncerService();

    switch (command) {
      case "leagues":
        console.log("🏆 Syncing Leagues...");
        const leagueResult = await syncer.syncTournamentsComprehensive({ limit });
        console.log("✅ Leagues sync completed:", leagueResult);
        break;

      case "matches":
        console.log("⚽ Syncing Matches...");
        const matchResult = await syncer.syncMatchesComprehensive({ limit });
        console.log("✅ Matches sync completed:", matchResult);
        break;

      case "teams":
        console.log("👥 Syncing Teams...");
        const teamResult = await syncer.syncTeamsComprehensive();
        console.log("✅ Teams sync completed:", teamResult);
        break;

      case "players":
        console.log("🏃 Syncing Players...");
        const playerResult = await syncer.syncPlayersComprehensive();
        console.log("✅ Players sync completed:", playerResult);
        break;

      case "all":
        console.log("🔄 Syncing All Modules...");

        console.log("1️⃣ Syncing Leagues...");
        const leagues = await syncer.syncLeaguesComprehensive();
        console.log("✅ Leagues:", leagues);

        console.log("2️⃣ Syncing Matches...");
        const matches = await syncer.syncMatchesComprehensive();
        console.log("✅ Matches:", matches);

        console.log("3️⃣ Syncing Teams...");
        const teams = await syncer.syncTeamsComprehensive();
        console.log("✅ Teams:", teams);

        console.log("4️⃣ Syncing Players...");
        const players = await syncer.syncPlayersComprehensive();
        console.log("✅ Players:", players);

        console.log("🎉 All modules synced successfully!");
        break;

      case "status":
        console.log("📊 Checking sync status...");
        // You can add status checking logic here
        console.log("✅ Status check completed");
        break;

      default:
        console.log(`
📚 SDSA Syncer Usage:

Available commands:
  leagues [limit]    - Sync leagues/tournaments from KoraStats
  matches [limit]    - Sync matches from KoraStats  
  teams [limit]      - Sync teams from KoraStats
  players [limit]    - Sync players from KoraStats
  all               - Sync all modules in sequence
  status            - Check sync status

Examples:
  npm run sync:leagues
  npm run sync:matches
  npm run sync:matches 5        # Sync with limit of 5 matches
  npm run sync:leagues 3        # Sync with limit of 3 tournaments
  npm run sync:teams
  npm run sync:players
  npm run sync:all

Note: Make sure your KoraStats API key is configured in .env
        `);
        break;
    }
  } catch (error) {
    console.error("❌ Syncer failed:", error);
    process.exit(1);
  } finally {
    console.log("🏁 Syncer finished");
    process.exit(0);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the main function
main().catch(console.error);

