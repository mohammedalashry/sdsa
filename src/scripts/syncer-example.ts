/**
 * SDSA Syncer Usage Examples
 *
 * This file shows different ways to use the syncer service
 */

import { SyncerService } from "../syncer/syncer-clean.service";
import { connectToDatabase } from "../db/mogodb/connection";

async function exampleUsage() {
  console.log("🚀 SDSA Syncer Examples");

  try {
    // 1. Connect to database
    await connectToDatabase();
    console.log("✅ Database connected");

    // 2. Initialize syncer
    const syncer = new SyncerService();

    // 3. Example 1: Sync only leagues
    console.log("\n📋 Example 1: Sync Leagues Only");
    const leagueResult = await syncer.syncTournamentsComprehensive();
    console.log("Leagues synced:", leagueResult);

    // 4. Example 2: Sync matches for a specific tournament
    console.log("\n📋 Example 2: Sync Matches");
    const matchResult = await syncer.syncMatchesComprehensive();
    console.log("Matches synced:", matchResult);

    // 5. Example 3: Sync teams with progress tracking
    console.log("\n📋 Example 3: Sync Teams with Progress");
    const teamResult = await syncer.syncTeamsComprehensive();
    console.log("Teams synced:", teamResult);

    // 6. Example 4: Sync players
    console.log("\n📋 Example 4: Sync Players");
    const playerResult = await syncer.syncPlayersComprehensive();
    console.log("Players synced:", playerResult);

    // 7. Example 5: Check what data is available
    console.log("\n📋 Example 5: Data Summary");
    console.log("✅ All sync operations completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run examples
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };

