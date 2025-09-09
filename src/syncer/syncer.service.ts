// src/syncer/syncer.service.ts
// Main syncer service that orchestrates data collection from KoraStats to MongoDB
// Based on Excel sheet requirements and architecture

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { DataCollectorService } from "../mappers/data-collector.service";
import { Models } from "../db/mogodb/models";
import { KorastatsMongoService } from "../db/mogodb/connection";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { ApiError } from "../core/middleware/error.middleware";

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
  private dataCollectorService: DataCollectorService;
  private mongoService: KorastatsMongoService;
  private cacheService: CacheService;
  private progress: SyncProgress;

  constructor() {
    this.korastatsService = new KorastatsService();
    this.dataCollectorService = new DataCollectorService();
    this.mongoService = new KorastatsMongoService();
    this.cacheService = new CacheService();
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

      // Step 7: Sync Matches/Fixtures
      if (options.syncMatches !== false) {
        await this.syncMatches(options);
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
          code: "SA",
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
          const stagesResponse = await this.korastatsService.getTournamentStructure(
            tournament.id,
          );
          try {
            const tournamentData = {
              korastats_id: tournament.id,
              name: tournament.tournament,
              season: tournament.season || new Date().getFullYear().toString(),
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
              gender: "male",
              structure: {
                stages: stagesResponse.data?.stages || [],
              },
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
      // Get teams from tournaments
      const tournaments = await Models.Tournament.find({ status: "active" });

      for (const tournament of tournaments) {
        try {
          const teamsResponse = await this.korastatsService.getTournamentTeamList(
            tournament.korastats_id,
            tournament.season,
          );

          if (teamsResponse.result === "Success" && teamsResponse.data) {
            for (const team of teamsResponse.data.teams) {
              try {
                // Get team stats
                const teamStatsResponse =
                  await this.korastatsService.getTournamentTeamStats(
                    tournament.korastats_id,
                    team.id,
                  );

                const teamData = {
                  korastats_id: team.id,
                  name: team.name,
                  short_name: team.short_name || team.name.substring(0, 3).toUpperCase(),
                  nickname: team.nickname || "",
                  country: {
                    id: team.country?.id || 0,
                    name: team.country?.name || "",
                  },
                  city: team.city || "",
                  stadium: team.stadium
                    ? {
                        id: team.stadium.id,
                        name: team.stadium.name,
                        capacity: team.stadium.capacity,
                        surface: team.stadium.surface,
                        city: team.stadium.city,
                      }
                    : undefined,
                  current_squad: [],
                  current_coach: undefined,
                  stats_summary: {
                    total_matches: 0,
                    total_wins: 0,
                    total_draws: 0,
                    total_losses: 0,
                    total_goals_for: 0,
                    total_goals_against: 0,
                  },
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
                    team_name: team.name,
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

                  await Models.TeamStats.findOneAndUpdate(
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
                          age: player.age || 25,
                          nationality: {
                            id: player.nationality?.id || 0,
                            name: player.nationality?.name || "",
                          },
                          height: player.height || null,
                          weight: player.weight || null,
                          preferred_foot: player.preferred_foot || "right",
                          positions: {
                            primary: {
                              id: player.position?.id || 0,
                              name: player.position?.name || "Unknown",
                              category: player.position?.category || "Unknown",
                            },
                            secondary: {
                              id: 0,
                              name: "Unknown",
                              category: "Unknown",
                            },
                          },

                          career_summary: [],
                          image_url: player.photo || "",
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
            tournament.season,
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
            tournament.season,
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
              await Models.Match.findOneAndUpdate(
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
}

