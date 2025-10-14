// src/scripts/manage-coaches.ts
// Script for managing coach data operations (clear, sync, sync-all, status)

import { CoachDataService } from "../syncer/coach-data.service";
import { KorastatsMongoService } from "@/db/mogodb/connection";

async function main() {
  const command = process.argv[2];
  const mongo = new KorastatsMongoService();
  const service = new CoachDataService();

  try {
    await mongo.connect();

    switch (command) {
      case "clear":
        await clearCoaches(service);
        break;
      case "sync":
        await syncCoaches(service);
        break;
      case "sync-all":
        await syncAllTournamentsCoaches(service);
        break;
      default:
        printUsage();
    }
  } catch (err: any) {
    console.error("❌ Script failed:", err?.message || err);
    process.exit(1);
  } finally {
    await mongo.disconnect();
  }
}

async function clearCoaches(service: CoachDataService) {
  console.log("🗑️ Clearing all coach data...");
  await service.clearAllCoaches();
  console.log("✅ All coach data cleared successfully");
}

async function syncCoaches(service: CoachDataService) {
  const tournamentId = parseInt(process.argv[3] || "840", 10);
  const limit = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;

  console.log(`👔 Syncing coaches for tournament ${tournamentId}...`);
  if (limit) console.log(`📢 Limited to ${limit} coaches per tournament`);

  const res = await service.syncTournamentCoaches({
    tournamentId,
    limit,
    includeStats: true,
    includeAnalytics: true,
    forceResync: false,
  });

  console.log("✅ Coach sync completed");
  console.log(`📊 Total: ${res.total} | ✅ ${res.completed} | ❌ ${res.failed}`);
}

async function syncAllTournamentsCoaches(service: CoachDataService) {
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
  console.log("👔 Syncing coaches for ALL tournaments...");
  const res = await service.syncAllTournamentsCoaches(limit);
  console.log("✅ All-tournaments coach sync completed");
  console.log(`📊 Total: ${res.total} | ✅ ${res.completed} | ❌ ${res.failed}`);
}

function printUsage() {
  console.log(`
👔 Coach Management Script

Usage: npm run manage:coaches -- <command> [options]

Commands:
  clear                       Clear all coach data
  sync [tournamentId] [limit] Sync coaches for a tournament (default: 840)
  sync-all [limit]            Sync coaches for ALL tournaments

Examples:
  npm run manage:coaches -- clear
  npm run manage:coaches -- sync 840 5
  npm run manage:coaches -- sync-all 10
`);
}

if (require.main === module) {
  main();
}

export { main };

