import { SyncerService, SyncOptions } from "../syncer/syncer.service";

async function main() {
  const syncer = new SyncerService();

  try {
    console.log("🔄 Starting KoraStats incremental data update...");

    // Configure sync options for incremental update
    const syncOptions: SyncOptions = {
      // Sync all entities
      syncCountries: true,
      syncTournaments: true,
      syncTeams: true,
      syncPlayers: true,
      syncCoaches: true,
      syncReferees: true,
      syncMatches: true,

      // Performance options
      batchSize: 100,
      delayBetweenBatches: 500, // 0.5 seconds
      maxRetries: 2,

      // Incremental sync
      forceResync: false,
      skipExisting: true,
    };

    // Run incremental sync
    const progress = await syncer.incrementalSync(syncOptions);

    console.log("🎉 Incremental update completed!");
    console.log(`📊 Update Summary:`);
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
    console.error("💥 Incremental update failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

