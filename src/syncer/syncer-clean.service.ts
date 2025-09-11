// src/syncer/syncer-clean.service.ts
// Clean syncer service with working methods only

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import { ApiError } from "../core/middleware/error.middleware";
import { FixtureNew } from "@/mapper/fixtureNew";
import { MongoStorageService } from "./mongo-storage.service";
import { MatchDataService } from "./match-data.service";
import { TournamentDataService } from "./tournament-data.service";
import { LeagueNew } from "@/mapper/leagueNew";
import { EntityDataService } from "./entity-data.service";

export interface SyncOptions {
  // Tournament/League options
  tournamentIds?: number[];
  season?: string;

  // Team options
  teamIds?: number[];

  // Date range options
  dateFrom?: string;
  dateTo?: string;

  // Sync scope options
  syncTournaments?: boolean;
  syncMatches?: boolean;
  syncPlayers?: boolean;
  syncTeams?: boolean;
  syncCoaches?: boolean;
  syncReferees?: boolean;
  syncCountries?: boolean;

  // Performance options
  batchSize?: number;
  delayBetweenBatches?: number;
  maxRetries?: number;

  // Force options
  forceResync?: boolean;
  skipExisting?: boolean;

  // Testing options
  limit?: number; // Limit number of items to process for testing
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

export class SyncerService {
  private korastatsService: KorastatsService;
  private mongoService: KorastatsMongoService;
  private cacheService: CacheService;
  private leagueLogoService: LeagueLogoService;
  private entityDataService: EntityDataService;
  private progress: SyncProgress;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.mongoService = new KorastatsMongoService();
    this.cacheService = new CacheService();
    this.leagueLogoService = new LeagueLogoService();
    this.entityDataService = new EntityDataService();
    this.resetProgress();
  }

  /**
   * Reset progress tracking
   */
  private resetProgress(): void {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Initializing...",
      startTime: new Date(),
    };
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * Comprehensive Tournaments Syncer - Clean Architecture
   * Uses: TournamentDataService -> LeagueNew Mapper -> MongoStorageService
   */
  async syncTournamentsComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive tournaments sync...";

    try {
      console.log("🏆 Starting comprehensive tournaments sync...");
      await this.mongoService.connect();

      // Step 1: Get tournament list from KoraStats
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Apply limit if specified (for testing)
      let tournaments = tournamentList.data;
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      this.progress.total = tournaments.length;
      this.progress.current = `Processing ${this.progress.total} tournaments...`;

      console.log(`Found ${tournaments.length} tournaments to sync`);

      // Step 2: Process tournaments in batches
      const batchSize = options.batchSize || 5;
      const delayBetweenBatches = options.delayBetweenBatches || 1000;

      const tournamentDataService = new TournamentDataService();
      const leagueMapper = new LeagueNew();
      const mongoStorage = new MongoStorageService();

      const storagePromises = [];

      for (let i = 0; i < tournaments.length; i += batchSize) {
        const batch = tournaments.slice(i, i + batchSize);

        for (const tournament of batch) {
          try {
            this.progress.current = `Syncing tournament: ${tournament.tournament}`;

            // Check if tournament already exists
            if (!options.forceResync) {
              const existing = await Models.Tournament.findOne({
                korastats_id: tournament.id,
              });
              if (existing) {
                console.log(
                  `⏭️ Tournament ${tournament.tournament} already exists, skipping`,
                );
                this.progress.completed++;
                continue;
              }
            }

            // Collect tournament data
            const tournamentData = await tournamentDataService.collectTournamentData(
              tournament.id,
            );

            if (!tournamentData) {
              console.warn(`No data collected for tournament ${tournament.tournament}`);
              this.progress.failed++;
              continue;
            }

            // Map to MongoDB schema
            const mappedTournament = await leagueMapper.tournamentMapper(
              tournament,
              [], // matchList - empty for now
              [], // listStatTypes - empty for now
              null, // tournamentStructure - null for now
            );

            if (!mappedTournament) {
              console.warn(`Failed to map tournament ${tournament.tournament}`);
              this.progress.failed++;
              continue;
            }

            // Store in MongoDB
            storagePromises.push(mongoStorage.storeTournament(mappedTournament));

            console.log(
              `✅ Successfully collected data for tournament ${tournament.tournament}`,
            );
          } catch (error) {
            console.error(
              `❌ Failed to sync tournament ${tournament.tournament}:`,
              error,
            );
            this.progress.failed++;
            this.progress.errors.push(
              `Tournament ${tournament.tournament}: ${error.message}`,
            );
          }
        }

        // Add delay between batches
        if (i + batchSize < tournaments.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      // Wait for all storage operations to complete
      const storageResults = await Promise.allSettled(storagePromises);
      const successfulStorage = storageResults.filter(
        (result) => result.status === "fulfilled",
      );

      this.progress.completed = successfulStorage.length;
      this.progress.failed = this.progress.total - this.progress.completed;

      this.progress.endTime = new Date();
      this.progress.current = `Tournaments sync completed. ${this.progress.completed} tournaments processed successfully.`;

      console.log(`🏆 Tournaments sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Tournaments sync failed: ${error.message}`;
      console.error("❌ Tournaments sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Matches Syncer - Clean Architecture
   * Uses: MatchDataService -> FixtureNew Mapper -> MongoStorageService
   */
  async syncMatchesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive matches sync...";

    try {
      console.log("⚽ Starting comprehensive matches sync...");
      await this.mongoService.connect();

      // Step 1: Get tournaments to sync
      const tournamentsList = await this.korastatsService.getTournamentList();
      if (!tournamentsList.data || tournamentsList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Apply limit if specified (for testing)
      let tournaments = tournamentsList.data;
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      this.progress.total = tournaments.length;
      this.progress.current = `Processing matches for ${this.progress.total} tournaments...`;

      console.log(`Found ${tournaments.length} tournaments to sync matches for`);

      // Step 2: Process each tournament
      const matchDataService = new MatchDataService();
      const fixtureMapper = new FixtureNew();
      const mongoStorage = new MongoStorageService();

      for (const tournament of tournaments) {
        try {
          this.progress.current = `Syncing matches for ${tournament.tournament}...`;

          // Get match list for this tournament
          const matchListResponse = await this.korastatsService.getTournamentMatchList(
            tournament.id,
          );

          if (!matchListResponse || !matchListResponse.data) {
            console.warn(`No matches found for tournament ${tournament.tournament}`);
            this.progress.completed++;
            continue;
          }

          const matches = matchListResponse.data;
          console.log(`Found ${matches.length} matches for ${tournament.tournament}`);

          // Process matches in batches
          const batchSize = options.batchSize || 3; // Smaller batches for matches
          const delayBetweenBatches = options.delayBetweenBatches || 2000;

          for (let i = 0; i < matches.length; i += batchSize) {
            const batch = matches.slice(i, i + batchSize);

            await Promise.all(
              batch.map(async (match) => {
                try {
                  // Check if match already exists
                  if (!options.forceResync) {
                    const existing = await Models.Match.findOne({
                      korastats_id: match.matchId,
                    });
                    if (existing) {
                      console.log(`⏭️ Match ${match.matchId} already exists, skipping`);
                      return;
                    }
                  }

                  console.log(`🔄 Syncing match ${match.matchId}...`);

                  // Get comprehensive match data
                  const matchDataResult = await matchDataService.collectMatchData(
                    match.matchId,
                  );

                  if (
                    !matchDataResult ||
                    !matchDataResult.success ||
                    !matchDataResult.data
                  ) {
                    console.warn(`No data collected for match ${match.matchId}`);
                    return;
                  }

                  const matchData = matchDataResult.data;

                  // Map to MongoDB schema
                  const mappedMatch = fixtureMapper.matchMapper(
                    matchData.matchPlayersStats,
                    matchData.matchSummary,
                    matchData.matchSquad,
                    matchData.matchTimeline,
                    matchData.matchFormationHome,
                    matchData.matchFormationAway,
                    matchData.matchPossessionTimeline,
                    matchData.matchVideo,
                    null, // topPerformers - will be calculated
                    null, // heatmaps - will be calculated
                  );

                  if (!mappedMatch) {
                    console.warn(`Failed to map match ${match.matchId}`);
                    return;
                  }

                  // Store in MongoDB
                  await mongoStorage.storeMatch(mappedMatch);

                  console.log(`✅ Successfully synced match ${match.matchId}`);
                } catch (error) {
                  console.error(`❌ Failed to sync match ${match.matchId}:`, error);
                  this.progress.failed++;
                  this.progress.errors.push(`Match ${match.matchId}: ${error.message}`);
                }
              }),
            );

            // Add delay between batches
            if (i + batchSize < matches.length) {
              await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
            }
          }

          this.progress.completed++;
          console.log(`✅ Completed tournament: ${tournament.tournament}`);
        } catch (error) {
          console.error(
            `❌ Failed to sync matches for tournament ${tournament.tournament}:`,
            error,
          );
          this.progress.failed++;
          this.progress.errors.push(
            `Tournament ${tournament.tournament}: ${error.message}`,
          );
        }
      }

      this.progress.endTime = new Date();
      this.progress.current = `Matches sync completed. ${this.progress.completed} tournaments processed successfully.`;

      console.log(`⚽ Matches sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Matches sync failed: ${error.message}`;
      console.error("❌ Matches sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Teams Syncer
   * Uses: TournamentTeamList, TournamentTeamStats, EntityCoach
   */
  async syncTeamsComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting comprehensive teams sync...",
      startTime: new Date(),
    };

    try {
      console.log("👥 Starting comprehensive teams sync...");
      await this.mongoService.connect();

      // Get tournaments to sync teams for
      const tournamentsList = await this.korastatsService.getTournamentList();
      if (!tournamentsList.data || tournamentsList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Apply limit if specified (for testing)
      let tournaments = tournamentsList.data;
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      progress.total = tournaments.length;
      progress.current = `Processing teams for ${progress.total} tournaments...`;

      console.log(`Found ${tournaments.length} tournaments to sync teams for`);

      // Process each tournament
      for (const tournament of tournaments) {
        try {
          progress.current = `Syncing teams for ${tournament.tournament}...`;

          // Get team list for this tournament
          const teamsResponse = await this.korastatsService.getTournamentTeamList(
            tournament.id,
          );

          if (
            !teamsResponse ||
            teamsResponse.result !== "Success" ||
            !teamsResponse.data
          ) {
            console.warn(`No teams found for tournament ${tournament.tournament}`);
            progress.completed++;
            continue;
          }

          const teams = teamsResponse.data.teams;
          console.log(`Found ${teams.length} teams for ${tournament.tournament}`);

          // Process teams
          for (const team of teams) {
            try {
              // Check if team already exists
              if (!options.forceResync) {
                const existing = await Models.Team.findOne({
                  korastats_id: team.id,
                });
                if (existing) {
                  console.log(`⏭️ Team ${team.team} already exists, skipping`);
                  continue;
                }
              }

              console.log(`🔄 Syncing team ${team.team}...`);

              // Get team entity data for logo and other details
              let teamEntityData = null;
              let teamLogo = "";
              try {
                const entityResponse = await this.korastatsService.getEntityTeam(team.id);
                if (entityResponse.result === "Success" && entityResponse.data) {
                  teamEntityData = entityResponse.data;
                  teamLogo = await this.korastatsService
                    .getImageUrl("club", teamEntityData.club?.id || team.id)
                    .catch(() => "");
                }
              } catch (error) {
                console.warn(
                  `⚠️ Failed to get entity data for team ${team.id}:`,
                  error.message,
                );
              }

              // Clean team name
              let cleanTeamName = team.team;
              for (let i = 0; i < 3; i++) {
                cleanTeamName = cleanTeamName
                  .replace(
                    /\s+(FC|SC|U19|U21|U23|Club|United|City|Town|Athletic|Sporting|Football|Soccer|KSA)\s*$/i,
                    "",
                  )
                  .trim();
              }

              const teamData = {
                korastats_id: team.id,
                name: cleanTeamName,
                code: cleanTeamName.substring(0, 3).toUpperCase(),
                logo: teamLogo,
                founded: teamEntityData?.founded || null,
                national: teamEntityData?.is_national_team || false,
                clubMarketValue: teamEntityData?.market_value || null,
                totalPlayers: 0,
                foreignPlayers: 0,
                averagePlayerAge: 0,
                rank: 0,
                country: "Saudi Arabia",
                venue: team.stadium
                  ? {
                      id: team.stadium.id,
                      name: team.stadium.name,
                      capacity: teamEntityData?.stadium?.capacity || 0,
                      surface: teamEntityData?.stadium?.surface || "",
                      city: teamEntityData?.stadium?.city || "",
                      image: teamEntityData?.stadium?.image || null,
                      address: teamEntityData?.stadium?.address || null,
                    }
                  : {
                      id: 0,
                      name: "",
                      capacity: 0,
                      surface: "",
                      city: "",
                      image: null,
                      address: null,
                    },
                lineup: {
                  formation: "",
                  startXI: [],
                  substitutes: [],
                },
                coaches: [],
                trophies: [],
                stats_summary: {
                  total_matches: 0,
                  total_wins: 0,
                  total_draws: 0,
                  total_losses: 0,
                  total_goals_for: 0,
                  total_goals_against: 0,
                },
                stats: {},
                status: "active",
                last_synced: new Date(),
                sync_version: 1,
              };

              // Store team in MongoDB
              await Models.Team.findOneAndUpdate({ korastats_id: team.id }, teamData, {
                upsert: true,
                new: true,
              });

              console.log(`✅ Successfully synced team ${team.team}`);
            } catch (error) {
              console.error(`❌ Failed to sync team ${team.team}:`, error);
              progress.failed++;
              progress.errors.push(`Team ${team.team}: ${error.message}`);
            }
          }

          progress.completed++;
          console.log(`✅ Completed tournament: ${tournament.tournament}`);
        } catch (error) {
          console.error(
            `❌ Failed to sync teams for tournament ${tournament.tournament}:`,
            error,
          );
          progress.failed++;
          progress.errors.push(`Tournament ${tournament.tournament}: ${error.message}`);
        }
      }

      progress.endTime = new Date();
      progress.current = `Teams sync completed. ${progress.completed} tournaments processed.`;

      console.log(
        `👥 Teams sync completed: ${progress.completed}/${progress.total} tournaments processed`,
      );

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Teams sync failed: ${error.message}`;
      console.error("❌ Teams sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Entity Data Syncer (Players, Coaches, Referees)
   * Uses: EntityDataService
   */
  async syncEntityDataComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive entity data sync...";

    try {
      console.log("👤 Starting comprehensive entity data sync...");
      await this.mongoService.connect();

      // Sync all entity data using EntityDataService
      const entityOptions = {
        batchSize: options.batchSize || 5,
        delayBetweenBatches: options.delayBetweenBatches || 1000,
        forceResync: options.forceResync || false,
        skipExisting: options.skipExisting || false,
        limit: options.limit,
      };

      const entityProgress =
        await this.entityDataService.syncAllEntityData(entityOptions);

      this.progress = entityProgress;
      this.progress.endTime = new Date();

      console.log(`👤 Entity data sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Entity data sync failed: ${error.message}`;
      console.error("❌ Entity data sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Full sync - collect all data based on options
   */
  async fullSync(options: SyncOptions = {}): Promise<SyncProgress> {
    console.log("🚀 Starting full sync...");
    this.resetProgress();

    try {
      await this.mongoService.connect();

      // Step 1: Sync Tournaments/Leagues
      if (options.syncTournaments !== false) {
        console.log("🏆 Syncing tournaments...");
        await this.syncTournamentsComprehensive(options);
      }

      // Step 2: Sync Teams
      if (options.syncTeams !== false) {
        console.log("👥 Syncing teams...");
        await this.syncTeamsComprehensive(options);
      }

      // Step 3: Sync Matches
      if (options.syncMatches !== false) {
        console.log("⚽ Syncing matches...");
        await this.syncMatchesComprehensive(options);
      }

      // Step 4: Sync Entity Data (Players, Coaches, Referees)
      if (
        options.syncPlayers !== false ||
        options.syncCoaches !== false ||
        options.syncReferees !== false
      ) {
        console.log("👤 Syncing entity data...");
        await this.syncEntityDataComprehensive(options);
      }

      this.progress.endTime = new Date();
      console.log("✅ Full sync completed successfully!");
      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      console.error("❌ Full sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }
}

