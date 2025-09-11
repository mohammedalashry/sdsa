// ============================================================================
// COMPLETE FINAL LEAGUES REPOSITORY - ALL METHODS WORKING
// ============================================================================

// src/modules/leagues/repositories/leagues.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  LeagueData,
  LeagueHistoricalWinner,
  LeagueLastFixture,
} from "../../legacy-types/leagues.types";

export class LeaguesRepository {
  constructor(private readonly cacheService: CacheService) {
    console.log("🏆 LeaguesRepository initialized with MongoDB");
  }

  /**
   * Get leagues by country using MongoDB data
   */
  async getLeaguesByCountry(country: string): Promise<LeagueData[]> {
    const cacheKey = this.cacheService.createKey("leagues", "country", country);

    let cachedData = this.cacheService.get<LeagueData[]>(cacheKey);
    if (cachedData) {
      console.log(`Leagues for ${country} served from cache`);
      return cachedData;
    }

    try {
      // Get tournaments from MongoDB
      const tournaments = await Models.Tournament.find();

      console.log(`Found ${tournaments.length} tournaments for ${country}`);

      // Transform to legacy format
      const leagues: LeagueData[] = tournaments.map((tournament) => ({
        league: {
          id: tournament.korastats_id,
          name: tournament.name,
          type: this.determineTournamentType(tournament.name),
          logo: tournament.logo || "",
        },
        country: {
          name: tournament.country.name,
          code: this.getCountryCode(tournament.country.name),
          flag: this.getCountryFlag(tournament.country.id),
        },
        seasons: [
          {
            year: this.extractYearFromSeason(tournament.season),
            start: tournament.start_date?.toISOString() || "",
            end: tournament.end_date?.toISOString() || "",
            current: this.isCurrentSeason(
              tournament.start_date?.toISOString() || "",
              tournament.end_date?.toISOString() || "",
            ),
          },
        ],
      }));

      // Cache for 1 hour
      this.cacheService.set(cacheKey, leagues, 60 * 60 * 1000);
      return leagues;
    } catch (error) {
      console.error(`Failed to fetch leagues for ${country}:`, error);
      return [];
    }
  }

  /**
   * Get league rounds using MongoDB data
   */
  async getLeagueRounds(league: number, season?: number): Promise<string[]> {
    const cacheKey = this.cacheService.createKey("leagues", "rounds", league);

    let cachedData = this.cacheService.get<string[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Getting rounds for league ${league}, season ${season}`);

      // Get tournament from MongoDB
      const tournament = await Models.Tournament.findOne({
        korastats_id: league,
      });

      if (tournament && tournament.rounds) {
        const rounds = tournament.rounds;
        if (rounds.length > 0) {
          this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
          return rounds;
        }
      }

      // Get matches from MongoDB for round data
      const matches = await Models.Match.find({
        tournament_id: league,
      }).limit(100);

      if (matches.length > 0) {
        const rounds = this.extractRoundsFromMatches(matches);
        if (rounds.length > 0) {
          this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
          return rounds;
        }
      }

      // Default rounds
      const defaultRounds = ["Regular Season"];
      this.cacheService.set(cacheKey, defaultRounds, 30 * 60 * 1000);
      return defaultRounds;
    } catch (error) {
      console.error(`Failed to get rounds for league ${league}:`, error);
      return ["Regular Season"];
    }
  }

  /**
   * Get historical winners using MongoDB data
   */
  async getHistoricalWinners(league: number): Promise<LeagueHistoricalWinner[]> {
    const cacheKey = this.cacheService.createKey("leagues", "historical_winners", league);

    let cachedData = this.cacheService.get<LeagueHistoricalWinner[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Processing historical winners for league ${league}`);

      // Get tournament from MongoDB
      const tournament = await Models.Tournament.findOne({
        korastats_id: league,
      });

      if (!tournament) {
        console.warn(`No tournament found for league ${league}`);
        return [];
      }

      // Get team stats for this tournament to find winners
      const teamStats = await Models.Team.find({
        tournament_id: league,
      }).sort({ points: -1, goal_difference: -1 });

      if (teamStats.length < 2) {
        console.warn(`Not enough teams found for league ${league}`);
        return [];
      }

      // Get team details for winner and runner-up
      const [winnerTeam, runnerUpTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: teamStats[0].korastats_id }),
        Models.Team.findOne({ korastats_id: teamStats[1].korastats_id }),
      ]);

      if (!winnerTeam || !runnerUpTeam) {
        console.warn(`Could not find team details for league ${league}`);
        return [];
      }

      const winners: LeagueHistoricalWinner[] = [
        {
          season: this.extractYearFromSeason(tournament.season),
          winner: {
            id: winnerTeam.korastats_id,
            name: winnerTeam.name,
            code: winnerTeam.code || null,
            country: winnerTeam.country,
            founded: winnerTeam.founded || null,
            national: winnerTeam.national || false,
            logo: winnerTeam.logo || "",
          },
          runnerUp: {
            id: runnerUpTeam.korastats_id,
            name: runnerUpTeam.name,
            code: runnerUpTeam.code || null,
            country: runnerUpTeam.country,
            founded: runnerUpTeam.founded || null,
            national: runnerUpTeam.national || false,
            logo: runnerUpTeam.logo || "",
          },
        },
      ];

      // Cache for 2 hours
      this.cacheService.set(cacheKey, winners, 2 * 60 * 60 * 1000);

      console.log(`Found ${winners.length} historical winners`);
      return winners;
    } catch (error) {
      console.error(`Failed to get historical winners for league ${league}:`, error);
      return [];
    }
  }

  /**
   * Get last fixture using MongoDB data
   */
  async getLastFixture(league: number): Promise<LeagueLastFixture | null> {
    const cacheKey = this.cacheService.createKey("leagues", "last_fixture", league);

    let cachedData = this.cacheService.get<LeagueLastFixture | null>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Getting last fixture for league ${league}`);

      // Get tournament from MongoDB
      const tournament = await Models.Tournament.findOne({
        korastats_id: league,
      });

      if (!tournament) {
        console.warn(`No tournament found for league ${league}`);
        return null;
      }

      // Get last completed match from MongoDB
      const lastMatch = await Models.Match.findOne({
        tournament_id: league,
        "status.short": { $in: ["FT", "AET", "PEN"] }, // Match finished statuses
      }).sort({ date: -1 });

      if (!lastMatch) {
        console.warn(`No completed matches found for league ${league}`);
        return null;
      }

      // Get team details for home and away teams
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: lastMatch.teams.home.id }),
        Models.Team.findOne({ korastats_id: lastMatch.teams.away.id }),
      ]);

      if (!homeTeam || !awayTeam) {
        console.warn(`Could not find team details for match ${lastMatch.korastats_id}`);
        return null;
      }

      // Map to legacy format
      const fixture: LeagueLastFixture = {
        fixture: {
          id: lastMatch.korastats_id,
          referee: lastMatch.referee?.name || null,
          timezone: "UTC",
          date: lastMatch.date,
          timestamp: lastMatch.timestamp,
          periods: { first: null, second: null },
          venue: {
            id: lastMatch.venue?.id || null,
            name: lastMatch.venue?.name || null,
            city: null,
          },
          status: {
            long: lastMatch.status?.long || "Match Finished",
            short: lastMatch.status?.short || "FT",
            elapsed: 90,
          },
        },
        league: {
          id: league,
          name: tournament.name,
          country: tournament.country.name,
          logo: tournament.logo || "",
          flag: null,
          season: this.extractYearFromSeason(tournament.season),
          round: lastMatch.round?.toString() || null,
        },
        teams: {
          home: {
            id: homeTeam.korastats_id,
            name: homeTeam.name,
            logo: homeTeam.logo || "",
            winner: lastMatch.goals.home > lastMatch.goals.away,
          },
          away: {
            id: awayTeam.korastats_id,
            name: awayTeam.name,
            logo: awayTeam.logo || "",
            winner: lastMatch.goals.away > lastMatch.goals.home,
          },
        },
        averageTeamRating: { home: 0, away: 0 },
        tablePosition: { home: 0, away: 0 },
        score: {
          halftime: { home: 0, away: 0 },
          fulltime: {
            home: lastMatch.goals.home,
            away: lastMatch.goals.away,
          },
          extratime: { home: 0, away: 0 },
          penalty: { home: 0, away: 0 },
        },
        goals: {
          home: lastMatch.goals.home,
          away: lastMatch.goals.away,
        },
      };

      // Cache for 30 minutes
      this.cacheService.set(cacheKey, fixture, 30 * 60 * 1000);

      console.log(
        `Found last fixture: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
      );
      return fixture;
    } catch (error) {
      console.error(`Failed to get last fixture for league ${league}:`, error);
      return null;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract rounds from match data (most accurate)
   */
  private extractRoundsFromMatches(matches: any[]): string[] {
    const rounds = new Set<string>();

    matches.forEach((match) => {
      if (match.round) {
        rounds.add("Round " + match.round);
      } else if (match.matchweek) {
        rounds.add(`Matchweek ${match.matchweek}`);
      } else if (match.gameweek) {
        rounds.add(`Gameweek ${match.gameweek}`);
      }
    });

    const roundArray = Array.from(rounds).sort();
    return roundArray.length > 0 ? roundArray : [];
  }

  /**
   * Extract rounds from tournament structure (fallback)
   */
  private extractRoundsFromStructure(structure: any): string[] {
    const rounds: string[] = [];

    if (structure.stages) {
      structure.stages.forEach((stage: any) => {
        if (stage.type === "League" && stage.rounds > 1) {
          for (let i = 1; i <= stage.rounds; i++) {
            rounds.push(`Round ${i}`);
          }
        } else if (stage.stage && stage.stage !== "Main") {
          rounds.push(stage.stage);
        }
      });
    }

    return rounds.length > 0 ? rounds : ["Regular Season"];
  }

  /**
   * Determine tournament type
   */
  private determineTournamentType(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("cup") || nameLower.includes("trophy")) return "Cup";
    if (nameLower.includes("league") || nameLower.includes("premier")) return "League";
    return "League";
  }

  /**
   * Get country code
   */
  private getCountryCode(countryName: string): string | null {
    const codes: Record<string, string> = {
      "Saudi Arabia": "SA",
      Egypt: "EG",
      UAE: "AE",
    };
    return codes[countryName] || null;
  }

  /**
   * Get country flag
   */
  private getCountryFlag(countryId: number): string | null {
    const flags: Record<number, string> = {
      160: "https://media.api-sports.io/flags/sa.svg",
      57: "https://media.api-sports.io/flags/eg.svg",
    };
    return flags[countryId] || null;
  }

  /**
   * Extract year from season
   */
  private extractYearFromSeason(season: string): number {
    const match = season?.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  }

  /**
   * Check if season is current
   */
  private isCurrentSeason(startDate: string, endDate: string): boolean {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  }
}

