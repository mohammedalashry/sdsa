// src/scripts/manage-players.ts
// Script for managing player data operations (clear, sync, sync-all, status)

import { PlayerDataService } from "../syncer/player-data.service";
import { KorastatsMongoService } from "@/db/mogodb/connection";

async function main() {
  const command = process.argv[2];
  const mongo = new KorastatsMongoService();
  const service = new PlayerDataService();

  try {
    await mongo.connect();

    switch (command) {
      case "clear":
        await clearPlayers(service);
        break;
      case "sync":
        await syncPlayers(service);
        break;
      case "sync-all":
        await syncAllTournamentsPlayers(service);
        break;
      case "status":
        await getPlayerStatus(service);
        break;
      case "missing":
        await syncMissingPlayers(service);
        break;
      case "update-stats":
        await updatePlayerStats(service);
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

async function clearPlayers(service: PlayerDataService) {
  console.log("🗑️ Clearing all player data...");
  await service.clearAllPlayers();
  console.log("✅ All player data cleared successfully");
}

async function syncPlayers(service: PlayerDataService) {
  const tournamentId = parseInt(process.argv[3] || "840", 10);
  const limit = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;

  console.log(`⚽ Syncing players for tournament ${tournamentId}...`);
  if (limit) console.log(`📢 Limited to ${limit} players per tournament`);

  const res = await service.syncTournamentPlayers({
    tournamentId,
    limit,
    includeStats: true,
    includeAnalytics: true,
    forceResync: false,
  });

  console.log("✅ Player sync completed");
  console.log(`📊 Total: ${res.total} | ✅ ${res.completed} | ❌ ${res.failed}`);
}

async function syncAllTournamentsPlayers(service: PlayerDataService) {
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
  console.log("⚽ Syncing players for ALL tournaments...");

  // Get all tournaments and sync players for each
  const tournaments = [1441, 840, 600, 934]; // Pro League tournaments
  let totalCompleted = 0;
  let totalFailed = 0;

  for (const tournamentId of tournaments) {
    console.log(`\n📊 Syncing players for tournament ${tournamentId}...`);
    const res = await service.syncTournamentPlayers({
      tournamentId,
      limit,
      includeStats: true,
      includeAnalytics: true,
      forceResync: false,
    });

    totalCompleted += res.completed;
    totalFailed += res.failed;
  }

  console.log("\n✅ All-tournaments player sync completed");
  console.log(
    `📊 Total: ${totalCompleted + totalFailed} | ✅ ${totalCompleted} | ❌ ${totalFailed}`,
  );
}

async function getPlayerStatus(service: PlayerDataService) {
  const tournamentId = parseInt(process.argv[3] || "840", 10);
  console.log(`📊 Getting player sync status for tournament ${tournamentId}...`);

  const status = await service.getPlayerSyncStatus(tournamentId);

  console.log("\n📈 Player Sync Status:");
  console.log(`Total players in tournament: ${status.totalPlayers}`);
  console.log(`Synced players in database: ${status.syncedPlayers}`);
  console.log(`Players with statistics: ${status.playersWithStats}`);
  console.log(`Last sync: ${status.lastSync ? status.lastSync.toISOString() : "Never"}`);
}

async function syncMissingPlayers(service: PlayerDataService) {
  const tournamentId = parseInt(process.argv[3] || "840", 10);
  console.log(`🔍 Syncing missing players for tournament ${tournamentId}...`);

  const res = await service.syncMissingPlayers(tournamentId);

  console.log("✅ Missing players sync completed");
  console.log(`📊 Total: ${res.total} | ✅ ${res.completed} | ❌ ${res.failed}`);
}

async function updatePlayerStats(service: PlayerDataService) {
  const tournamentId = parseInt(process.argv[3] || "840", 10);
  console.log(`📊 Updating player statistics for tournament ${tournamentId}...`);

  const res = await service.updatePlayerStatistics(tournamentId);

  console.log("✅ Player statistics update completed");
  console.log(`📊 Total: ${res.total} | ✅ ${res.completed} | ❌ ${res.failed}`);
}

function printUsage() {
  console.log(`
⚽ Player Management Script

Usage: npm run manage:players -- <command> [options]

Commands:
  clear                       Clear all player data
  sync [tournamentId] [limit] Sync players for a tournament (default: 840)
  sync-all [limit]            Sync players for ALL tournaments
  status [tournamentId]       Get player sync status (default: 840)
  missing [tournamentId]      Sync missing players (default: 840)
  update-stats [tournamentId] Update player statistics (default: 840)

Examples:
  npm run manage:players -- clear
  npm run manage:players -- sync 840 5
  npm run manage:players -- sync-all 10
  npm run manage:players -- status 840
  npm run manage:players -- missing 840
  npm run manage:players -- update-stats 840
`);
}

if (require.main === module) {
  main();
}

export { main };

