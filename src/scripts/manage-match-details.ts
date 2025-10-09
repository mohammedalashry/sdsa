#!/usr/bin/env ts-node

/**
 * Script to manage MatchDetails data
 *
 * Usage:
 *   npm run manage:match-details clear -- --before-date="2025-01-01" --exclude-ids="123,456"
 *   npm run manage:match-details sync -- --skip-ids="123,456" --limit=10
 *   npm run manage:match-details clear-all
 *   npm run manage:match-details sync-all
 */

import { MatchDataService } from "../syncer/match-data.service";
import { KorastatsMongoService } from "../db/mogodb/connection";

interface ClearOptions {
  beforeDate?: string;
  afterDate?: string;
  excludeIds?: string;
  includeIds?: string;
  tournamentId?: string;
}

interface SyncOptions {
  skipIds?: string;
  includeIds?: string;
  tournamentId?: string;
  limit?: string;
  forceResync?: boolean;
}

async function clearMatchDetails(options: ClearOptions) {
  console.log("🗑️ Starting MatchDetails cleanup...");

  const clearOptions: any = {};

  if (options.beforeDate) {
    clearOptions.beforeDate = new Date(options.beforeDate);
  }
  if (options.afterDate) {
    clearOptions.afterDate = new Date(options.afterDate);
  }
  if (options.tournamentId) {
    clearOptions.tournamentId = parseInt(options.tournamentId);
  }
  if (options.excludeIds) {
    clearOptions.excludeIds = options.excludeIds
      .split(",")
      .map((id) => parseInt(id.trim()));
  }
  if (options.includeIds) {
    clearOptions.includeIds = options.includeIds
      .split(",")
      .map((id) => parseInt(id.trim()));
  }

  console.log("Clear options:", clearOptions);

  const matchDataService = new MatchDataService();
  const result = await matchDataService.clearMatchDetails(clearOptions);

  console.log(`✅ Successfully cleared ${result.deletedCount} MatchDetails records`);
}

async function syncDetailedMatches(options: SyncOptions) {
  console.log("📊 Starting detailed match sync...");

  const syncOptions: any = {};

  if (options.tournamentId) {
    syncOptions.tournamentId = parseInt(options.tournamentId);
  }
  if (options.limit) {
    syncOptions.limit = parseInt(options.limit);
  }
  if (options.forceResync) {
    syncOptions.forceResync = true;
  }
  if (options.skipIds) {
    syncOptions.skipIds = options.skipIds.split(",").map((id) => parseInt(id.trim()));
  }
  if (options.includeIds) {
    syncOptions.includeIds = options.includeIds
      .split(",")
      .map((id) => parseInt(id.trim()));
  }

  console.log("Sync options:", syncOptions);

  const matchDataService = new MatchDataService();
  const result = await matchDataService.syncAllDetailedMatches(syncOptions);

  console.log(`✅ Detailed sync completed:`, {
    total: result.total,
    completed: result.completed,
    failed: result.failed,
    duration: result.endTime ? result.endTime.getTime() - result.startTime!.getTime() : 0,
  });
}

async function clearAllMatchDetails() {
  console.log("🗑️ Clearing ALL MatchDetails...");

  const matchDataService = new MatchDataService();
  const result = await matchDataService.clearMatchDetails();

  console.log(`✅ Successfully cleared ${result.deletedCount} MatchDetails records`);
}

async function syncAllDetailedMatches() {
  console.log("📊 Syncing detailed matches for ALL basic matches...");

  const matchDataService = new MatchDataService();
  const result = await matchDataService.syncAllDetailedMatches();

  console.log(`✅ Detailed sync completed:`, {
    total: result.total,
    completed: result.completed,
    failed: result.failed,
    duration: result.endTime ? result.endTime.getTime() - result.startTime!.getTime() : 0,
  });
}

function parseArgs(): { command: string; options: any } {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error("❌ No command provided");
    printUsage();
    process.exit(1);
  }

  const options: any = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      options[key] = value || true;
    }
  }

  return { command, options };
}

function printUsage() {
  console.log(`
📋 MatchDetails Management Script

Commands:
  clear       - Clear MatchDetails with optional filters
  sync        - Sync detailed matches with optional filters  
  clear-all   - Clear ALL MatchDetails
  sync-all    - Sync detailed matches for ALL basic matches

Clear Options:
  --before-date="YYYY-MM-DD"     - Clear records created before this date
  --after-date="YYYY-MM-DD"      - Clear records created after this date
  --exclude-ids="123,456,789"    - Skip these match IDs
  --include-ids="123,456,789"    - Only these match IDs
  --tournament-id="840"          - Only this tournament

Sync Options:
  --skip-ids="123,456,789"       - Skip these match IDs
  --include-ids="123,456,789"    - Only these match IDs
  --tournament-id="840"          - Only this tournament
  --limit="10"                   - Limit number of matches
  --force-resync                 - Force resync even if exists

Examples:
  npm run manage:match-details clear -- --before-date="2025-01-01" --exclude-ids="123,456"
  npm run manage:match-details sync -- --skip-ids="123,456" --limit=10
  npm run manage:match-details clear-all
  npm run manage:match-details sync-all
`);
}

async function main() {
  const { command, options } = parseArgs();

  const mongoService = new KorastatsMongoService();

  try {
    await mongoService.connect();
    console.log("✅ Connected to MongoDB");

    switch (command) {
      case "clear":
        await clearMatchDetails(options);
        break;
      case "sync":
        await syncDetailedMatches(options);
        break;
      case "clear-all":
        await clearAllMatchDetails();
        break;
      case "sync-all":
        await syncAllDetailedMatches();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await mongoService.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

