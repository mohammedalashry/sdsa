// src/syncer/syncer.service.ts
// Main syncer service that orchestrates data collection from KoraStats to MongoDB
// Clean architecture with proper service separation and progress tracking

import { KorastatsService } from "../integrations/korastats/services/korastats.service";
//import { DataCollectorService } from "./data-collector.service";
import { Models } from "../db/mogodb/models";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { CacheService } from "../integrations/korastats/services/cache.service";
import { LeagueLogoService } from "../integrations/korastats/services/league-logo.service";
import { ApiError } from "../core/middleware/error.middleware";
import { FixtureNew } from "../mapper/fixtureNew";
import { MongoStorageService } from "./mongo-storage.service";
import { MatchDataService } from "./match-data.service";
import { TournamentDataService } from "./tournament-data.service";
import { LeagueNew } from "../mapper/leagueNew";
import { KorastatsPlayerDetailedStats } from "../integrations/korastats/types";

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
  current: string;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export class SyncerService {
  private korastatsService: KorastatsService;
  private mongoService: KorastatsMongoService;
  private cacheService: CacheService;
  private matchDataService: MatchDataService;
  private tournamentDataService: TournamentDataService;
  private mongoStorageService: MongoStorageService;
  private fixtureNew: FixtureNew;
  private leagueNew: LeagueNew;
  private progress: SyncProgress;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.mongoService = new KorastatsMongoService();
    this.cacheService = new CacheService();
    this.matchDataService = new MatchDataService();
    this.tournamentDataService = new TournamentDataService();
    this.mongoStorageService = new MongoStorageService();
    this.fixtureNew = new FixtureNew();
    this.leagueNew = new LeagueNew();
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Initializing...",
      startTime: new Date(),
      errors: [],
    };
  }

  // ============================================================================
  // MAIN SYNC METHODS
  // ============================================================================

  /**
   * Full sync - collect all data based on options
   */
  async fullSync(options: SyncOptions = {}): Promise<SyncProgress> {
    console.log("🚀 Starting full sync...");
    this.resetProgress();

    try {
      // Connect to MongoDB
      await this.mongoService.connect();

      // Step 1: Sync Countries (always first - needed for other entities)
      if (options.syncCountries !== false) {
        await this.syncCountries();
      }

      // Step 2: Sync Tournaments/Leagues
      if (options.syncTournaments !== false) {
        await this.syncTournaments(options);
      }

      // Step 3: Sync Teams
      if (options.syncTeams !== false) {
        await this.syncTeams(options);
      }

      // Step 4: Sync Players
      if (options.syncPlayers !== false) {
        await this.syncPlayers(options);
      }

      // Step 5: Sync Coaches
      if (options.syncCoaches !== false) {
        await this.syncCoaches(options);
      }

      // Step 6: Sync Referees
      if (options.syncReferees !== false) {
        await this.syncReferees(options);
      }
      /*
      // Step 7: Sync Matches/Fixtures
      if (options.syncMatches !== false) {
        await this.syncMatches(options);
      }
      */
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
   * Incremental sync - only sync new/updated data
   */
  async incrementalSync(options: SyncOptions = {}): Promise<SyncProgress> {
    console.log("🔄 Starting incremental sync...");
    this.resetProgress();

    try {
      await this.mongoService.connect();

      // Get last sync time
      const lastSync = await this.getLastSyncTime();
      console.log(`📅 Last sync: ${lastSync || "Never"}`);

      // Sync only new/updated data since last sync
      const syncOptions = {
        ...options,
        dateFrom: lastSync ? new Date(lastSync).toISOString().split("T")[0] : undefined,
      };

      await this.fullSync(syncOptions);

      this.progress.endTime = new Date();
      console.log("✅ Incremental sync completed!");
      return this.progress;
    } catch (error) {
      this.progress.endTime = new Date();
      console.error("❌ Incremental sync failed:", error);
      throw error;
    } finally {
      await this.mongoService.disconnect();
    }
  }

  // ============================================================================
  // INDIVIDUAL SYNC METHODS
  // ============================================================================

  /**
   * Sync countries data
   */
  private async syncCountries(): Promise<void> {
    console.log("🌍 Syncing countries...");
    this.progress.current = "Syncing countries";

    try {
      const countriesResponse = await this.korastatsService.getEntityCountries();

      if (countriesResponse.result === "Success" && countriesResponse.data) {
        const countries = countriesResponse.data.map((country) => ({
          korastats_id: country.id,
          name: country.name,
          code: "",
          flag: country.flag || "",

          competitions: [],
          top_teams: [],
          status: "active",
          last_synced: new Date(),
          sync_version: 1,
        }));

        // Upsert countries
        for (const country of countries) {
          await Models.Country.findOneAndUpdate(
            { korastats_id: country.korastats_id },
            country,
            { upsert: true, new: true },
          );
        }

        console.log(`✅ Synced ${countries.length} countries`);
        this.progress.completed += countries.length;
      }
    } catch (error) {
      console.error("❌ Failed to sync countries:", error);
      this.progress.failed++;
      this.progress.errors.push(`Countries sync failed: ${error.message}`);
    }
  }

  /**
   * Sync tournaments/leagues data
   */
  private async syncTournaments(options: SyncOptions): Promise<void> {
    console.log("🏆 Syncing tournaments...");
    this.progress.current = "Syncing tournaments";

    try {
      const tournamentsResponse = await this.korastatsService.getTournamentList();

      if (tournamentsResponse.result === "Success" && tournamentsResponse.data) {
        let tournaments = tournamentsResponse.data;

        // Filter by specific tournament IDs if provided
        if (options.tournamentIds && options.tournamentIds.length > 0) {
          tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
        }

        for (const tournament of tournaments) {
          const rounds = await this.getTournamentRounds(tournament.id);
          const tournamentStructure = await this.korastatsService.getTournamentStructure(
            tournament.id,
          );

          try {
            // Get league logo from LeagueLogoService
            const leagueLogoInfo = LeagueLogoService.getLeagueLogo(tournament.id);

            const tournamentData = {
              korastats_id: tournament.id,
              name: tournament.tournament,
              season: tournament.season || new Date().getFullYear().toString(),
              logo: leagueLogoInfo?.logo || "",
              country: {
                id: 0,
                name: "Saudi Arabia",
              },
              organizer: {
                id: tournament.organizer?.id || 0,
                name: tournament.organizer?.name || "",
                abbrev: tournament.organizer?.abbrev || "",
              },
              age_group: {
                id: tournament.ageGroup?.id || 0,
                name: tournament.ageGroup?.name || "",
                max_age: tournament.ageGroup?.age?.max,
                min_age: tournament.ageGroup?.age?.min,
              },
              gender: tournamentStructure.data?.gender,
              rounds: rounds || [],
              status: "active",
              last_synced: new Date(),
              sync_version: 1,
            };

            await Models.Tournament.findOneAndUpdate(
              { korastats_id: tournament.id },
              tournamentData,
              { upsert: true, new: true },
            );

            this.progress.completed++;
          } catch (error) {
            console.error(`❌ Failed to sync tournament ${tournament.id}:`, error);
            this.progress.failed++;
            this.progress.errors.push(
              `Tournament ${tournament.id} sync failed: ${error.message}`,
            );
          }
        }

        console.log(`✅ Synced ${tournaments.length} tournaments`);
      }
    } catch (error) {
      console.error("❌ Failed to sync tournaments:", error);
      this.progress.failed++;
      this.progress.errors.push(`Tournaments sync failed: ${error.message}`);
    }
  }

  /**
   * Sync teams data
   */
  private async syncTeams(options: SyncOptions): Promise<void> {
    console.log("⚽ Syncing teams...");
    this.progress.current = "Syncing teams";

    try {
      // Get teams from all tournaments
      const tournaments = await Models.Tournament.find({});

      for (const tournament of tournaments) {
        try {
          const teamsResponse = await this.korastatsService.getTournamentTeamList(
            tournament.korastats_id,
          );

          if (teamsResponse.result === "Success" && teamsResponse.data) {
            for (const team of teamsResponse.data.teams) {
              try {
                // Get team entity data for logo and other details
                let teamEntityData = null;
                let teamLogo = "";
                try {
                  const entityResponse = await this.korastatsService.getEntityTeam(
                    team.id,
                  );
                  if (entityResponse.result === "Success" && entityResponse.data) {
                    teamEntityData = entityResponse.data;
                    // Get team logo using ImageLoad endpoint
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

                // Get team stats
                const teamStatsResponse =
                  await this.korastatsService.getTournamentTeamStats(
                    tournament.korastats_id,
                    team.id,
                  );

                // Clean team name by removing common suffixes (run multiple times to catch all)
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
                  totalPlayers: 0, // Will be updated later
                  foreignPlayers: 0, // Will be updated later
                  averagePlayerAge: 0, // Will be updated later
                  rank: 0, // Will be updated later
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

                await Models.Team.findOneAndUpdate({ korastats_id: team.id }, teamData, {
                  upsert: true,
                  new: true,
                });

                // Store team stats if available
                if (teamStatsResponse.result === "Success" && teamStatsResponse.data) {
                  const teamStatsData = {
                    team_id: team.id,
                    tournament_id: tournament.korastats_id,
                    season: tournament.season,
                    team_name: team.team,
                    detailed_stats: teamStatsResponse.data.stats.map((stat) => ({
                      id: stat.id,
                      stat: stat.stat,
                      value: stat.value,
                    })),
                    stats: this.calculateAggregatedStats(teamStatsResponse.data.stats),
                    status: "active",
                    last_synced: new Date(),
                    sync_version: 1,
                  };

                  await Models.Team.findOneAndUpdate(
                    {
                      team_id: team.id,
                      tournament_id: tournament.korastats_id,
                      season: tournament.season,
                    },
                    teamStatsData,
                    { upsert: true, new: true },
                  );
                }

                this.progress.completed++;
              } catch (error) {
                console.error(`❌ Failed to sync team ${team.id}:`, error);
                this.progress.failed++;
                this.progress.errors.push(
                  `Team ${team.id} sync failed: ${error.message}`,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to sync teams for tournament ${tournament.korastats_id}:`,
            error,
          );
          this.progress.failed++;
          this.progress.errors.push(
            `Tournament ${tournament.korastats_id} teams sync failed: ${error.message}`,
          );
        }
      }

      console.log("✅ Teams sync completed");
    } catch (error) {
      console.error("❌ Failed to sync teams:", error);
      this.progress.failed++;
      this.progress.errors.push(`Teams sync failed: ${error.message}`);
    }
  }

  /**
   * Sync players data
   */
  private async syncPlayers(options: SyncOptions): Promise<void> {
    console.log("👤 Syncing players...");
    this.progress.current = "Syncing players";

    try {
      // Get players from teams
      const teams = await Models.Team.find({ status: "active" }).limit(100); // Limit for performance

      for (const team of teams) {
        try {
          // Get team players from tournament
          const tournaments = await Models.Tournament.find({ status: "active" });

          for (const tournament of tournaments) {
            try {
              const playersResponse =
                await this.korastatsService.getTournamentTeamPlayerList(
                  tournament.korastats_id,
                );

              if (playersResponse.result === "Success" && playersResponse.data) {
                for (const team of playersResponse.data.teams) {
                  for (const player of team.players) {
                    const playerImageUrl = await this.korastatsService.getImageUrl(
                      "player",
                      player.id,
                    );
                    try {
                      // Get detailed player info
                      const playerInfoResponse =
                        await this.korastatsService.getPlayerInfo(player.id);

                      if (
                        playerInfoResponse.result === "Success" &&
                        playerInfoResponse.data
                      ) {
                        const playerData = {
                          korastats_id: player.id,
                          name: player.name,
                          nickname: player.nickname || "",
                          date_of_birth: new Date(player.dob || "1990-01-01"),
                          age:
                            new Date().getFullYear() -
                              new Date(player.dob || "1990-01-01").getFullYear() || 25,
                          nationality: {
                            id: player.nationality?.id || 0,
                            name: player.nationality?.name || "",
                          },
                          height: "0", // None
                          weight: "0", // None
                          preferred_foot: "", // will be updated later
                          positions: {
                            primary: {
                              id: player.position?.primary?.id || 0,
                              name: player.position?.primary?.name || "Unknown",
                              category: "Unknown primary", // will be updated later
                            },
                            secondary: {
                              id: player.position?.secondary?.id || 0,
                              name: player.position?.secondary?.name || "Unknown",
                              category: "Unknown secondary", // will be updated later
                            },
                          },

                          career_summary: [],
                          image_url: playerImageUrl || "",
                          status: "active",
                          last_synced: new Date(),
                          sync_version: 1,
                        };

                        await Models.Player.findOneAndUpdate(
                          { korastats_id: player.id },
                          playerData,
                          { upsert: true, new: true },
                        );

                        this.progress.completed++;
                      }
                    } catch (error) {
                      console.error(`❌ Failed to sync player ${player.id}:`, error);
                      this.progress.failed++;
                      this.progress.errors.push(
                        `Player ${player.id} sync failed: ${error.message}`,
                      );
                    }
                  }
                }
              }
            } catch (error) {
              console.error(
                `❌ Failed to sync players for team ${team.korastats_id} in tournament ${tournament.korastats_id}:`,
                error,
              );
              this.progress.failed++;
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to sync players for team ${team.korastats_id}:`,
            error,
          );
          this.progress.failed++;
        }
      }

      console.log("✅ Players sync completed");
    } catch (error) {
      console.error("❌ Failed to sync players:", error);
      this.progress.failed++;
      this.progress.errors.push(`Players sync failed: ${error.message}`);
    }
  }

  /**
   * Sync coaches data
   */
  private async syncCoaches(options: SyncOptions): Promise<void> {
    console.log("👨‍💼 Syncing coaches...");
    this.progress.current = "Syncing coaches";

    try {
      const tournaments = await Models.Tournament.find({ status: "active" });

      for (const tournament of tournaments) {
        try {
          const coachesResponse = await this.korastatsService.getTournamentCoachList(
            tournament.korastats_id,
          );

          if (coachesResponse.result === "Success" && coachesResponse.data) {
            for (const coach of coachesResponse.data) {
              try {
                // Get detailed coach info
                const coachInfoResponse = await this.korastatsService.getEntityCoach(
                  coach.id,
                );

                if (coachInfoResponse.result === "Success" && coachInfoResponse.data) {
                  const coachData = {
                    korastats_id: coach.id,
                    name: coach.name,
                    firstname: coach.name.split(" ")[0] || null,
                    lastname: coach.name.split(" ")[1] || null,
                    age:
                      new Date().getFullYear() -
                        new Date(coach.dob || "1990-01-01").getFullYear() || null,
                    nationality: {
                      id: coach.nationality?.id || 0,
                      name: coach.nationality?.name || "",
                    },

                    career_history: [],
                    coaching_stats: {
                      total_matches: 0,
                      total_wins: 0,
                      total_draws: 0,
                      total_losses: 0,
                      win_percentage: 0,
                      current_team_matches: 0,
                      current_team_wins: 0,
                      current_team_draws: 0,
                      current_team_losses: 0,
                    },
                    trophies: [],
                    status: "active",
                    last_synced: new Date(),
                    sync_version: 1,
                  };

                  await Models.Coach.findOneAndUpdate(
                    { korastats_id: coach.id },
                    coachData,
                    { upsert: true, new: true },
                  );

                  this.progress.completed++;
                }
              } catch (error) {
                console.error(`❌ Failed to sync coach ${coach.id}:`, error);
                this.progress.failed++;
                this.progress.errors.push(
                  `Coach ${coach.id} sync failed: ${error.message}`,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to sync coaches for tournament ${tournament.korastats_id}:`,
            error,
          );
          this.progress.failed++;
        }
      }

      console.log("✅ Coaches sync completed");
    } catch (error) {
      console.error("❌ Failed to sync coaches:", error);
      this.progress.failed++;
      this.progress.errors.push(`Coaches sync failed: ${error.message}`);
    }
  }

  /**
   * Sync referees data
   */
  private async syncReferees(options: SyncOptions): Promise<void> {
    console.log("👨‍⚖️ Syncing referees...");
    this.progress.current = "Syncing referees";

    try {
      const tournaments = await Models.Tournament.find({ status: "active" });

      for (const tournament of tournaments) {
        try {
          const refereesResponse = await this.korastatsService.getTournamentRefereeList(
            tournament.korastats_id,
          );

          if (refereesResponse.result === "Success" && refereesResponse.data) {
            for (const referee of refereesResponse.data.referees) {
              try {
                // Get detailed referee info
                const refereeInfoResponse = await this.korastatsService.getEntityReferee(
                  referee.id,
                );

                if (
                  refereeInfoResponse.result === "Success" &&
                  refereeInfoResponse.data
                ) {
                  const refereeData = {
                    korastats_id: referee.id,
                    name: referee.name,
                    firstname: referee.name.split(" ")[0] || null,
                    lastname: referee.name.split(" ")[1] || null,
                    nationality: {
                      id: refereeInfoResponse.data.nationality?.id || 0,
                      name: refereeInfoResponse.data.nationality?.name || "",
                    },
                    age:
                      new Date().getFullYear() -
                        new Date(referee.dob || "1990-01-01").getFullYear() || null,
                    experience_years:
                      new Date().getFullYear() -
                        (new Date(referee.dob || "1990-01-01").getFullYear() + 10) ||
                      null,
                    career_stats: {
                      total_matches: referee.stats.MatchesPlayed || 0,
                      total_yellow_cards: referee.stats["Yellow Card"] || 0,
                      total_red_cards: referee.stats["Direct Red Card"] || 0,
                      total_penalties: referee.stats.Penalties || 0,
                      average_cards_per_match: 0,
                    },
                    recent_matches: [],
                    status: "active",
                    last_synced: new Date(),
                    sync_version: 1,
                  };

                  await Models.Referee.findOneAndUpdate(
                    { korastats_id: referee.id },
                    refereeData,
                    { upsert: true, new: true },
                  );

                  this.progress.completed++;
                }
              } catch (error) {
                console.error(`❌ Failed to sync referee ${referee.id}:`, error);
                this.progress.failed++;
                this.progress.errors.push(
                  `Referee ${referee.id} sync failed: ${error.message}`,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to sync referees for tournament ${tournament.korastats_id}:`,
            error,
          );
          this.progress.failed++;
        }
      }

      console.log("✅ Referees sync completed");
    } catch (error) {
      console.error("❌ Failed to sync referees:", error);
      this.progress.failed++;
      this.progress.errors.push(`Referees sync failed: ${error.message}`);
    }
  }

  /**
   * Sync matches/fixtures data
   */
  /*
  private async syncMatches(options: SyncOptions): Promise<void> {
    console.log("⚽ Syncing matches...");
    this.progress.current = "Syncing matches";

    try {
      const tournaments = await Models.Tournament.find({ status: "active" });

      for (const tournament of tournaments) {
        try {
          // Use DataCollectorService for complex match data collection
          const matches = await this.dataCollectorService.collectFixtureData(
            tournament.korastats_id,
            tournament.season,
            undefined, // teamId
            options.dateFrom,
            options.dateTo,
          );

          // Store matches in MongoDB
          for (const match of matches) {
            try {
              await rehensive.findOneAndUpdate(
                { korastats_id: match.korastats_id },
                match,
                { upsert: true, new: true },
              );

              this.progress.completed++;
            } catch (error) {
              console.error(`❌ Failed to sync match ${match.korastats_id}:`, error);
              this.progress.failed++;
              this.progress.errors.push(
                `Match ${match.korastats_id} sync failed: ${error.message}`,
              );
            }
          }

          console.log(
            `✅ Synced ${matches.length} matches for tournament ${tournament.korastats_id}`,
          );
        } catch (error) {
          console.error(
            `❌ Failed to sync matches for tournament ${tournament.korastats_id}:`,
            error,
          );
          this.progress.failed++;
          this.progress.errors.push(
            `Tournament ${tournament.korastats_id} matches sync failed: ${error.message}`,
          );
        }
      }

      console.log("✅ Matches sync completed");
    } catch (error) {
      console.error("❌ Failed to sync matches:", error);
      this.progress.failed++;
      this.progress.errors.push(`Matches sync failed: ${error.message}`);
    }
  }
  */
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * Reset progress tracking
   */
  private resetProgress(): void {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      current: "Initializing...",
      startTime: new Date(),
      errors: [],
    };
  }

  /**
   * Get last sync time from sync logs
   */
  private async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSync = await Models.SyncLog.findOne().sort({ created_at: -1 }).limit(1);

      return lastSync ? lastSync.created_at : null;
    } catch (error) {
      console.error("Failed to get last sync time:", error);
      return null;
    }
  }

  /**
   * Calculate aggregated stats from detailed KoraStats stats
   */
  private calculateAggregatedStats(
    detailedStats: Array<{ id: number; stat: string; value: number }>,
  ): {
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    position: number;
  } {
    const statsMap = new Map(detailedStats.map((stat) => [stat.stat, stat.value]));

    return {
      matches_played: statsMap.get("Matches Played as Lineup") || 0,
      wins: statsMap.get("Win") || 0,
      draws: statsMap.get("Draw") || 0,
      losses: statsMap.get("Lost") || 0,
      goals_for: statsMap.get("Goals Scored") || 0,
      goals_against: statsMap.get("Goals Conceded") || 0,
      goal_difference:
        (statsMap.get("Goals Scored") || 0) - (statsMap.get("Goals Conceded") || 0),
      points: (statsMap.get("Win") || 0) * 3 + (statsMap.get("Draw") || 0),
      position: 0, // Will be calculated based on standings
    };
  }

  /**
   * Log sync operation
   */
  private async logSync(
    operation: string,
    status: "success" | "failed",
    details?: any,
  ): Promise<void> {
    try {
      await Models.SyncLog.create({
        operation,
        status,
        details: details || {},
        created_at: new Date(),
      });
    } catch (error) {
      console.error("Failed to log sync operation:", error);
    }
  }

  // ========== COMPREHENSIVE MODULE SYNCERS ==========

  /**
   * Comprehensive League/Tournament Syncer
   * Priority: HIGH - Foundation for all other data
   * Uses: TournamentList endpoint
   * Maps: TournamentList -> Tournament MongoDB Schema
   */
  async syncLeaguesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting comprehensive league sync...",
      startTime: new Date(),
    };

    try {
      console.log("🏆 Starting comprehensive league sync...");

      // Get tournament list from KoraStats
      const tournamentList = await this.korastatsService.getTournamentList();

      if (!tournamentList || !tournamentList.data) {
        throw new ApiError(500, "Failed to fetch tournament list from KoraStats");
      }

      progress.total = tournamentList.data.length;
      progress.current = `Processing ${progress.total} leagues...`;

      // Process leagues in batches
      const batchSize = options.batchSize || 10;
      const delayBetweenBatches = options.delayBetweenBatches || 1000;

      for (let i = 0; i < tournamentList.data.length; i += batchSize) {
        const batch = tournamentList.data.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (tournament) => {
            try {
              // Check if tournament already exists
              if (!options.forceResync) {
                const existing = await Models.Tournament.findOne({
                  korastats_id: tournament.id,
                });

                if (existing && options.skipExisting) {
                  progress.completed++;
                  return;
                }
              }

              // Get league logo from our mapping service
              const leagueLogoInfo = LeagueLogoService.getLeagueLogo(tournament.id);

              // Prepare comprehensive tournament data for MongoDB
              const tournamentData = {
                korastats_id: tournament.id,
                name: tournament.tournament,
                short_name: tournament.organizer?.abbrev || "",
                season: tournament.season,
                start_date: new Date(tournament.startDate),
                end_date: new Date(tournament.endDate),
                country: {
                  id: tournament.organizer?.country?.id || 0,
                  name: tournament.organizer?.country?.name || "",
                  code: "",
                  flag: "",
                },
                logo: leagueLogoInfo?.logo || "",
                type: this.determineTournamentType(tournament.tournament),
                status: this.determineTournamentStatus(
                  tournament.startDate,
                  tournament.endDate,
                ),
                gender: tournament.ageGroup?.name || "Senior",
                age_group: {
                  id: tournament.ageGroup?.id || 0,
                  name: tournament.ageGroup?.name || "Senior",
                  min_age: tournament.ageGroup?.age?.min || null,
                  max_age: tournament.ageGroup?.age?.max || null,
                },
                organizer: {
                  id: tournament.organizer?.id || 0,
                  name: tournament.organizer?.name || "",
                  abbrev: tournament.organizer?.abbrev || "",
                  country: tournament.organizer?.country?.name || "",
                  continent: tournament.organizer?.continent || "",
                },
                last_synced: new Date(),
                sync_version: 1,
              };

              // Save to MongoDB
              await Models.Tournament.findOneAndUpdate(
                { korastats_id: tournament.id },
                tournamentData,
                { upsert: true, new: true },
              );

              progress.completed++;
              console.log(
                `✅ Synced league: ${tournament.tournament} (${tournament.season})`,
              );
            } catch (error) {
              progress.failed++;
              console.error(`❌ Failed to sync league ${tournament.id}:`, error);
            }
          }),
        );

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < tournamentList.data.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      progress.endTime = new Date();
      progress.current = `League sync completed. ${progress.completed} successful, ${progress.failed} failed.`;

      console.log(
        `🏆 League sync completed: ${progress.completed}/${progress.total} successful`,
      );

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `League sync failed: ${error.message}`;
      console.error("❌ League sync failed:", error);
      throw error;
    }
  }

  /**
   * Comprehensive Matches Syncer
   * Priority: HIGH - Core match data
   * Uses: TournamentMatchList, MatchSummary, MatchSquad, MatchTimeline
   * Maps: Multiple KoraStats responses -> Match MongoDB Schema
   */
  /*
  async syncMatchesComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting comprehensive matches sync...",
      startTime: new Date(),
    };

    try {
      console.log("⚽ Starting comprehensive matches sync...");

      // Get tournaments to sync matches for
      const tournaments = await Models.Tournament.find({ status: "active" });

      if (tournaments.length === 0) {
        throw new ApiError(
          400,
          "No active tournaments found. Please sync leagues first.",
        );
      }

      progress.total = tournaments.length;
      progress.current = `Processing matches for ${progress.total} tournaments...`;

      // Process each tournament
      for (const tournament of tournaments) {
        try {
          progress.current = `Syncing matches for ${tournament.name}...`;

          // Get match list for this tournament
          const matchListResponse = await this.korastatsService.getTournamentMatchList(
            tournament.korastats_id,
          );

          if (!matchListResponse || !matchListResponse.data) {
            console.warn(`No matches found for tournament ${tournament.name}`);
            progress.completed++;
            continue;
          }

          const matches = matchListResponse.data;
          console.log(`Found ${matches.length} matches for ${tournament.name}`);

          // Process matches in batches
          const batchSize = options.batchSize || 5; // Smaller batches for matches due to complexity
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

                    if (existing && options.skipExisting) {
                      return;
                    }
                  }

                  // Get additional match data
                  const [matchSummary, matchSquad, matchTimeline] = await Promise.all([
                    this.korastatsService.getMatchSummary(match.matchId),
                    this.korastatsService.getMatchSquad(match.matchId),
                    this.korastatsService.getMatchTimeline(match.matchId),
                  ]);

                  // Prepare comprehensive match data for MongoDB
                  const matchData = {
                    korastats_id: match.matchId,
                    tournament_id: tournament.korastats_id,
                    season: tournament.season,
                    round: match.round || 1,
                    date: new Date(match.dateTime),
                    status: {
                      id: match.status?.id || 0,
                      name: match.status?.status || "Scheduled",
                      short: match.status?.status?.substring(0, 3) || "SCH",
                    },
                    teams: {
                      home: {
                        id: match.home?.id || 0,
                        name: match.home?.name || "Unknown",
                        score: matchSummary?.data.score.away || 0,
                        formation: matchSquad?.data[0].ho || null,
                      },
                      away: {
                        id: match.away?.id || 0,
                        name: match.away?.name || "Unknown",
                        score: matchSummary?.awayScore || 0,
                        formation: matchSquad?.awayFormation || null,
                      },
                    },
                    venue: {
                      id: match.stadium?.id || 0,
                      name: match.stadium?.name || "Unknown Venue",
                      city: "",
                      country: "",
                    },
                    officials: {
                      referee: {
                        id: match.referee?.id || 0,
                        name: match.referee?.name || "Unknown Referee",
                      },
                      assistant1: {
                        id: 0,
                        name: "Unknown Assistant",
                      },
                      assistant2: {
                        id: 0,
                        name: "Unknown Assistant",
                      },
                    },
                    events: matchTimeline?.events || [],
                    lineups: matchSquad?.lineups || [],
                    statistics: matchSummary?.statistics || [],
                    quick_stats: {
                      total_goals:
                        (matchSummary?.homeScore || 0) + (matchSummary?.awayScore || 0),
                      total_cards: 0, // Will be calculated from events
                      possession: {
                        home: matchSummary?.possession?.home || 50,
                        away: matchSummary?.possession?.away || 50,
                      },
                    },
                    last_synced: new Date(),
                    sync_version: 1,
                  };

                  // Save to MongoDB
                  await Models.Match.findOneAndUpdate(
                    { korastats_id: match.matchId },
                    matchData,
                    { upsert: true, new: true },
                  );

                  console.log(
                    `✅ Synced match: ${match.home?.name} vs ${match.away?.name}`,
                  );
                } catch (error) {
                  console.error(`❌ Failed to sync match ${match.matchId}:`, error);
                }
              }),
            );

            // Add delay between batches
            if (i + batchSize < matches.length) {
              await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
            }
          }

          progress.completed++;
          console.log(`✅ Completed matches sync for ${tournament.name}`);
        } catch (error) {
          progress.failed++;
          console.error(
            `❌ Failed to sync matches for tournament ${tournament.name}:`,
            error,
          );
        }
      }

      progress.endTime = new Date();
      progress.current = `Matches sync completed. ${progress.completed} tournaments processed.`;

      console.log(
        `⚽ Matches sync completed: ${progress.completed}/${progress.total} tournaments processed`,
      );

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Matches sync failed: ${error.message}`;
      console.error("❌ Matches sync failed:", error);
      throw error;
    }
  }

  /**
   * Comprehensive Teams Syncer
   * Priority: HIGH - Core team data
   * Uses: TournamentTeamList, TournamentTeamStats, EntityCoach
   * Maps: Multiple KoraStats responses -> Team MongoDB Schema
   */

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
      const tournamentsList = await this.tournamentDataService.getTournamentList();
      if (!tournamentsList || tournamentsList.length === 0) {
        throw new ApiError(400, "No tournaments found");
      }

      // Filter tournaments if specific IDs provided
      let tournaments = tournamentsList;
      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
      }

      // Apply limit for testing if specified
      if (options.limit) {
        tournaments = tournaments.slice(0, options.limit);
      }

      this.progress.total = tournaments.length;
      console.log(
        `📊 Processing ${tournaments.length} tournaments${options.limit ? ` (limited from ${tournamentsList.length})` : ""}`,
      );

      // Step 2: Collect tournament data with progress tracking
      const tournamentIds = tournaments.map((t) => t.id);
      const tournamentDataResults =
        await this.tournamentDataService.collectTournamentsData(
          tournamentIds,
          (progress) => {
            this.progress.current = `Collecting tournament data: ${progress.completed}/${progress.total} tournaments`;
          },
        );

      // Step 3: Filter successful results and map data
      const successfulResults = tournamentDataResults.filter((result) => result.success);
      console.log(
        `✅ Successfully collected data for ${successfulResults.length}/${tournamentIds.length} tournaments`,
      );

      if (successfulResults.length === 0) {
        throw new ApiError(400, "No successful tournament data collection");
      }

      // Step 4: Map data using LeagueNew mapper
      const mappedTournaments = await Promise.all(
        successfulResults.map(async (result) => {
          try {
            // Find the original tournament data for this result
            const originalTournament = tournaments.find(
              (t) => t.id === result.tournamentId,
            );
            if (!originalTournament) {
              throw new Error(
                `Original tournament data not found for ID ${result.tournamentId}`,
              );
            }

            return await this.leagueNew.tournamentMapper(
              originalTournament,
              result.data!.matchList,
              result.data!.listStatTypes,
              result.data!.tournamentStructure,
            );
          } catch (error) {
            console.error(`❌ Failed to map tournament ${result.tournamentId}:`, error);
            this.progress.errors.push(
              `Mapping failed for tournament ${result.tournamentId}: ${error.message}`,
            );
            return null;
          }
        }),
      );

      const validMappedTournaments = mappedTournaments.filter(
        (tournament) => tournament !== null,
      );

      console.log(`🔄 Mapped ${validMappedTournaments.length} tournaments`);

      // Step 5: Store in MongoDB with progress tracking
      const storageResults = await this.mongoStorageService.storeTournaments(
        validMappedTournaments,
        (progress) => {
          this.progress.current = `Storing tournaments: ${progress.completed}/${progress.total} tournaments`;
        },
      );

      const successfulStorage = storageResults.filter((result) => result.success);
      console.log(
        `💾 Successfully stored ${successfulStorage.length}/${validMappedTournaments.length} tournaments`,
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

      // Filter tournaments if specific IDs provided
      let tournaments = tournamentsList.data;
      if (options.tournamentIds && options.tournamentIds.length > 0) {
        tournaments = tournaments.filter((t) => options.tournamentIds!.includes(t.id));
      }

      this.progress.total = tournaments.length;
      console.log(`📊 Processing ${tournaments.length} tournaments`);

      // Step 2: Process each tournament
      for (const tournament of tournaments) {
        try {
          this.progress.current = `Processing tournament: ${tournament.tournament}`;
          console.log(
            `🏆 Processing tournament: ${tournament.tournament} (${tournament.id})`,
          );

          // Get match list for this tournament
          const matchListResponse = await this.korastatsService.getTournamentMatchList(
            tournament.id,
          );
          if (!matchListResponse.data || matchListResponse.data.length === 0) {
            console.warn(`⚠️ No matches found for tournament ${tournament.tournament}`);
            this.progress.completed++;
            continue;
          }

          const matchIds = matchListResponse.data.map((match) => match.matchId);
          console.log(`📋 Found ${matchIds.length} matches for ${tournament.tournament}`);

          // Apply limit for testing if specified
          const limitedMatchIds = options.limit
            ? matchIds.slice(0, options.limit)
            : matchIds;
          console.log(
            `📊 Processing ${limitedMatchIds.length} matches${options.limit ? ` (limited from ${matchIds.length})` : ""}`,
          );

          // Step 3: Collect match data with progress tracking
          const matchDataResults = await this.matchDataService.collectMatchesData(
            limitedMatchIds,
            (progress) => {
              this.progress.current = `Collecting data for ${tournament.tournament}: ${progress.completed}/${progress.total} matches`;
            },
          );

          // Step 4: Filter successful results and map data
          const successfulResults = matchDataResults.filter((result) => result.success);
          console.log(
            `✅ Successfully collected data for ${successfulResults.length}/${matchIds.length} matches`,
          );

          if (successfulResults.length === 0) {
            console.warn(
              `⚠️ No successful data collection for tournament ${tournament.tournament}`,
            );
            this.progress.completed++;
            continue;
          }

          // Step 5: Calculate top performers and collect heatmaps for each match
          const mappedMatches = await Promise.all(
            successfulResults.map(async (result) => {
              try {
                const playersStats = result.data.matchPlayersStats.players.map(
                  (player) => ({
                    player: {
                      id: player.id,
                      name: player.name,
                      number: player.shirtnumber,
                      statistics: {
                        ...this.mapPlayerDetailedStats(player.stats),
                        games: {
                          ...this.mapPlayerDetailedStats(player.stats).games,
                          number: player.shirtnumber,
                          position: player.position?.name || "Unknown",
                          rating: "0.0",
                          captain: false,
                        },
                      },
                    },
                  }),
                );
                // Calculate top performers
                const topPerformers = this.calculateTopPerformers(
                  playersStats,
                  result.data!.matchSquad,
                );

                // Collect heatmaps for top performers
                const heatmaps = await this.collectPlayerHeatmaps(
                  topPerformers,
                  result.data!.matchSummary,
                );

                return this.fixtureNew.matchMapper(
                  result.data!.matchPlayersStats,
                  result.data!.matchSummary,
                  result.data!.matchSquad,
                  result.data!.matchTimeline,
                  result.data!.matchFormationHome,
                  result.data!.matchFormationAway,
                  result.data!.matchPossessionTimeline,
                  result.data!.matchVideo,
                  topPerformers,
                  heatmaps,
                );
              } catch (error) {
                console.error(`❌ Failed to map match ${result.matchId}:`, error);
                this.progress.errors.push(
                  `Mapping failed for match ${result.matchId}: ${error.message}`,
                );
                return null;
              }
            }),
          );

          const validMappedMatches = mappedMatches.filter((match) => match !== null);

          console.log(
            `🔄 Mapped ${validMappedMatches.length} matches for ${tournament.tournament}`,
          );

          // Step 6: Store in MongoDB with progress tracking
          const storageResults = await this.mongoStorageService.storeMatches(
            validMappedMatches,
            (progress) => {
              this.progress.current = `Storing matches for ${tournament.tournament}: ${progress.completed}/${progress.total} matches`;
            },
          );

          const successfulStorage = storageResults.filter((result) => result.success);
          console.log(
            `💾 Successfully stored ${successfulStorage.length}/${mappedMatches.length} matches for ${tournament.tournament}`,
          );

          this.progress.completed++;
          console.log(`✅ Completed tournament: ${tournament.tournament}`);
        } catch (error) {
          console.error(
            `❌ Failed to process tournament ${tournament.tournament}:`,
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

      // Get all tournaments to sync teams for (not just active ones)
      const tournaments = await Models.Tournament.find({});

      if (tournaments.length === 0) {
        throw new ApiError(400, "No tournaments found. Please sync leagues first.");
      }

      progress.total = tournaments.length;
      progress.current = `Processing teams for ${progress.total} tournaments...`;

      // Process each tournament
      for (const tournament of tournaments) {
        try {
          progress.current = `Syncing teams for ${tournament.name}...`;

          // Get team list for this tournament
          const teamListResponse = await this.korastatsService.getTournamentTeamList(
            tournament.korastats_id,
          );

          if (!teamListResponse || !teamListResponse.data?.teams) {
            console.warn(`No teams found for tournament ${tournament.name}`);
            progress.completed++;
            continue;
          }

          const teams = teamListResponse.data.teams;
          console.log(`Found ${teams.length} teams for ${tournament.name}`);

          // Process teams in batches
          const batchSize = options.batchSize || 5;
          const delayBetweenBatches = options.delayBetweenBatches || 2000;

          for (let i = 0; i < teams.length; i += batchSize) {
            const batch = teams.slice(i, i + batchSize);

            await Promise.all(
              batch.map(async (team) => {
                try {
                  // Check if team already exists
                  if (!options.forceResync) {
                    const existing = await Models.Team.findOne({
                      korastats_id: team.id,
                    });

                    if (existing && options.skipExisting) {
                      return;
                    }
                  }

                  // Get team entity data first to get the club ID
                  const teamEntity = await this.korastatsService
                    .getEntityTeam(team.id)
                    .catch(() => null);

                  // Get team logo using ImageLoad endpoint
                  const teamLogo = await this.korastatsService
                    .getImageUrl("club", teamEntity?.club?.id || team.id)
                    .catch(() => "");

                  // Get additional team data using the correct club ID from team entity
                  const [teamStats, coachInfo, clubInfo, standingsData] =
                    await Promise.all([
                      this.korastatsService
                        .getTournamentTeamStats(tournament.korastats_id, team.id)
                        .catch(() => null),
                      this.korastatsService.getEntityCoach(team.id).catch(() => null),
                      teamEntity?.club?.id
                        ? this.korastatsService
                            .getEntityClub(teamEntity.club.id)
                            .catch(() => null)
                        : Promise.resolve(null),
                      // Get standings to extract team rank
                      this.korastatsService
                        .getTournamentGroupStandings(tournament.korastats_id, "1")
                        .catch(() => null),
                    ]);

                  // Clean team name by removing common suffixes (run multiple times to catch all)
                  let cleanTeamName = team.team;
                  for (let i = 0; i < 3; i++) {
                    cleanTeamName = cleanTeamName
                      .replace(
                        /\s+(FC|SC|U19|U21|U23|Club|United|City|Town|Athletic|Sporting|Football|Soccer|KSA)\s*$/i,
                        "",
                      )
                      .trim();
                  }

                  // Extract team rank from standings data
                  let teamRank = 0;
                  if (standingsData?.data?.stages?.[0]?.groups?.[0]?.standings) {
                    const standings = standingsData.data.stages[0].groups[0].standings;
                    const teamStanding = standings.find(
                      (standing: any) =>
                        standing.team === team.team || standing.team === cleanTeamName,
                    );
                    if (teamStanding) {
                      teamRank = teamStanding.rank || 0;
                    }
                  }

                  // Prepare comprehensive team data for MongoDB
                  const teamData = {
                    korastats_id: team.id,
                    name: cleanTeamName,
                    short_name: cleanTeamName.substring(0, 3).toUpperCase(),
                    code: cleanTeamName.substring(0, 3).toUpperCase(),
                    logo: teamLogo,
                    founded: null,
                    national: clubInfo?.national_federation || false,
                    rank: teamRank,
                    country: clubInfo?.country?.name || "Saudi Arabia",
                    venue: {
                      id: team.stadium?.id || 0,
                      name: team.stadium?.name || "Unknown Venue",
                      city: "",
                      capacity: 0,
                    },
                    coach: coachInfo
                      ? {
                          id: coachInfo.id,
                          name: coachInfo.name,
                          firstname: coachInfo.name?.split(" ")[0] || "",
                          lastname: coachInfo.name?.split(" ").slice(1).join(" ") || "",
                          nationality: coachInfo.nationality || "",
                          age: coachInfo.age || null,
                        }
                      : null,
                    current_leagues: [
                      {
                        id: tournament.korastats_id,
                        name: tournament.name,
                        season: tournament.season,
                      },
                    ],
                    statistics: null,
                    squad: [],
                    foreign_players_count: 0,
                    average_player_age: 0,
                    club_market_value: 0,
                    last_synced: new Date(),
                    sync_version: 1,
                  };

                  // Save to MongoDB
                  await Models.Team.findOneAndUpdate(
                    { korastats_id: team.id },
                    teamData,
                    { upsert: true, new: true },
                  );

                  console.log(`✅ Synced team: ${team.team}`);
                } catch (error) {
                  console.error(`❌ Failed to sync team ${team.id}:`, error);
                }
              }),
            );

            // Add delay between batches
            if (i + batchSize < teams.length) {
              await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
            }
          }

          progress.completed++;
          console.log(`✅ Completed teams sync for ${tournament.name}`);
        } catch (error) {
          progress.failed++;
          console.error(
            `❌ Failed to sync teams for tournament ${tournament.name}:`,
            error,
          );
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
    }
  }
  async getTournamentRounds(tournamentId: number): Promise<string[]> {
    const matchListResponse =
      await this.korastatsService.getTournamentMatchList(tournamentId);
    return matchListResponse.data?.map((match) => "Round " + match.round) || [];
  }
  /**
   * Comprehensive Players Syncer
   * Priority: HIGH - Core player data
   * Uses: TournamentPlayerStats, PlayerInfo, TournamentTeamPlayerList
   * Maps: Multiple KoraStats responses -> Player MongoDB Schema
   */
  async syncPlayersComprehensive(options: SyncOptions = {}): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      current: "Starting comprehensive players sync...",
      startTime: new Date(),
    };

    try {
      console.log("⚽ Starting comprehensive players sync...");

      // Get tournaments to sync players for
      const tournaments = await Models.Tournament.find({ status: "active" });

      if (tournaments.length === 0) {
        throw new ApiError(
          400,
          "No active tournaments found. Please sync leagues first.",
        );
      }

      progress.total = tournaments.length;
      progress.current = `Processing players for ${progress.total} tournaments...`;

      // Process each tournament
      for (const tournament of tournaments) {
        try {
          progress.current = `Syncing players for ${tournament.name}...`;

          // Get team players for this tournament
          const teamPlayersResponse =
            await this.korastatsService.getTournamentTeamPlayerList(
              tournament.korastats_id,
            );

          if (!teamPlayersResponse || !teamPlayersResponse.data?.teams) {
            console.warn(`No teams/players found for tournament ${tournament.name}`);
            progress.completed++;
            continue;
          }

          const teams = teamPlayersResponse.data.teams;
          let totalPlayers = 0;

          // Process each team to get players
          for (const team of teams) {
            try {
              if (!team.players || team.players.length === 0) {
                continue;
              }

              const players = team.players;
              totalPlayers += players.length;

              // Process players in batches
              const batchSize = options.batchSize || 10;
              const delayBetweenBatches = options.delayBetweenBatches || 1000;

              for (let i = 0; i < players.length; i += batchSize) {
                const batch = players.slice(i, i + batchSize);

                await Promise.all(
                  batch.map(async (player) => {
                    try {
                      // Check if player already exists
                      if (!options.forceResync) {
                        const existing = await Models.Player.findOne({
                          korastats_id: player.id,
                        });

                        if (existing && options.skipExisting) {
                          return;
                        }
                      }

                      // Get additional player data
                      const [playerStats, playerInfo] = await Promise.all([
                        this.korastatsService
                          .getTournamentPlayerStats(tournament.korastats_id)
                          .catch(() => null),
                        this.korastatsService.getPlayerInfo(player.id).catch(() => null),
                      ]);

                      // Calculate age from date of birth
                      const birthDate = new Date(player.dob);
                      const age = new Date().getFullYear() - birthDate.getFullYear();

                      // Prepare comprehensive player data for MongoDB
                      const playerData = {
                        korastats_id: player.id,
                        name: player.name,
                        firstname: player.name?.split(" ")[0] || "",
                        lastname: player.name?.split(" ").slice(1).join(" ") || "",
                        age: age || null,
                        birth_date: birthDate,
                        birth_place: "",
                        nationality: player.nationality?.name || "",
                        height: null,
                        weight: null,
                        injured: false,
                        position: {
                          id: player.position?.primary?.id || 0,
                          name: player.position?.primary?.name || "Unknown",
                          short_name:
                            player.position?.primary?.name?.substring(0, 3) || "UNK",
                        },
                        team: {
                          id: team.id,
                          name: team.team,
                          season: tournament.season,
                        },
                        photo: "",
                        statistics: null, // Will be populated separately
                        last_synced: new Date(),
                        sync_version: 1,
                      };

                      // Save to MongoDB
                      await Models.Player.findOneAndUpdate(
                        { korastats_id: player.id },
                        playerData,
                        { upsert: true, new: true },
                      );

                      console.log(`✅ Synced player: ${player.name} (${team.team})`);
                    } catch (error) {
                      console.error(`❌ Failed to sync player ${player.id}:`, error);
                    }
                  }),
                );

                // Add delay between batches
                if (i + batchSize < players.length) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, delayBetweenBatches),
                  );
                }
              }
            } catch (error) {
              console.error(`❌ Failed to sync players for team ${team.team}:`, error);
            }
          }

          progress.completed++;
          console.log(
            `✅ Completed players sync for ${tournament.name} (${totalPlayers} players)`,
          );
        } catch (error) {
          progress.failed++;
          console.error(
            `❌ Failed to sync players for tournament ${tournament.name}:`,
            error,
          );
        }
      }

      progress.endTime = new Date();
      progress.current = `Players sync completed. ${progress.completed} tournaments processed.`;

      console.log(
        `⚽ Players sync completed: ${progress.completed}/${progress.total} tournaments processed`,
      );

      return progress;
    } catch (error) {
      progress.endTime = new Date();
      progress.current = `Players sync failed: ${error.message}`;
      console.error("❌ Players sync failed:", error);
      throw error;
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Determine tournament type based on name
   */
  private determineTournamentType(tournamentName: string): string {
    const name = tournamentName.toLowerCase();
    if (
      name.includes("league") ||
      name.includes("premier") ||
      name.includes("division")
    ) {
      return "league";
    } else if (name.includes("cup") || name.includes("championship")) {
      return "cup";
    } else if (name.includes("friendly")) {
      return "friendly";
    }
    return "league"; // Default to league
  }

  /**
   * Determine tournament status based on dates
   * For testing purposes, always return "active"
   */
  private determineTournamentStatus(startDate: string, endDate: string): string {
    // Always return "active" for testing purposes
    return "active";

    // Original logic (commented out for testing):
    // const now = new Date();
    // const start = new Date(startDate);
    // const end = new Date(endDate);
    //
    // if (now < start) {
    //   return "upcoming";
    // } else if (now > end) {
    //   return "finished";
    // } else {
    //   return "active";
    // }
  }

  // Calculate top performers for a match
  private calculateTopPerformers(playersStats: any[], matchSquad: any) {
    // Get player IDs for each team from squad data
    const homePlayerIds = new Set(matchSquad.home.squad.map((player: any) => player.id));
    const awayPlayerIds = new Set(matchSquad.away.squad.map((player: any) => player.id));

    // Separate players by team
    const homePlayers = playersStats.filter((player) =>
      homePlayerIds.has(player.player.id),
    );
    const awayPlayers = playersStats.filter((player) =>
      awayPlayerIds.has(player.player.id),
    );

    // Find top scorer for each team
    const homeTopScorer = homePlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.total > max.player.statistics.goals.total
          ? player
          : max,
      homePlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { total: 0 } },
        },
      },
    );

    const awayTopScorer = awayPlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.total > max.player.statistics.goals.total
          ? player
          : max,
      awayPlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { total: 0 } },
        },
      },
    );

    // Find top assister for each team
    const homeTopAssister = homePlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.assists > max.player.statistics.goals.assists
          ? player
          : max,
      homePlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { assists: 0 } },
        },
      },
    );

    const awayTopAssister = awayPlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.assists > max.player.statistics.goals.assists
          ? player
          : max,
      awayPlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { assists: 0 } },
        },
      },
    );

    // Find top keeper (most saves) for each team
    const homeTopKeeper = homePlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.saves > max.player.statistics.goals.saves
          ? player
          : max,
      homePlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { saves: 0 } },
        },
      },
    );

    const awayTopKeeper = awayPlayers.reduce(
      (max, player) =>
        player.player.statistics.goals.saves > max.player.statistics.goals.saves
          ? player
          : max,
      awayPlayers[0] || {
        player: {
          id: 0,
          name: "No Player",
          number: 0,
          statistics: { goals: { saves: 0 } },
        },
      },
    );

    return {
      topScorer: {
        homePlayer: {
          id: homeTopScorer.player.id,
          name: homeTopScorer.player.name,
        },
        awayPlayer: {
          id: awayTopScorer.player.id,
          name: awayTopScorer.player.name,
        },
        stats: [
          {
            name: "Goals",
            home: homeTopScorer.player.statistics.goals.total,
            away: awayTopScorer.player.statistics.goals.total,
          },
          {
            name: "Assists",
            home: homeTopScorer.player.statistics.goals.assists,
            away: awayTopScorer.player.statistics.goals.assists,
          },
          {
            name: "Matches Played",
            home: homeTopScorer.player.statistics.games.appearences,
            away: awayTopScorer.player.statistics.games.appearences,
          },
        ],
      },
      topAssister: {
        homePlayer: {
          id: homeTopAssister.player.id,
          name: homeTopAssister.player.name,
        },
        awayPlayer: {
          id: awayTopAssister.player.id,
          name: awayTopAssister.player.name,
        },
        stats: [
          {
            name: "Assists",
            home: homeTopAssister.player.statistics.goals.assists,
            away: awayTopAssister.player.statistics.goals.assists,
          },
          {
            name: "Matches Played",
            home: homeTopAssister.player.statistics.games.appearences,
            away: awayTopAssister.player.statistics.games.appearences,
          },
        ],
      },
      topKeeper: {
        homePlayer: {
          id: homeTopKeeper.player.id,
          name: homeTopKeeper.player.name,
        },
        awayPlayer: {
          id: awayTopKeeper.player.id,
          name: awayTopKeeper.player.name,
        },
        stats: [
          {
            name: "Goals Saved",
            home: homeTopKeeper.player.statistics.goals.saves,
            away: awayTopKeeper.player.statistics.goals.saves,
          },
        ],
      },
    };
  }

  // Collect player heatmaps for top performers
  private async collectPlayerHeatmaps(topPerformers: any, matchSummary: any) {
    const fieldWidth = 5069;
    const fieldHeight = 3290;
    const homePlayerId = topPerformers.topScorer.homePlayer.id;
    const awayPlayerId = topPerformers.topScorer.awayPlayer.id;

    try {
      // Get heatmaps for both top performers
      const [homePlayerHeatmap, awayPlayerHeatmap] = await Promise.all([
        this.korastatsService.getMatchPlayerHeatmap(matchSummary.matchId, homePlayerId),
        this.korastatsService.getMatchPlayerHeatmap(matchSummary.matchId, awayPlayerId),
      ]);

      const homePoints = [];
      const awayPoints = [];

      // Process home player heatmap
      homePlayerHeatmap.data.forEach((point) => {
        const normalizedX = point.x / fieldWidth;
        const normalizedY = point.y / fieldHeight;
        for (let i = 0; i < point.count; i++) {
          homePoints.push([normalizedX, normalizedY]);
        }
      });

      // Process away player heatmap
      awayPlayerHeatmap.data.forEach((point) => {
        const normalizedX = point.x / fieldWidth;
        const normalizedY = point.y / fieldHeight;
        for (let i = 0; i < point.count; i++) {
          awayPoints.push([normalizedX, normalizedY]);
        }
      });

      return [
        {
          team: {
            id: matchSummary.home.team.id,
            name: matchSummary.home.team.name,
          },
          heatmap: { points: homePoints },
        },
        {
          team: {
            id: matchSummary.away.team.id,
            name: matchSummary.away.team.name,
          },
          heatmap: { points: awayPoints },
        },
      ];
    } catch (error) {
      console.warn(
        `⚠️ Failed to collect heatmaps for match ${matchSummary.matchId}:`,
        error,
      );
      // Return empty heatmaps on error
      return [
        {
          team: {
            id: matchSummary.home.team.id,
            name: matchSummary.home.team.name,
          },
          heatmap: { points: [] },
        },
        {
          team: {
            id: matchSummary.away.team.id,
            name: matchSummary.away.team.name,
          },
          heatmap: { points: [] },
        },
      ];
    }
  }
  private mapPlayerDetailedStats(stats: KorastatsPlayerDetailedStats) {
    return {
      games: {
        appearences: stats.Admin.MatchesPlayed,
        lineups: stats.Admin.MatchesPlayed - stats.Admin.MatchesPlayedasSub,
        minutes: stats.Admin.MinutesPlayed,
        captain: false, // Would need additional data
      },
      substitutes: {
        in: stats.Admin.MatchesPlayerSubstitutedIn,
        out: stats.Admin.MatchesPlayedasSub,
        bench: 0, // Would need additional data
      },
      shots: {
        total: stats.Attempts.Total,
        on: stats.Attempts.Success,
      },
      goals: {
        total: stats.GoalsScored.Total,
        conceded: stats.GoalsConceded.Total,
        assists: stats.Chances.Assists,
        saves: stats.Defensive.GoalsSaved,
      },
      passes: {
        total: stats.Pass.Total,
        key: stats.Chances.KeyPasses,
        accuracy: stats.Pass.Accuracy,
      },
      tackles: {
        total: stats.BallWon.TackleWon,
        blocks: stats.Defensive.Blocks,
        interceptions: stats.BallWon.InterceptionWon,
      },
      duels: {
        total: stats.BallWon.Total + stats.BallLost.Total,
        won: stats.BallWon.Total,
      },
      dribbles: {
        attempts: stats.Dribble.Total,
        success: stats.Dribble.Success,
        past: stats.Dribble.Success,
      },
      fouls: {
        drawn: stats.Fouls.Awarded,
        committed: stats.Fouls.Committed,
      },
      cards: {
        yellow: stats.Cards.Yellow,
        yellowred: stats.Cards.SecondYellow,
        red: stats.Cards.Red,
      },
    };
  }

  //==============================================
}

