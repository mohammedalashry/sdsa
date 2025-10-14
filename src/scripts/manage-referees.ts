// src/scripts/manage-referees.ts
// Script for managing referee data operations (clear, sync, status)

import { RefereeDataService } from "../syncer/referee-data.service";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { KorastatsMongoService } from "@/db/mogodb/connection";

async function main() {
  const command = process.argv[2];
  const mongoService = new KorastatsMongoService();
  const refereeService = new RefereeDataService();

  try {
    // Connect to MongoDB
    await mongoService.connect();

    switch (command) {
      case "clear":
        await clearReferees();
        break;
      case "sync":
        await syncReferees();
        break;
      case "status":
        await getRefereeStatus();
        break;
      case "missing":
        await syncMissingReferees();
        break;
      case "update-stats":
        await updateRefereeStats();
        break;
      default:
        printUsage();
        break;
    }
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoService.disconnect();
  }
}

async function clearReferees() {
  console.log("🗑️ Clearing all referee data...");

  const refereeService = new RefereeDataService();
  await refereeService.clearAllReferees();

  console.log("✅ All referee data cleared successfully");
}

async function syncReferees() {
  const tournamentId = parseInt(process.argv[3]) || 840; // Default to Pro League
  const limit = parseInt(process.argv[4]) || undefined; // Optional limit for testing

  console.log(`⚽ Syncing referees for tournament ${tournamentId}...`);
  if (limit) {
    console.log(`📢 Limited to ${limit} referees for testing`);
  }

  const refereeService = new RefereeDataService();
  const result = await refereeService.syncTournamentReferees({
    tournamentId,
    limit,
    forceResync: false,
    includeStats: true,
  });

  console.log("✅ Referee sync completed!");
  console.log(`📊 Total referees: ${result.total}`);
  console.log(`✅ Successfully processed: ${result.completed}`);
  console.log(`❌ Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`⚠️ ${result.errors.length} errors occurred:`);
    result.errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more errors`);
    }
  }
}

async function getRefereeStatus() {
  const tournamentId = parseInt(process.argv[3]) || 840; // Default to Pro League

  console.log(`📊 Getting referee sync status for tournament ${tournamentId}...`);

  const refereeService = new RefereeDataService();
  const status = await refereeService.getRefereeSyncStatus(tournamentId);

  console.log("📈 Referee Sync Status:");
  console.log(`   Total referees in tournament: ${status.totalReferees}`);
  console.log(`   Synced referees in database: ${status.syncedReferees}`);
  console.log(`   Referees with career stats: ${status.refereesWithStats}`);
  console.log(
    `   Last sync: ${status.lastSync ? status.lastSync.toISOString() : "Never"}`,
  );

  if (status.totalReferees > 0) {
    const syncPercentage = ((status.syncedReferees / status.totalReferees) * 100).toFixed(
      1,
    );
    console.log(`   Sync completion: ${syncPercentage}%`);
  }
}

async function syncMissingReferees() {
  const tournamentId = parseInt(process.argv[3]) || 840; // Default to Pro League

  console.log(`🔍 Syncing missing referees for tournament ${tournamentId}...`);

  const refereeService = new RefereeDataService();
  const result = await refereeService.syncMissingReferees(tournamentId);

  console.log("✅ Missing referees sync completed!");
  console.log(`📊 Total missing referees: ${result.total}`);
  console.log(`✅ Successfully processed: ${result.completed}`);
  console.log(`❌ Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`⚠️ ${result.errors.length} errors occurred:`);
    result.errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more errors`);
    }
  }
}

async function updateRefereeStats() {
  const tournamentId = parseInt(process.argv[3]) || 840; // Default to Pro League

  console.log(`📊 Updating referee statistics for tournament ${tournamentId}...`);

  const refereeService = new RefereeDataService();
  const result = await refereeService.updateRefereeStatistics(tournamentId, false);

  console.log("✅ Referee statistics update completed!");
  console.log(`📊 Total referees: ${result.total}`);
  console.log(`✅ Successfully updated: ${result.completed}`);
  console.log(`❌ Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`⚠️ ${result.errors.length} errors occurred:`);
    result.errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more errors`);
    }
  }
}

function printUsage() {
  console.log(`
🏆 Referee Management Script

Usage: npm run manage:referees -- <command> [options]

Commands:
  clear                    Clear all referee data
  sync [tournamentId] [limit]     Sync referees for tournament (default: 840)
  status [tournamentId]           Get referee sync status (default: 840)
  missing [tournamentId]          Sync only missing referees (default: 840)
  update-stats [tournamentId]     Update statistics for existing referees (default: 840)

Examples:
  npm run manage:referees -- clear
  npm run manage:referees -- sync 840
  npm run manage:referees -- sync 840 5
  npm run manage:referees -- status 840
  npm run manage:referees -- missing 840
  npm run manage:referees -- update-stats 840

Tournament IDs:
  840  - Saudi Professional League (Pro League)
  1441 - Saudi Professional League (Season 2025)
  600  - Saudi Professional League (Season 2023)
  `);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

export { main };

