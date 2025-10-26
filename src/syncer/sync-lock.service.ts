// src/syncer/sync-lock.service.ts
// Lock mechanism to prevent concurrent syncs

import fs from "fs";
import path from "path";

export interface SyncLockInfo {
  processId: number;
  syncType: "full" | "matches" | "new-matches-check";
  startTime: string;
  lastUpdate: string;
  phase: string;
  progress?: {
    total?: number;
    completed?: number;
    current?: string;
  };
  metrics?: {
    matchesInDB?: number;
    matchesInKoraStats?: number;
    newMatchesFound?: number;
    leaguesSynced?: number;
    teamsSynced?: number;
    playersSynced?: number;
  };
}

export class SyncLockService {
  private lockFilePath: string;
  private lockCheckInterval: number = 60000; // Check every 1 minute

  constructor() {
    // Store lock file in logs directory
    this.lockFilePath = path.join(process.cwd(), "logs", "sync-lock.json");

    // Ensure logs directory exists
    const logsDir = path.dirname(this.lockFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Check if a sync is currently running
   */
  isLocked(): boolean {
    try {
      if (!fs.existsSync(this.lockFilePath)) {
        return false;
      }

      const lockData = this.readLockFile();
      if (!lockData) {
        return false;
      }

      // Check if process is still alive
      try {
        process.kill(lockData.processId, 0); // Signal 0 just checks if process exists
        return true;
      } catch {
        // Process doesn't exist, lock is stale
        this.releaseLock();
        return false;
      }
    } catch (error) {
      console.error("Error checking lock:", error);
      return false;
    }
  }

  /**
   * Acquire a lock
   */
  async acquireLock(syncType: SyncLockInfo["syncType"], phase: string): Promise<void> {
    if (this.isLocked()) {
      const existingLock = this.readLockFile();
      throw new Error(
        `Sync is already running: ${existingLock?.syncType} (started: ${existingLock?.startTime})`,
      );
    }

    const lockInfo: SyncLockInfo = {
      processId: process.pid,
      syncType,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      phase,
    };

    this.writeLockFile(lockInfo);
    console.log(`🔒 Lock acquired: ${syncType} (PID: ${process.pid})`);
  }

  /**
   * Update lock information
   */
  updateLock(
    phase: string,
    progress?: SyncLockInfo["progress"],
    metrics?: SyncLockInfo["metrics"],
  ): void {
    if (!this.isLocked()) {
      console.warn("⚠️ No lock to update");
      return;
    }

    const lockInfo = this.readLockFile();
    if (!lockInfo || lockInfo.processId !== process.pid) {
      return; // Not our lock
    }

    lockInfo.lastUpdate = new Date().toISOString();
    lockInfo.phase = phase;
    if (progress) lockInfo.progress = { ...lockInfo.progress, ...progress };
    if (metrics) lockInfo.metrics = { ...lockInfo.metrics, ...metrics };

    this.writeLockFile(lockInfo);
  }

  /**
   * Release the lock
   */
  releaseLock(): void {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
        console.log("🔓 Lock released");
      }
    } catch (error) {
      console.error("Error releasing lock:", error);
    }
  }

  /**
   * Get current lock status
   */
  getLockStatus(): SyncLockInfo | null {
    if (!this.isLocked()) {
      return null;
    }
    return this.readLockFile();
  }

  /**
   * Read lock file
   */
  private readLockFile(): SyncLockInfo | null {
    try {
      const data = fs.readFileSync(this.lockFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Write lock file
   */
  private writeLockFile(lockInfo: SyncLockInfo): void {
    try {
      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockInfo, null, 2));
    } catch (error) {
      console.error("Error writing lock file:", error);
    }
  }

  /**
   * Start monitoring lock updates (to keep the lock alive)
   */
  startMonitoring(): void {
    setInterval(() => {
      if (this.isLocked()) {
        const lockInfo = this.readLockFile();
        if (lockInfo && lockInfo.processId === process.pid) {
          lockInfo.lastUpdate = new Date().toISOString();
          this.writeLockFile(lockInfo);
        }
      }
    }, this.lockCheckInterval);

    // Release lock on process exit
    process.on("exit", () => {
      this.releaseLock();
    });

    process.on("SIGINT", () => {
      this.releaseLock();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      this.releaseLock();
      process.exit(0);
    });
  }
}

