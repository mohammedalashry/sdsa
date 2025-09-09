import { SyncerService, SyncOptions } from "../syncer/syncer.service";

async function main() {
  const syncer = new SyncerService();

  try {
    console.log("🎯 Starting selective KoraStats data sync...");

    // Get command line arguments
    const args = process.argv.slice(2);
    const tournamentIds = args.length > 0 ? args.map((id) => parseInt(id)) : undefined;
    const season = args.length > 1 ? args[1] : new Date().getFullYear().toString();

    if (tournamentIds) {
      console.log(`🎯 Syncing specific tournaments: ${tournamentIds.join(", ")}`);
    } else {
      console.log("🎯 Syncing all tournaments");
    }

    // Configure sync options for selective sync
    const syncOptions: SyncOptions = {
      // Specific tournament IDs
      tournamentIds: tournamentIds,
      season: season,

      // Sync all entities
      syncCountries: true,
      syncTournaments: true,
      syncTeams: true,
      syncPlayers: true,
      syncCoaches: true,
      syncReferees: true,
      syncMatches: true,

      // Performance options
      batchSize: 25,
      delayBetweenBatches: 2000, // 2 seconds
      maxRetries: 3,

      // Force sync for specific data
      forceResync: true,
      skipExisting: false,
    };

    // Run selective sync
    const progress = await syncer.fullSync(syncOptions);

    console.log("🎉 Selective sync completed!");
    console.log(`📊 Sync Summary:`);
    console.log(`   🎯 Tournaments: ${tournamentIds ? tournamentIds.join(", ") : "All"}`);
    console.log(`   📅 Season: ${season}`);
    console.log(`   ✅ Completed: ${progress.completed}`);
    console.log(`   ❌ Failed: ${progress.failed}`);
    console.log(
      `   ⏱️  Duration: ${progress.endTime ? Math.round((progress.endTime.getTime() - progress.startTime.getTime()) / 1000) : 0}s`,
    );

    if (progress.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${progress.errors.length}`);
      progress.errors.forEach((error) => console.log(`      - ${error}`));
    }

    process.exit(0);
  } catch (error) {
    console.error("💥 Selective sync failed:", error);
    process.exit(1);
  }
}

// Usage: npm run sync-specific 123 456 2024
// This will sync tournaments 123 and 456 for season 2024
console.log("Usage: npm run sync-specific [tournamentId1] [tournamentId2] ... [season]");
console.log("Example: npm run sync-specific 123 456 2024");

// Run if called directly
if (require.main === module) {
  main();
}

