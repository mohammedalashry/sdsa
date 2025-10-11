// src/syncer/syncer-clean.service.ts
// Clean syncer service with working methods only

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { Models } from "../db/mogodb/models";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { MongoStorageService } from "./mongo-storage.service";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import { ApiError } from "../core/middleware/error.middleware";
import { FixtureNew } from "@/mapper/fixtureNew";
import { MatchDataService } from "./match-data.service";
import { TournamentDataService } from "./tournament-data.service";
import { PlayerDataService } from "./player-data.service";
import { CoachDataService } from "./coach-data.service";
import { RefereeDataService } from "./referee-data.service";
import { TeamDataService } from "./team-data.service";
import { TeamNew } from "@/mapper/teamNew";
import { LeagueNew } from "@/mapper/leagueNew";
import { EntityDataService } from "./entity-data.service";
import { StandingsNew } from "@/mapper/standingsNew";

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
  limit?: number;

  // Match-specific options
  includeDetails?: boolean;
  includeAnalytics?: boolean;
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
  private mongoStorageService: MongoStorageService;
  private cacheService: CacheService;
  private leagueLogoService: LeagueLogoService;
  private entityDataService: EntityDataService;
  private matchDataService: MatchDataService;
  private playerDataService: PlayerDataService;
  private coachDataService: CoachDataService;
  private refereeDataService: RefereeDataService;
  private teamDataService: TeamDataService;
  private standingsNew: StandingsNew;
  private progress: SyncProgress;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.mongoService = new KorastatsMongoService();
    this.mongoStorageService = new MongoStorageService();
    this.cacheService = new CacheService();
    this.leagueLogoService = new LeagueLogoService();
    this.entityDataService = new EntityDataService();
    this.matchDataService = new MatchDataService();
    this.playerDataService = new PlayerDataService();
    this.coachDataService = new CoachDataService();
    this.refereeDataService = new RefereeDataService();
    this.teamDataService = new TeamDataService(this.korastatsService, new TeamNew());
    this.standingsNew = new StandingsNew();
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

  // ===================================================================
  // TOURNAMENT/LEAGUE SYNC METHODS
  // ===================================================================

  /**
   * Comprehensive tournament/league sync
   */
  /*
  async syncTournamentsComprehensiveOLD(
    options: SyncOptions = {},
  ): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive tournament sync...";
    const leagueMapper = new LeagueNew();
    try {
      console.log("🏆 Starting comprehensive tournament sync...");
      await this.mongoService.connect();

      // Get tournament list from KoraStats
      const tournamentListResponse = await this.korastatsService.getTournamentList();

      if (!tournamentListResponse.data || tournamentListResponse.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      let tournaments = tournamentListResponse.data;

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      this.progress.total = tournaments.length;
      console.log(`📋 Found ${this.progress.total} tournaments to sync`);

      // Process each tournament
      for (const [index, tournament] of tournaments.entries()) {
        try {
          this.progress.current = `Syncing tournament ${index + 1}/${tournaments.length}: ${tournament.tournament}`;
          console.log(this.progress.current);

          // Get tournament structure for additional details
          let tournamentStructure;
          try {
            const structureResponse = await this.korastatsService.getTournamentStructure(
              tournament.id,
            );
            tournamentStructure = structureResponse.data;
          } catch (error) {
            console.warn(
              `⚠️ Could not fetch structure for tournament ${tournament.id}: ${error.message}`,
            );
          }

          // Map tournament data using LeagueNew mapper
          const mappedTournament = await leagueMapper.tournamentMapper(
            tournament,
            tournamentData.data.matchList,
            tournamentStructure,
          );

          // Store in MongoDB using MongoStorageService
          await this.mongoStorageService.storeTournament(mappedTournament);

          this.progress.completed++;
          console.log(
            `✅ Synced tournament: ${tournament.tournament} (ID: ${tournament.id})`,
          );
        } catch (error) {
          this.progress.failed++;
          const errorMsg = `Failed to sync tournament ${tournament.id}: ${error.message}`;
          this.progress.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      this.progress.endTime = new Date();

      console.log(`🏆 Tournament sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Tournament sync failed: ${error.message}`;
      console.error("❌ Tournament sync failed:", error);
      throw error;
    }
  }
*/
  // ===================================================================
  // NEW: STANDINGS SYNC - Small and simple, included in main syncer
  // ===================================================================

  /**
   * Sync standings for tournaments using TournamentGroupStandings
   */
  async syncStandings(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting standings sync...";

    try {
      console.log("🏆 Starting standings sync...");
      await this.mongoService.connect();

      // Get tournaments to sync standings for
      let tournamentsToSync: number[] = [];

      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournamentsToSync = options.tournamentIds;
      } else {
        // Get all tournaments
        const tournamentsList = await this.korastatsService.getTournamentList();
        if (!tournamentsList.data || tournamentsList.data.length === 0) {
          throw new ApiError(400, "No tournaments found");
        }

        let tournaments = tournamentsList.data;
        if (options.limit && options.limit > 0) {
          tournaments = tournaments.slice(0, options.limit);
        }

        tournamentsToSync = tournaments.map((t) => t.id);
      }

      this.progress.total = tournamentsToSync.length;
      console.log(`📊 Processing standings for ${this.progress.total} tournaments`);

      // Process each tournament
      for (const [index, tournamentId] of tournamentsToSync.entries()) {
        try {
          this.progress.current = `Processing standings ${index + 1}/${this.progress.total}: Tournament ${tournamentId}`;
          console.log(this.progress.current);

          await this.syncSingleTournamentStandings(
            tournamentId,
            options.forceResync || true,
          );
          this.progress.completed++;
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Tournament ${tournamentId}: ${error.message}`);
          console.error(
            `❌ Failed to sync standings for tournament ${tournamentId}:`,
            error.message,
          );
        }

        // Add delay between tournaments
        if (index < tournamentsToSync.length - 1) {
          const delay = options.delayBetweenBatches || 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      this.progress.endTime = new Date();
      this.progress.current = `Standings sync completed: ${this.progress.completed}/${this.progress.total} tournaments processed.`;

      console.log(`🏆 Standings sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Standings sync failed: ${error.message}`;
      this.progress.errors.push(error.message);
      console.error("❌ Standings sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Sync standings for a single tournament
   */
  private async syncSingleTournamentStandings(
    tournamentId: number,
    forceResync: boolean = true,
  ): Promise<void> {
    // Check if already exists and not forcing resync
    if (!forceResync) {
      const existing = await Models.Standings.findOne({ korastats_id: tournamentId });
      if (existing) {
        console.log(
          `⭐ Skipping standings for tournament ${tournamentId} - already exists`,
        );
        return;
      }
    }

    try {
      console.log(`📊 Fetching standings data for tournament ${tournamentId}...`);

      // Step 1: Get tournament info
      const tournamentListResponse = await this.korastatsService.getTournamentList();
      const tournament = tournamentListResponse.data?.find((t) => t.id === tournamentId);

      if (!tournament) {
        throw new Error(`Tournament ${tournamentId} not found in tournament list`);
      }

      // Step 2: Get tournament structure to find stage ID
      const tournamentStructure =
        await this.korastatsService.getTournamentStructure(tournamentId);
      if (!tournamentStructure.data || !tournamentStructure.data.stages.length) {
        throw new Error(`No tournament structure found for tournament ${tournamentId}`);
      }

      const stageId = tournamentStructure.data.stages[0].id;

      // Step 3: Get standings data from TournamentGroupStandings
      const standingsResponse = await this.korastatsService.getTournamentGroupStandings(
        tournamentId,
        stageId,
      );

      if (!standingsResponse.data) {
        throw new Error(`No standings data found for tournament ${tournamentId}`);
      }

      console.log(`📊 Got standings data for tournament ${tournamentId}:`, {
        stages: standingsResponse.data.stages?.length || 0,
        groups: standingsResponse.data.stages?.[0]?.groups?.length || 0,
        teams: standingsResponse.data.stages?.[0]?.groups?.[0]?.standings?.length || 0,
      });

      // Step 4: Map to MongoDB schema using standingsNew
      const standingsData = await this.standingsNew.mapToStandings(
        tournament,
        standingsResponse.data,
      );
      const existing = await Models.Standings.findOne({ korastats_id: tournamentId });
      if (
        existing &&
        existing?.seasons?.[0]?.year !== standingsData?.seasons?.[0]?.year
      ) {
        standingsData.seasons = [...existing.seasons, ...standingsData.seasons];
        standingsData.seasons = standingsData.seasons.sort((a, b) => a.year - b.year);
      }
      // Step 5: Store in MongoDB
      await Models.Standings.findOneAndUpdate(
        { korastats_id: tournamentId },
        standingsData,
        { upsert: true, new: true },
      );

      console.log(
        `✅ Successfully synced standings for tournament ${tournamentId} with ${standingsData.seasons[0].standings.length} teams`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to sync standings for tournament ${tournamentId}:`,
        error.message,
      );
      throw error;
    }
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

      const storagePromises = [];

      for (let i = 0; i < tournaments.length; i += batchSize) {
        const batch = tournaments.slice(i, i + batchSize);

        for (const tournament of batch) {
          try {
            this.progress.current = `Syncing tournament: ${tournament.tournament}`;

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
              tournamentData.data.matchList,
              tournamentData.data.tournamentStructure,
            );

            if (!mappedTournament) {
              console.warn(`Failed to map tournament ${tournament.tournament}`);
              this.progress.failed++;
              continue;
            }

            // Store in MongoDB
            storagePromises.push(
              this.mongoStorageService.storeTournament(mappedTournament),
            );

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
      console.log("successfulStorage", successfulStorage);
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
    this.progress.current = "Starting matches sync using MatchDataService...";

    try {
      console.log("⚽ Starting comprehensive matches sync with MatchDataService...");
      await this.mongoService.connect();

      // Get tournaments to sync
      let tournamentsToSync: number[] = [];

      if (options.tournamentIds && options.tournamentIds.length > 0) {
        // Use specified tournament IDs
        tournamentsToSync = options.tournamentIds;
        console.log(`🎯 Syncing specified tournaments: ${tournamentsToSync.join(", ")}`);
      } else {
        // Get all tournaments from KoraStats
        const tournamentsList = await this.korastatsService.getTournamentList();
        if (!tournamentsList.data || tournamentsList.data.length === 0) {
          throw new ApiError(400, "No tournaments found");
        }

        let tournaments = tournamentsList.data;
        if (options.limit && options.limit > 0) {
          tournaments = tournaments.slice(0, options.limit);
          console.log(`📊 Limited to ${options.limit} tournaments for testing`);
        }

        tournamentsToSync = tournaments.map((t) => t.id);
      }

      this.progress.total = tournamentsToSync.length;
      console.log(`📋 Processing ${this.progress.total} tournaments`);

      // Process each tournament using MatchDataService
      for (const [index, tournamentId] of tournamentsToSync.entries()) {
        try {
          this.progress.current = `Processing tournament ${index + 1}/${this.progress.total}: ID ${tournamentId}`;
          console.log(this.progress.current);

          // Step 1: Sync basic match data for tournament
          const basicMatchOptions = {
            tournamentId,
            season: options.season,
            limit: options.limit, // Pass limit to individual tournament
            forceResync: options.forceResync || true,
            includeDetails: false, // Basic sync first
            includeAnalytics: false,
          };

          console.log(`📊 Syncing basic matches for tournament ${tournamentId}...`);
          const basicProgress =
            await this.matchDataService.syncBasicMatches(basicMatchOptions);

          console.log(`✅ Basic match sync completed for tournament ${tournamentId}:`, {
            total: basicProgress.total,
            completed: basicProgress.completed,
            failed: basicProgress.failed,
          });

          // Step 2: Sync detailed match data if requested
          if (options.includeDetails !== false) {
            console.log(`📈 Syncing detailed matches for tournament ${tournamentId}...`);

            const detailedMatchOptions = {
              tournamentId,
              season: options.season,
              limit: options.limit,
              forceResync: options.forceResync || true,
              includeDetails: true,
              includeAnalytics: options.includeAnalytics || false,
            };

            const detailedProgress =
              await this.matchDataService.syncDetailedMatches(detailedMatchOptions);

            console.log(
              `✅ Detailed match sync completed for tournament ${tournamentId}:`,
              {
                total: detailedProgress.total,
                completed: detailedProgress.completed,
                failed: detailedProgress.failed,
              },
            );
          }

          this.progress.completed++;

          // Add delay between tournaments to respect API limits
          if (index < tournamentsToSync.length - 1) {
            const delay = options.delayBetweenBatches || 2000;
            console.log(`⏳ Waiting ${delay}ms before next tournament...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Tournament ${tournamentId}: ${error.message}`);
          console.error(`❌ Failed to sync tournament ${tournamentId}:`, error.message);
        }
      }

      this.progress.endTime = new Date();
      this.progress.current = `Matches sync completed: ${this.progress.completed}/${this.progress.total} tournaments processed successfully.`;

      console.log(`🏆 Matches sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
        errors: this.progress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Matches sync failed: ${error.message}`;
      this.progress.errors.push(error.message);
      console.error("❌ Matches sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }
  async syncCountriesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting comprehensive countries sync...",
      startTime: new Date(),
    };
    try {
      console.log("🌍 Starting comprehensive countries sync...");
      await this.mongoService.connect();

      const countriesList = await this.korastatsService.getEntityCountries();
      if (!countriesList.root.object || countriesList.root.object.length === 0) {
        throw new ApiError(400, "No countries found");
      }

      let countries = countriesList.root.object;
      if (options.limit && options.limit > 0) {
        countries = countries.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} countries`);
      }

      progress.total = countries.length;
      progress.current = `Processing countries for ${progress.total} countries...`;

      console.log(`Found ${countries.length} countries to sync`);

      const countryiesMapped = countries.map((country) => {
        return {
          korastats_id: country.id,
          name: country.name,
          code: this.generateCountryCode(country.name),
          flag: country.flag,
        };
      });

      await Models.Country.insertMany(countryiesMapped);

      progress.completed = countries.length;
      progress.current = `Countries sync completed. ${progress.completed} countries processed.`;
      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Countries sync failed: ${error.message}`;
      console.error("❌ Countries sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Teams Syncer (OLD IMPLEMENTATION - TO BE REMOVED)
   * Uses: TournamentTeamList, TournamentTeamStats, EntityCoach
   */
  async syncTeamsComprehensiveOLD(options: SyncOptions = {}): Promise<SyncProgress> {
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
   * Comprehensive Players Syncer
   * Uses: PlayerDataService -> PlayerNew Mapper -> MongoDB
   */
  async syncPlayersComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive players sync...";

    try {
      console.log("⚽ Starting comprehensive players sync...");
      await this.mongoService.connect();

      // Step 1: Get tournament list
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found for player sync");
      }

      // Filter tournaments if specific IDs provided
      let tournaments = tournamentList.data;
      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
        console.log(`🎯 Filtering to ${tournaments.length} specific tournaments`);
      }

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      if (tournaments.length === 0) {
        console.log("ℹ️ No tournaments to process for player sync");
        this.progress.endTime = new Date();
        return this.progress;
      }

      this.progress.total = tournaments.length;
      console.log(`📊 Processing players from ${tournaments.length} tournaments...`);

      // Step 2: Process each tournament
      for (const [index, tournament] of tournaments.entries()) {
        try {
          this.progress.current = `Processing tournament ${index + 1}/${tournaments.length}: ${tournament.tournament}`;
          console.log(`🏆 ${this.progress.current}`);

          // Sync players for this tournament
          const playerSyncOptions = {
            tournamentId: tournament.id,
            season: options.season,
            forceResync: options.forceResync || true,
            includeStats: true,
            includeAnalytics: options.includeAnalytics || true,
            limit: options.batchSize, // Use batchSize as player limit per tournament
          };

          const playerProgress =
            await this.playerDataService.syncTournamentPlayers(playerSyncOptions);

          // Update overall progress
          this.progress.completed++;
          this.progress.errors.push(...playerProgress.errors);

          console.log(
            `✅ Tournament ${tournament.id}: ${playerProgress.completed}/${playerProgress.total} players synced`,
          );

          // Add delay between tournaments to respect API limits
          if (index < tournaments.length - 1) {
            const delay = options.delayBetweenBatches || 3000; // 3 seconds default
            console.log(`⏱️ Waiting ${delay}ms before next tournament...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Tournament ${tournament.id}: ${error.message}`);
          console.error(
            `❌ Failed to sync players for tournament ${tournament.id}:`,
            error.message,
          );

          // Continue with next tournament instead of failing completely
          if (!options.forceResync) {
            console.log("⏭️ Continuing with next tournament...");
            continue;
          }
        }
      }

      this.progress.current = `Players sync completed: ${this.progress.completed}/${this.progress.total} tournaments processed`;
      this.progress.endTime = new Date();

      // Get final statistics
      const playerStats = await this.playerDataService.getPlayerSyncStatus(
        tournaments[0]?.id || 0,
      );

      console.log(`✅ Players sync completed:`, {
        tournamentsProcessed: this.progress.completed,
        tournamentsFailed: this.progress.failed,
        totalPlayersInDB: playerStats.syncedPlayers,
        playersWithStats: playerStats.playersWithStats,
        errors: this.progress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Players sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Comprehensive players sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Sync specific players by IDs across tournaments
   */
  async syncSpecificPlayers(
    playerIds: number[],
    options: SyncOptions = {},
  ): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting specific players sync...";

    try {
      console.log(`⚽ Syncing ${playerIds.length} specific players...`);
      await this.mongoService.connect();

      // Get tournament list to find where these players might be
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Use first tournament or specified tournament
      const tournamentId = options.tournamentIds?.[0] || tournamentList.data[0].id;

      this.progress.total = 1; // One sync operation
      this.progress.current = `Syncing ${playerIds.length} specific players...`;

      // Sync specific players
      const playerProgress = await this.playerDataService.syncSpecificPlayers(
        playerIds,
        tournamentId,
        options.forceResync || true,
      );

      this.progress.completed = 1;
      this.progress.errors = playerProgress.errors;
      this.progress.current = `Specific players sync completed: ${playerProgress.completed}/${playerProgress.total} players processed`;
      this.progress.endTime = new Date();

      console.log(`✅ Specific players sync completed:`, {
        playersProcessed: playerProgress.completed,
        playersFailed: playerProgress.failed,
        errors: playerProgress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Specific players sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Specific players sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Update player statistics for all existing players
   */
  async updateAllPlayerStatistics(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting player statistics update...";

    try {
      console.log("📊 Updating statistics for all existing players...");
      await this.mongoService.connect();

      // Get tournament list
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Use first tournament or specified tournament for current season stats
      const tournamentId = options.tournamentIds?.[0] || tournamentList.data[0].id;

      this.progress.total = 1; // One update operation
      this.progress.current = "Updating player statistics...";

      // Update player statistics
      const updateProgress = await this.playerDataService.updatePlayerStatistics(
        tournamentId,
        options.forceResync || true,
      );

      this.progress.completed = 1;
      this.progress.errors = updateProgress.errors;
      this.progress.current = `Statistics update completed: ${updateProgress.completed}/${updateProgress.total} players updated`;
      this.progress.endTime = new Date();

      console.log(`✅ Player statistics update completed:`, {
        playersUpdated: updateProgress.completed,
        playersFailed: updateProgress.failed,
        errors: updateProgress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Statistics update failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Player statistics update failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Coaches Syncer
   * Uses: CoachDataService -> CoachNew Mapper -> MongoDB
   */
  async syncCoachesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive coaches sync...";

    try {
      console.log("👔 Starting comprehensive coaches sync...");
      await this.mongoService.connect();

      // Step 1: Get tournament list
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found for coach sync");
      }

      // Filter tournaments if specific IDs provided
      let tournaments = tournamentList.data;
      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
        console.log(`🎯 Filtering to ${tournaments.length} specific tournaments`);
      }

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      if (tournaments.length === 0) {
        console.log("ℹ️ No tournaments to process for coach sync");
        this.progress.endTime = new Date();
        return this.progress;
      }

      this.progress.total = tournaments.length;
      console.log(`📊 Processing coaches from ${tournaments.length} tournaments...`);

      // Step 2: Process each tournament
      for (const [index, tournament] of tournaments.entries()) {
        try {
          this.progress.current = `Processing tournament ${index + 1}/${tournaments.length}: ${tournament.tournament}`;
          console.log(`🏆 ${this.progress.current}`);

          // Sync coaches for this tournament
          const coachSyncOptions = {
            tournamentId: tournament.id,
            season: options.season,
            forceResync: options.forceResync || true,
            includeStats: true,
            includeAnalytics: options.includeAnalytics || true,
            limit: options.batchSize, // Use batchSize as coach limit per tournament
          };

          const coachProgress =
            await this.coachDataService.syncTournamentCoaches(coachSyncOptions);

          // Update overall progress
          this.progress.completed++;
          this.progress.errors.push(...coachProgress.errors);

          console.log(
            `✅ Tournament ${tournament.id}: ${coachProgress.completed}/${coachProgress.total} coaches synced`,
          );

          // Add delay between tournaments to respect API limits
          if (index < tournaments.length - 1) {
            const delay = options.delayBetweenBatches || 2000; // 2 seconds default
            console.log(`⏱️ Waiting ${delay}ms before next tournament...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Tournament ${tournament.id}: ${error.message}`);
          console.error(
            `❌ Failed to sync coaches for tournament ${tournament.id}:`,
            error.message,
          );

          // Continue with next tournament instead of failing completely
          if (!options.forceResync) {
            console.log("⏭️ Continuing with next tournament...");
            continue;
          }
        }
      }

      this.progress.current = `Coaches sync completed: ${this.progress.completed}/${this.progress.total} tournaments processed`;
      this.progress.endTime = new Date();

      // Get final statistics
      const coachStats = await this.coachDataService.getCoachSyncStatus(
        tournaments[0]?.id || 0,
      );

      console.log(`✅ Coaches sync completed:`, {
        tournamentsProcessed: this.progress.completed,
        tournamentsFailed: this.progress.failed,
        totalCoachesInDB: coachStats.syncedCoaches,
        coachesWithStats: coachStats.coachesWithStats,
        errors: this.progress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Coaches sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Comprehensive coaches sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Sync specific coaches by IDs across tournaments
   */
  async syncSpecificCoaches(
    coachIds: number[],
    options: SyncOptions = {},
  ): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting specific coaches sync...";

    try {
      console.log(`👔 Syncing ${coachIds.length} specific coaches...`);
      await this.mongoService.connect();

      // Get tournament list to find where these coaches might be
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Use first tournament or specified tournament
      const tournamentId = options.tournamentIds?.[0] || tournamentList.data[0].id;

      this.progress.total = 1; // One sync operation
      this.progress.current = `Syncing ${coachIds.length} specific coaches...`;

      // Sync specific coaches
      const coachProgress = await this.coachDataService.syncSpecificCoaches(
        coachIds,
        tournamentId,
        options.forceResync || true,
      );

      this.progress.completed = 1;
      this.progress.errors = coachProgress.errors;
      this.progress.current = `Specific coaches sync completed: ${coachProgress.completed}/${coachProgress.total} coaches processed`;
      this.progress.endTime = new Date();

      console.log(`✅ Specific coaches sync completed:`, {
        coachesProcessed: coachProgress.completed,
        coachesFailed: coachProgress.failed,
        errors: coachProgress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Specific coaches sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Specific coaches sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Comprehensive Referees Syncer
   * Uses: RefereeDataService -> RefereeNew Mapper -> MongoDB
   */
  async syncRefereesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive referees sync...";

    try {
      console.log("🏁 Starting comprehensive referees sync...");
      await this.mongoService.connect();

      // Step 1: Get tournament list
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found for referee sync");
      }

      // Filter tournaments if specific IDs provided
      let tournaments = tournamentList.data;
      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
        console.log(`🎯 Filtering to ${tournaments.length} specific tournaments`);
      }

      // Apply limit if specified (for testing)
      if (options.limit && options.limit > 0) {
        tournaments = tournaments.slice(0, options.limit);
        console.log(`🔬 Testing mode: Limited to ${options.limit} tournaments`);
      }

      if (tournaments.length === 0) {
        console.log("ℹ️ No tournaments to process for referee sync");
        this.progress.endTime = new Date();
        return this.progress;
      }

      this.progress.total = tournaments.length;
      console.log(`📊 Processing referees from ${tournaments.length} tournaments...`);

      // Step 2: Process each tournament
      for (const [index, tournament] of tournaments.entries()) {
        try {
          this.progress.current = `Processing tournament ${index + 1}/${tournaments.length}: ${tournament.tournament}`;
          console.log(`🏆 ${this.progress.current}`);

          // Sync referees for this tournament
          const refereeSyncOptions = {
            tournamentId: tournament.id,
            season: options.season,
            forceResync: options.forceResync || true,
            includeStats: true,
            limit: options.batchSize, // Use batchSize as referee limit per tournament
          };

          const refereeProgress =
            await this.refereeDataService.syncTournamentReferees(refereeSyncOptions);

          // Update overall progress
          this.progress.completed++;
          this.progress.errors.push(...refereeProgress.errors);

          console.log(
            `✅ Tournament ${tournament.id}: ${refereeProgress.completed}/${refereeProgress.total} referees synced`,
          );

          // Add delay between tournaments to respect API limits
          if (index < tournaments.length - 1) {
            const delay = options.delayBetweenBatches || 2000; // 2 seconds default
            console.log(`⏱️ Waiting ${delay}ms before next tournament...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Tournament ${tournament.id}: ${error.message}`);
          console.error(
            `❌ Failed to sync referees for tournament ${tournament.id}:`,
            error.message,
          );

          // Continue with next tournament instead of failing completely
          if (!options.forceResync) {
            console.log("⏭️ Continuing with next tournament...");
            continue;
          }
        }
      }

      this.progress.current = `Referees sync completed: ${this.progress.completed}/${this.progress.total} tournaments processed`;
      this.progress.endTime = new Date();

      // Get final statistics
      const refereeStats = await this.refereeDataService.getRefereeSyncStatus(
        tournaments[0]?.id || 0,
      );

      console.log(`✅ Referees sync completed:`, {
        tournamentsProcessed: this.progress.completed,
        tournamentsFailed: this.progress.failed,
        totalRefereesInDB: refereeStats.syncedReferees,
        refereesWithStats: refereeStats.refereesWithStats,
        errors: this.progress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Referees sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Comprehensive referees sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  /**
   * Sync specific referees by IDs across tournaments
   */
  async syncSpecificReferees(
    refereeIds: number[],
    options: SyncOptions = {},
  ): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting specific referees sync...";

    try {
      console.log(`🏁 Syncing ${refereeIds.length} specific referees...`);
      await this.mongoService.connect();

      // Get tournament list to find where these referees might be
      const tournamentList = await this.korastatsService.getTournamentList();
      if (!tournamentList.data || tournamentList.data.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Use first tournament or specified tournament
      const tournamentId = options.tournamentIds?.[0] || tournamentList.data[0].id;

      this.progress.total = 1; // One sync operation
      this.progress.current = `Syncing ${refereeIds.length} specific referees...`;

      // Sync specific referees
      const refereeProgress = await this.refereeDataService.syncSpecificReferees(
        refereeIds,
        tournamentId,
        options.forceResync || true,
      );

      this.progress.completed = 1;
      this.progress.errors = refereeProgress.errors;
      this.progress.current = `Specific referees sync completed: ${refereeProgress.completed}/${refereeProgress.total} referees processed`;
      this.progress.endTime = new Date();

      console.log(`✅ Specific referees sync completed:`, {
        refereesProcessed: refereeProgress.completed,
        refereesFailed: refereeProgress.failed,
        errors: refereeProgress.errors.length,
      });

      return this.progress;
    } catch (error) {
      this.progress.current = `Specific referees sync failed: ${error.message}`;
      this.progress.endTime = new Date();
      this.progress.errors.push(error.message);
      console.error("❌ Specific referees sync failed:", error);
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
        forceResync: options.forceResync || true,
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

  // ===================================================================
  // TEAM SYNC METHODS
  // ===================================================================

  /**
   * Comprehensive team sync for tournaments
   */
  async syncTeamsComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive team sync...";

    try {
      console.log("👥 Starting comprehensive team sync...");
      await this.mongoService.connect();

      // Get tournaments to sync teams for
      let tournamentsToSync: number[] = [];

      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournamentsToSync = options.tournamentIds;
      } else {
        // Get all tournaments
        const tournamentsList = await this.korastatsService.getTournamentList();
        if (!tournamentsList.data || tournamentsList.data.length === 0) {
          throw new ApiError(400, "No tournaments found");
        }

        let tournaments = tournamentsList.data;
        if (options.limit && options.limit > 0) {
          tournaments = tournaments.slice(0, options.limit);
        }

        tournamentsToSync = tournaments.map((t) => t.id);
      }

      this.progress.total = tournamentsToSync.length;
      console.log(`📋 Found ${this.progress.total} tournaments to sync teams for`);

      // Sync teams for each tournament
      for (const tournamentId of tournamentsToSync) {
        this.progress.current = `Syncing teams for tournament ${tournamentId}...`;

        try {
          const result = await this.teamDataService.syncTournamentTeams(
            tournamentId,
            (progress) => {
              this.progress.current = `Tournament ${tournamentId}: ${progress.message}`;
            },
          );

          if (result.success) {
            this.progress.completed++;
            console.log(
              `✅ Synced ${result.teamsProcessed} teams for tournament ${tournamentId}`,
            );
          } else {
            this.progress.failed++;
            this.progress.errors.push(...result.errors);
            console.error(
              `❌ Failed to sync teams for tournament ${tournamentId}:`,
              result.errors,
            );
          }
        } catch (error) {
          this.progress.failed++;
          const errorMsg = `Failed to sync teams for tournament ${tournamentId}: ${error.message}`;
          this.progress.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      this.progress.endTime = new Date();

      console.log(`👥 Team sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Team sync failed: ${error.message}`;
      console.error("❌ Team sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync specific teams by IDs
   */
  async syncSpecificTeams(
    teamIds: number[],
    tournamentId: number,
    options: SyncOptions = {},
  ): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting specific team sync...";

    try {
      console.log(
        `👥 Syncing ${teamIds.length} specific teams for tournament ${tournamentId}...`,
      );
      await this.mongoService.connect();

      this.progress.total = teamIds.length;

      const result = await this.teamDataService.syncSpecificTeams(
        teamIds,
        tournamentId,
        (progress) => {
          this.progress.current = progress.message;
          this.progress.completed = progress.current;
        },
      );

      this.progress.completed = result.teamsProcessed;
      this.progress.failed = teamIds.length - result.teamsProcessed;
      this.progress.errors = result.errors;
      this.progress.endTime = new Date();

      console.log(`👥 Specific team sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Specific team sync failed: ${error.message}`;
      console.error("❌ Specific team sync failed:", error);
      throw error;
    }
  }

  /**
   * Update team statistics for existing teams
   */
  async updateAllTeamStatistics(options: SyncOptions = {}): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting team statistics update...";

    try {
      console.log("📊 Updating team statistics...");
      await this.mongoService.connect();

      // Get tournaments to update team stats for
      let tournamentsToSync: number[] = [];

      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournamentsToSync = options.tournamentIds;
      } else {
        // Get all tournaments
        const tournamentsList = await this.korastatsService.getTournamentList();
        if (!tournamentsList.data || tournamentsList.data.length === 0) {
          throw new ApiError(400, "No tournaments found");
        }

        let tournaments = tournamentsList.data;
        if (options.limit && options.limit > 0) {
          tournaments = tournaments.slice(0, options.limit);
        }

        tournamentsToSync = tournaments.map((t) => t.id);
      }

      this.progress.total = tournamentsToSync.length;
      console.log(`📋 Found ${this.progress.total} tournaments to update team stats for`);

      // Update team stats for each tournament
      for (const tournamentId of tournamentsToSync) {
        this.progress.current = `Updating team stats for tournament ${tournamentId}...`;

        try {
          const result = await this.teamDataService.updateTeamStatistics(
            tournamentId,
            (progress) => {
              this.progress.current = `Tournament ${tournamentId}: ${progress.message}`;
            },
          );

          if (result.success) {
            this.progress.completed++;
            console.log(
              `✅ Updated stats for ${result.teamsUpdated} teams in tournament ${tournamentId}`,
            );
          } else {
            this.progress.failed++;
            this.progress.errors.push(...result.errors);
            console.error(
              `❌ Failed to update team stats for tournament ${tournamentId}:`,
              result.errors,
            );
          }
        } catch (error) {
          this.progress.failed++;
          const errorMsg = `Failed to update team stats for tournament ${tournamentId}: ${error.message}`;
          this.progress.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      this.progress.endTime = new Date();

      console.log(`📊 Team statistics update completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Team statistics update failed: ${error.message}`;
      console.error("❌ Team statistics update failed:", error);
      throw error;
    }
  }

  // ===================================================================
  // MAIN SYNC ORCHESTRATION
  // ===================================================================

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
  /**
   * Helper method to generate country code from country name
   * Generate country code from country name
   * @param name - Country name
   * @returns Country code
   */
  private generateCountryCode(name: string): string {
    const array = name?.split(" ");
    if (array.length === 1) {
      return array[0].substring(0, 2).toUpperCase();
    }
    return array[0][0].toUpperCase() + array[1][0].toUpperCase();
  }

  /**
   * Comprehensive match sync: Ensure both basic and detailed matches are complete
   * Step 1: Sync missing basic matches from Korastats + old basic matches
   * Step 2: Sync missing detailed matches + old detailed matches
   */
  async syncMatchesComprehensiveWithCutoff(cutoffDate?: Date): Promise<SyncProgress> {
    this.resetProgress();
    this.progress.current = "Starting comprehensive match sync...";

    try {
      console.log("🔍 Starting comprehensive match sync...");
      await this.mongoService.connect();

      const result = await this.matchDataService.syncMatchesComprehensive(cutoffDate);

      this.progress.total = result.total;
      this.progress.completed = result.completed;
      this.progress.failed = result.failed;
      this.progress.endTime = new Date();
      this.progress.current = `Comprehensive match sync completed: ${result.completed}/${result.total}`;

      console.log(`✅ Comprehensive match sync completed:`, {
        total: this.progress.total,
        completed: this.progress.completed,
        failed: this.progress.failed,
        duration: this.progress.endTime.getTime() - this.progress.startTime.getTime(),
      });

      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      this.progress.current = `Comprehensive match sync failed: ${error.message}`;
      console.error("❌ Comprehensive match sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }
}

