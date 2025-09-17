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
 *   npm run sync:coaches    - Sync coaches
 *   npm run sync:referees   - Sync referees
 *   npm run sync:standings  - Sync standings
 *   npm run sync:all        - Sync all modules
 */

//import { SyncerService } from "../syncer/syncer.service";
import { SyncerService } from "../syncer/syncer-clean.service";
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

      case "coaches":
        console.log("👔 Syncing Coaches...");
        const coachResult = await syncer.syncCoachesComprehensive();
        console.log("✅ Coaches sync completed:", coachResult);
        break;

      case "referees":
        console.log("🏁 Syncing Referees...");
        const refereeResult = await syncer.syncRefereesComprehensive();
        console.log("✅ Referees sync completed:", refereeResult);
        break;

      case "standings":
        console.log("🏆 Syncing Standings...");
        const standingsResult = await syncer.syncStandings();
        console.log("✅ Standings sync completed:", standingsResult);
        break;

      case "all":
        console.log("🔄 Syncing All Modules...");

        console.log("1️⃣ Syncing Leagues...");
        const leagues = await syncer.syncTournamentsComprehensive();
        console.log("✅ Leagues:", leagues);

        console.log("2️⃣ Syncing Standings...");
        const standings = await syncer.syncStandings();
        console.log("✅ Standings:", standings);

        console.log("3️⃣ Syncing Teams...");
        const teams = await syncer.syncTeamsComprehensive();
        console.log("✅ Teams:", teams);

        console.log("4️⃣ Syncing Matches...");
        const matches = await syncer.syncMatchesComprehensive();
        console.log("✅ Matches:", matches);

        console.log("5️⃣ Syncing Players...");
        const players = await syncer.syncPlayersComprehensive();
        console.log("✅ Players:", players);

        console.log("6️⃣ Syncing Coaches...");
        const coaches = await syncer.syncCoachesComprehensive();
        console.log("✅ Coaches:", coaches);

        console.log("7️⃣ Syncing Referees...");
        const referees = await syncer.syncRefereesComprehensive();
        console.log("✅ Referees:", referees);

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
  standings [limit]  - Sync league standings from KoraStats
  teams [limit]      - Sync teams from KoraStats
  matches [limit]    - Sync matches from KoraStats  
  players [limit]    - Sync players from KoraStats
  coaches [limit]    - Sync coaches from KoraStats
  referees [limit]   - Sync referees from KoraStats
  all               - Sync all modules in sequence
  status            - Check sync status

Examples:
  npm run sync:leagues
  npm run sync:standings
  npm run sync:teams
  npm run sync:matches
  npm run sync:players
  npm run sync:coaches
  npm run sync:referees
  npm run sync:matches 5        # Sync with limit of 5 matches
  npm run sync:leagues 3        # Sync with limit of 3 tournaments
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

