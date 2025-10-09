#!/usr/bin/env ts-node

/**
 * Script to sync match details for matches synced before a specific date
 * This addresses the gap between basic matches (668) and detailed matches (640)
 */

import { SyncerService } from "../syncer/syncer-clean.service";

async function main() {
  const syncer = new SyncerService();

  console.log("🚀 Starting comprehensive match sync...");

  try {
    // Comprehensive sync: Both basic and detailed matches
    console.log("\n🔄 Comprehensive Match Sync");
    const cutoffDate = new Date("2025-10-04T14:25:00Z");
    const result = await syncer.syncMatchesComprehensiveWithCutoff(cutoffDate);

    console.log("✅ Comprehensive sync completed:", {
      total: result.total,
      completed: result.completed,
      failed: result.failed,
    });

    console.log("\n🎉 Comprehensive match sync completed successfully!");
  } catch (error) {
    console.error("❌ Comprehensive match sync failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { main };

