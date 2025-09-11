// src/syncer/entity-data.service.ts
// Service to collect and store player, coach, and referee data with photos

import { KorastatsService } from "../integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { ApiError } from "../core/middleware/error.middleware";

export interface EntityDataOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  forceResync?: boolean;
  skipExisting?: boolean;
  limit?: number; // Add limit option for testing
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  errors: string[];
  current: string;
  startTime: Date;
  endTime?: Date;
}

export class EntityDataService {
  private korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  /**
   * Clean entity name for better Arabic translation
   */
  private cleanEntityName(name: string): string {
    if (!name) return "Unknown";

    // Remove common suffixes and clean up
    let cleanName = name
      .replace(/\s+(Jr\.|Sr\.|III|II|I)\s*$/i, "") // Remove generational suffixes
      .replace(/\s+(FC|SC|Club|United|City|Town|Athletic|Sporting)\s*$/i, "") // Remove team suffixes
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    // Handle common name patterns
    if (cleanName.includes(",")) {
      // "Last, First" format - convert to "First Last"
      const parts = cleanName.split(",");
      if (parts.length === 2) {
        cleanName = `${parts[1].trim()} ${parts[0].trim()}`;
      }
    }

    // Clean up complex names for better Arabic translation
    cleanName = this.simplifyComplexName(cleanName);

    return cleanName;
  }

  /**
   * Simplify complex names for better Arabic translation
   */
  private simplifyComplexName(name: string): string {
    // Handle very long names by keeping only essential parts
    const words = name.split(" ");

    if (words.length <= 2) {
      return name; // Keep short names as is
    }

    // For long names, try to keep the most important parts
    if (words.length > 4) {
      // Keep first name and last name, skip middle names
      const firstWord = words[0];
      const lastWord = words[words.length - 1];

      // If last word looks like a family name (starts with capital and is longer)
      if (lastWord.length > 3 && /^[A-Z]/.test(lastWord)) {
        return `${firstWord} ${lastWord}`;
      }

      // Otherwise, keep first two words
      return `${firstWord} ${words[1]}`;
    }

    // For 3-4 word names, remove common middle name patterns
    const filteredWords = words.filter((word) => {
      // Remove very short words that are likely middle names
      if (word.length <= 2) return false;

      // Remove common middle name patterns
      const middleNamePatterns = [
        /^bin$/i,
        /^ibn$/i,
        /^al$/i,
        /^el$/i,
        /^da$/i,
        /^de$/i,
        /^del$/i,
        /^dos$/i,
        /^van$/i,
        /^von$/i,
        /^le$/i,
        /^la$/i,
        /^du$/i,
        /^des$/i,
      ];

      return !middleNamePatterns.some((pattern) => pattern.test(word));
    });

    return filteredWords.join(" ");
  }

  /**
   * Get entity photo using ImageLoad
   */
  private async getEntityPhoto(
    entityType: "player" | "coach" | "referee",
    entityId: number,
  ): Promise<string> {
    try {
      return await this.korastatsService.getImageUrl(entityType, entityId);
    } catch (error) {
      console.warn(
        `⚠️ Failed to get ${entityType} photo for ID ${entityId}:`,
        error.message,
      );
      return "";
    }
  }

  /**
   * Sync players data with photos
   */
  async syncPlayersData(options: EntityDataOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting players data sync...",
      startTime: new Date(),
    };

    try {
      console.log("👤 Starting players data sync...");

      // Get all unique player IDs from matches
      const matches = await Models.Match.find({}, { "playersStats.player.id": 1 });
      const playerIds = new Set<number>();

      matches.forEach((match) => {
        match.playersStats?.forEach((playerStat: any) => {
          if (playerStat.player?.id) {
            playerIds.add(playerStat.player.id);
          }
        });
      });

      let uniquePlayerIds = Array.from(playerIds);

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        uniquePlayerIds = uniquePlayerIds.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} players`);
      }

      progress.total = uniquePlayerIds.length;
      progress.current = `Processing ${progress.total} players...`;

      console.log(`Found ${uniquePlayerIds.length} unique players to sync`);

      // Process players in batches
      const batchSize = options.batchSize || 10;
      const delayBetweenBatches = options.delayBetweenBatches || 1000;

      for (let i = 0; i < uniquePlayerIds.length; i += batchSize) {
        const batch = uniquePlayerIds.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (playerId) => {
            try {
              // Check if player already exists
              if (!options.forceResync) {
                const existing = await Models.Player.findOne({ korastats_id: playerId });
                if (existing && options.skipExisting) {
                  progress.completed++;
                  return;
                }
              }

              // Get player entity data
              const playerEntity = await this.korastatsService.getEntityPlayer(playerId);
              const playerResponse = playerEntity as any; // Type assertion for actual API response structure
              if (!playerResponse?.root?.object) {
                console.warn(`No entity data found for player ${playerId}`);
                progress.completed++;
                return;
              }

              const playerData = playerResponse.root.object;

              // Get player photo
              const playerPhoto = await this.getEntityPhoto("player", playerId);

              // Clean player name
              const cleanName = this.cleanEntityName(
                playerData.fullname || "Unknown Player",
              );

              // Parse age from string format like "39 Y"
              const ageMatch = playerData.age?.match(/(\d+)/);
              const age = ageMatch ? parseInt(ageMatch[1]) : null;

              // Prepare player data for MongoDB
              const playerDoc = {
                korastats_id: playerId,
                name: cleanName,
                nickname: playerData.nickname || null,
                firstname: cleanName.split(" ")[0] || "",
                lastname: cleanName.split(" ").slice(1).join(" ") || "",
                age: age,
                birth: {
                  date: playerData.dob || null,
                  place: null, // Not available in Korastats API
                  country: playerData.nationality?.name || null,
                },
                nationality: playerData.nationality?.name || null,
                height: null, // Not available in Korastats API
                weight: null, // Not available in Korastats API
                injured: false, // Not available in Korastats API
                photo: playerPhoto,
                last_synced: new Date(),
                sync_version: 1,
              };

              // Save to MongoDB
              await Models.Player.findOneAndUpdate(
                { korastats_id: playerId },
                playerDoc,
                { upsert: true, new: true },
              );

              console.log(`✅ Synced player: ${cleanName}`);
              progress.completed++;
            } catch (error) {
              console.error(`❌ Failed to sync player ${playerId}:`, error.message);
              progress.failed++;
              progress.errors.push(`Player ${playerId}: ${error.message}`);
            }
          }),
        );

        // Delay between batches
        if (i + batchSize < uniquePlayerIds.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      progress.endTime = new Date();
      console.log(
        `✅ Players sync completed: ${progress.completed}/${progress.total} players synced`,
      );
      return progress;
    } catch (error) {
      console.error("❌ Players sync failed:", error);
      progress.errors.push(`Sync failed: ${error.message}`);
      progress.endTime = new Date();
      return progress;
    }
  }

  /**
   * Sync coaches data with photos
   */
  async syncCoachesData(options: EntityDataOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting coaches data sync...",
      startTime: new Date(),
    };

    try {
      console.log("👨‍💼 Starting coaches data sync...");

      // Get all unique coach IDs from TournamentCoachesList
      const tournaments = await Models.Tournament.find({}, { korastats_id: 1 });
      const coachIds = new Set<number>();

      // Get coaches from all tournaments
      for (const tournament of tournaments) {
        try {
          const coachesList = await this.korastatsService.getTournamentCoachList(
            tournament.korastats_id,
          );
          if (coachesList?.data && Array.isArray(coachesList.data)) {
            coachesList.data.forEach((coach: any) => {
              if (coach.id) {
                coachIds.add(coach.id);
              }
            });
          }
        } catch (error) {
          console.warn(
            `Failed to get coaches for tournament ${tournament.korastats_id}:`,
            error.message,
          );
        }
      }

      let uniqueCoachIds = Array.from(coachIds);

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        uniqueCoachIds = uniqueCoachIds.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} coaches`);
      }

      progress.total = uniqueCoachIds.length;
      progress.current = `Processing ${progress.total} coaches...`;

      console.log(`Found ${uniqueCoachIds.length} unique coaches to sync`);

      // Process coaches in batches
      const batchSize = options.batchSize || 10;
      const delayBetweenBatches = options.delayBetweenBatches || 1000;

      for (let i = 0; i < uniqueCoachIds.length; i += batchSize) {
        const batch = uniqueCoachIds.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (coachId) => {
            try {
              // Check if coach already exists
              if (!options.forceResync) {
                const existing = await Models.Coach.findOne({ korastats_id: coachId });
                if (existing && options.skipExisting) {
                  progress.completed++;
                  return;
                }
              }

              // Get coach entity data
              const coachEntity = await this.korastatsService.getEntityCoach(coachId);
              const coachResponse = coachEntity as any; // Type assertion for actual API response structure
              if (!coachResponse?.root?.object) {
                console.warn(`No entity data found for coach ${coachId}`);
                progress.completed++;
                return;
              }

              const coachData = coachResponse.root.object;

              // Get coach photo
              const coachPhoto = await this.getEntityPhoto("coach", coachId);

              // Clean coach name
              const cleanName = this.cleanEntityName(
                coachData.fullname || "Unknown Coach",
              );

              // Parse age from string format like "56 Y"
              const ageMatch = coachData.age?.match(/(\d+)/);
              const age = ageMatch ? parseInt(ageMatch[1]) : null;

              // Prepare coach data for MongoDB
              const coachDoc = {
                korastats_id: coachId,
                name: cleanName,
                nickname: coachData.nickname || null,
                firstname: cleanName.split(" ")[0] || "",
                lastname: cleanName.split(" ").slice(1).join(" ") || "",
                age: age,
                birth: {
                  date: coachData.dob || null,
                  place: null, // Not available in Korastats API
                  country: coachData.nationality?.name || null,
                },
                nationality: coachData.nationality?.name || null,
                photo: coachPhoto,
                last_synced: new Date(),
                sync_version: 1,
              };

              // Save to MongoDB
              await Models.Coach.findOneAndUpdate({ korastats_id: coachId }, coachDoc, {
                upsert: true,
                new: true,
              });

              console.log(`✅ Synced coach: ${cleanName}`);
              progress.completed++;
            } catch (error) {
              console.error(`❌ Failed to sync coach ${coachId}:`, error.message);
              progress.failed++;
              progress.errors.push(`Coach ${coachId}: ${error.message}`);
            }
          }),
        );

        // Delay between batches
        if (i + batchSize < uniqueCoachIds.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      progress.endTime = new Date();
      console.log(
        `✅ Coaches sync completed: ${progress.completed}/${progress.total} coaches synced`,
      );
      return progress;
    } catch (error) {
      console.error("❌ Coaches sync failed:", error);
      progress.errors.push(`Sync failed: ${error.message}`);
      progress.endTime = new Date();
      return progress;
    }
  }

  /**
   * Sync referees data with photos
   */
  async syncRefereesData(options: EntityDataOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting referees data sync...",
      startTime: new Date(),
    };

    try {
      console.log("👨‍⚖️ Starting referees data sync...");

      // Get all unique referee IDs from matches
      const matches = await Models.Match.find({}, { "referee.id": 1 });
      const refereeIds = new Set<number>();

      matches.forEach((match) => {
        if (match.referee?.id) {
          refereeIds.add(match.referee.id);
        }
      });

      let uniqueRefereeIds = Array.from(refereeIds);

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        uniqueRefereeIds = uniqueRefereeIds.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} referees`);
      }

      progress.total = uniqueRefereeIds.length;
      progress.current = `Processing ${progress.total} referees...`;

      console.log(`Found ${uniqueRefereeIds.length} unique referees to sync`);

      // Process referees in batches
      const batchSize = options.batchSize || 10;
      const delayBetweenBatches = options.delayBetweenBatches || 1000;

      for (let i = 0; i < uniqueRefereeIds.length; i += batchSize) {
        const batch = uniqueRefereeIds.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (refereeId) => {
            try {
              // Check if referee already exists
              if (!options.forceResync) {
                const existing = await Models.Referee.findOne({
                  korastats_id: refereeId,
                });
                if (existing && options.skipExisting) {
                  progress.completed++;
                  return;
                }
              }

              // Get referee entity data
              const refereeEntity =
                await this.korastatsService.getEntityReferee(refereeId);
              const refereeResponse = refereeEntity as any; // Type assertion for actual API response structure
              if (!refereeResponse?.root?.object) {
                console.warn(`No entity data found for referee ${refereeId}`);
                progress.completed++;
                return;
              }

              const refereeData = refereeResponse.root.object;

              // Get referee photo
              const refereePhoto = await this.getEntityPhoto("referee", refereeId);

              // Clean referee name
              const cleanName = this.cleanEntityName(
                refereeData.fullname || "Unknown Referee",
              );

              // Parse age from string format like "56 Y"
              const ageMatch = refereeData.age?.match(/(\d+)/);
              const age = ageMatch ? parseInt(ageMatch[1]) : null;

              // Prepare referee data for MongoDB
              const refereeDoc = {
                korastats_id: refereeId,
                name: cleanName,
                nickname: refereeData.nickname || null,
                firstname: cleanName.split(" ")[0] || "",
                lastname: cleanName.split(" ").slice(1).join(" ") || "",
                age: age,
                birth: {
                  date: refereeData.dob || null,
                  place: null, // Not available in Korastats API
                  country: refereeData.nationality?.name || null,
                },
                nationality: refereeData.nationality?.name || null,
                photo: refereePhoto,
                last_synced: new Date(),
                sync_version: 1,
              };

              // Save to MongoDB
              await Models.Referee.findOneAndUpdate(
                { korastats_id: refereeId },
                refereeDoc,
                { upsert: true, new: true },
              );

              console.log(`✅ Synced referee: ${cleanName}`);
              progress.completed++;
            } catch (error) {
              console.error(`❌ Failed to sync referee ${refereeId}:`, error.message);
              progress.failed++;
              progress.errors.push(`Referee ${refereeId}: ${error.message}`);
            }
          }),
        );

        // Delay between batches
        if (i + batchSize < uniqueRefereeIds.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      progress.endTime = new Date();
      console.log(
        `✅ Referees sync completed: ${progress.completed}/${progress.total} referees synced`,
      );
      return progress;
    } catch (error) {
      console.error("❌ Referees sync failed:", error);
      progress.errors.push(`Sync failed: ${error.message}`);
      progress.endTime = new Date();
      return progress;
    }
  }

  /**
   * Sync all entity data (players, coaches, referees)
   */
  async syncAllEntityData(options: EntityDataOptions = {}): Promise<SyncProgress> {
    console.log("🔄 Starting comprehensive entity data sync...");

    const [playersProgress, coachesProgress, refereesProgress] = await Promise.all([
      this.syncPlayersData(options),
      this.syncCoachesData(options),
      this.syncRefereesData(options),
    ]);

    const totalProgress: SyncProgress = {
      total: playersProgress.total + coachesProgress.total + refereesProgress.total,
      completed:
        playersProgress.completed +
        coachesProgress.completed +
        refereesProgress.completed,
      failed: playersProgress.failed + coachesProgress.failed + refereesProgress.failed,
      errors: [
        ...playersProgress.errors,
        ...coachesProgress.errors,
        ...refereesProgress.errors,
      ],
      current: "Entity data sync completed",
      startTime: playersProgress.startTime,
      endTime: new Date(),
    };

    console.log(
      `✅ All entity data sync completed: ${totalProgress.completed}/${totalProgress.total} entities synced`,
    );
    return totalProgress;
  }
}

