import { SyncerService, SyncOptions } from "../syncer/syncer.service";

async function main() {
  const syncer = new SyncerService();

  try {
    console.log("🎯 Starting KoraStats data collection...");

    // Configure sync options
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
      batchSize: 50,
      delayBetweenBatches: 1000, // 1 second
      maxRetries: 3,

      // Force full sync
      forceResync: true,
      skipExisting: false,
    };

    // Run full sync
    const progress = await syncer.fullSync(syncOptions);

    console.log("🎉 Data collection completed!");
    console.log(`📊 Sync Summary:`);
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
    console.error("💥 Collection failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

