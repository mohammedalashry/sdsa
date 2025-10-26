// src/syncer/scheduled-sync.service.ts
// Scheduled sync orchestrator for automatic data synchronization

import { SyncerService, SyncOptions, SyncProgress } from "./syncer-clean.service";
import { SyncLockService } from "./sync-lock.service";
import { Models } from "@/db/mogodb/models";

export interface ScheduledSyncConfig {
  // Weekly full sync (from deployment)
  runOnDeployment: boolean;
  weeklyIntervalHours: number; // e.g., 168 = 1 week

  // Matches sync every 2 days
  matchesSyncIntervalHours: number; // e.g., 48 = 2 days

  // Check for new matches every 3 hours
  newMatchesCheckIntervalHours: number; // e.g., 3 hours
}

export interface SyncMetrics {
  matchesInDB: number;
  matchesInKoraStats: number;
  leaguesSynced: number;
  teamsSynced: number;
  playersSynced: number;
  coachesSynced: number;
  refereesSynced: number;
}

export class ScheduledSyncService {
  private syncer: SyncerService;
  private lockService: SyncLockService;
  private config: ScheduledSyncConfig;

  private fullSyncTimer: NodeJS.Timeout | null = null;
  private matchesSyncTimer: NodeJS.Timeout | null = null;
  private newMatchesCheckTimer: NodeJS.Timeout | null = null;

  private lastFullSyncTime: Date | null = null;
  private lastMatchesSyncTime: Date | null = null;
  private lastNewMatchesCheckTime: Date | null = null;

  constructor(config?: Partial<ScheduledSyncConfig>) {
    this.syncer = new SyncerService();
    this.lockService = new SyncLockService();
    this.config = {
      runOnDeployment: true,
      weeklyIntervalHours: 168, // 1 week
      matchesSyncIntervalHours: 48, // 2 days
      newMatchesCheckIntervalHours: 3, // 3 hours
      ...config,
    };
  }

  /**
   * Start all scheduled syncs
   */
  startScheduledSyncs(): void {
    console.log("🚀 Starting scheduled sync services...");

    // Start lock monitoring
    this.lockService.startMonitoring();

    // Run on deployment if configured
    if (this.config.runOnDeployment) {
      console.log("📅 Scheduling deployment sync...");
      this.runFullSync();
    }

    // Schedule weekly full sync
    this.scheduleWeeklyFullSync();

    // Schedule matches sync (every 2 days)
    this.scheduleMatchesSync();

    // Schedule new matches check (every 3 hours)
    this.scheduleNewMatchesCheck();

    console.log("✅ All scheduled syncs started");
  }

  /**
   * Stop all scheduled syncs
   */
  stopScheduledSyncs(): void {
    if (this.fullSyncTimer) clearInterval(this.fullSyncTimer);
    if (this.matchesSyncTimer) clearInterval(this.matchesSyncTimer);
    if (this.newMatchesCheckTimer) clearInterval(this.newMatchesCheckTimer);

    this.lockService.releaseLock();
    console.log("🛑 All scheduled syncs stopped");
  }

  /**
   * Schedule weekly full sync
   */
  private scheduleWeeklyFullSync(): void {
    const intervalMs = this.config.weeklyIntervalHours * 60 * 60 * 1000;

    this.fullSyncTimer = setInterval(() => {
      this.runFullSync();
    }, intervalMs);

    console.log(
      `📅 Weekly full sync scheduled (every ${this.config.weeklyIntervalHours} hours)`,
    );
  }

  /**
   * Schedule matches sync (every 2 days)
   */
  private scheduleMatchesSync(): void {
    const intervalMs = this.config.matchesSyncIntervalHours * 60 * 60 * 1000;

    this.matchesSyncTimer = setInterval(() => {
      this.runMatchesSync();
    }, intervalMs);

    console.log(
      `📅 Matches sync scheduled (every ${this.config.matchesSyncIntervalHours} hours)`,
    );
  }

  /**
   * Schedule new matches check (every 3 hours)
   */
  private scheduleNewMatchesCheck(): void {
    const intervalMs = this.config.newMatchesCheckIntervalHours * 60 * 60 * 1000;

    // Run first check after 3 hours
    setTimeout(() => {
      this.checkForNewMatches();
    }, intervalMs);

    this.newMatchesCheckTimer = setInterval(() => {
      this.checkForNewMatches();
    }, intervalMs);

    console.log(
      `📅 New matches check scheduled (every ${this.config.newMatchesCheckIntervalHours} hours)`,
    );
  }

  /**
   * Run full sync (all data)
   */
  private async runFullSync(): Promise<void> {
    if (this.lockService.isLocked()) {
      console.log("⏭️  Sync already running, skipping full sync");
      return;
    }

    console.log("🔄 Starting full sync...");

    try {
      await this.lockService.acquireLock("full", "Initializing full sync");

      // Log metrics before sync
      const metricsBefore = await this.getMetrics();
      this.logMetrics("Before full sync", metricsBefore);

      // Run sync
      const progress = await this.syncer.fullSync({});

      // Log results
      this.logSyncProgress("Full sync", progress);

      // Log metrics after sync
      const metricsAfter = await this.getMetrics();
      this.logMetrics("After full sync", metricsAfter);

      this.lastFullSyncTime = new Date();
      console.log("✅ Full sync completed");
    } catch (error) {
      console.error("❌ Full sync failed:", error);
    } finally {
      this.lockService.releaseLock();
    }
  }

  /**
   * Run matches sync (every 2 days, but only if no full sync is running)
   */
  private async runMatchesSync(): Promise<void> {
    if (this.lockService.isLocked()) {
      console.log("⏭️  Sync already running (likely full sync), skipping matches sync");
      return;
    }

    console.log("⚽ Starting matches sync...");

    try {
      await this.lockService.acquireLock("matches", "Initializing matches sync");

      // Log metrics before sync
      const metricsBefore = await this.getMetrics();
      this.logMetrics("Before matches sync", metricsBefore);

      // Run sync
      this.lockService.updateLock("Syncing matches", { current: "Loading matches..." });

      const progress = await this.syncer.syncMatchesComprehensive({});

      // Log results
      this.logSyncProgress("Matches sync", progress);

      // Log metrics after sync
      const metricsAfter = await this.getMetrics();
      this.logMetrics("After matches sync", metricsAfter);

      this.lastMatchesSyncTime = new Date();
      console.log("✅ Matches sync completed");
    } catch (error) {
      console.error("❌ Matches sync failed:", error);
    } finally {
      this.lockService.releaseLock();
    }
  }

  /**
   * Check for new matches (every 3 hours, but only if no sync is running)
   */
  private async checkForNewMatches(): Promise<void> {
    if (this.lockService.isLocked()) {
      console.log("⏭️  Sync already running, skipping new matches check");
      return;
    }

    console.log("🔍 Checking for new matches...");

    try {
      await this.lockService.acquireLock("new-matches-check", "Checking for new matches");

      // Get current matches in DB
      const matchesInDB = await Models.Match.countDocuments({});

      this.lockService.updateLock("Checking new matches", undefined, {
        matchesInDB,
      });

      console.log(`📊 Current matches in DB: ${matchesInDB}`);

      // For now, just log the count
      // In production, you would:
      // 1. Get latest matches from KoraStats
      // 2. Compare with DB
      // 3. Sync only new matches

      console.log("✅ New matches check completed");

      this.lastNewMatchesCheckTime = new Date();
    } catch (error) {
      console.error("❌ New matches check failed:", error);
    } finally {
      this.lockService.releaseLock();
    }
  }

  /**
   * Get sync metrics
   */
  private async getMetrics(): Promise<SyncMetrics> {
    const [matchesInDB, leaguesInDB, teamsInDB, playersInDB, coachesInDB, refereesInDB] =
      await Promise.all([
        Models.Match.countDocuments({}),
        Models.League.countDocuments({}),
        Models.Team.countDocuments({}),
        Models.Player.countDocuments({}),
        Models.Coach.countDocuments({}),
        Models.Referee.countDocuments({}),
      ]);

    return {
      matchesInDB,
      matchesInKoraStats: 0, // Would need to fetch from KoraStats API
      leaguesSynced: leaguesInDB,
      teamsSynced: teamsInDB,
      playersSynced: playersInDB,
      coachesSynced: coachesInDB,
      refereesSynced: refereesInDB,
    };
  }

  /**
   * Log sync metrics
   */
  private logMetrics(stage: string, metrics: SyncMetrics): void {
    console.log(`\n📊 Metrics ${stage}:`);
    console.log(`  - Matches in DB: ${metrics.matchesInDB}`);
    console.log(`  - Leagues: ${metrics.leaguesSynced}`);
    console.log(`  - Teams: ${metrics.teamsSynced}`);
    console.log(`  - Players: ${metrics.playersSynced}`);
    console.log(`  - Coaches: ${metrics.coachesSynced}`);
    console.log(`  - Referees: ${metrics.refereesSynced}`);
  }

  /**
   * Log sync progress
   */
  private logSyncProgress(syncType: string, progress: SyncProgress): void {
    console.log(`\n${syncType} Progress:`);
    console.log(`  - Total: ${progress.total}`);
    console.log(`  - Completed: ${progress.completed}`);
    console.log(`  - Failed: ${progress.failed}`);
    console.log(`  - Current: ${progress.current}`);

    if (progress.errors && progress.errors.length > 0) {
      console.log(`  - Errors: ${progress.errors.length}`);
      progress.errors.slice(0, 5).forEach((error) => {
        console.log(`    - ${error}`);
      });
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    lockInfo: any;
    lastFullSync: Date | null;
    lastMatchesSync: Date | null;
    lastNewMatchesCheck: Date | null;
    metrics: Promise<SyncMetrics>;
  } {
    return {
      isRunning: this.lockService.isLocked(),
      lockInfo: this.lockService.getLockStatus(),
      lastFullSync: this.lastFullSyncTime,
      lastMatchesSync: this.lastMatchesSyncTime,
      lastNewMatchesCheck: this.lastNewMatchesCheckTime,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Manually trigger full sync
   */
  async triggerFullSync(): Promise<void> {
    await this.runFullSync();
  }

  /**
   * Manually trigger matches sync
   */
  async triggerMatchesSync(): Promise<void> {
    await this.runMatchesSync();
  }

  /**
   * Manually trigger new matches check
   */
  async triggerNewMatchesCheck(): Promise<void> {
    await this.checkForNewMatches();
  }
}

