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
  FixtureData,
  FixtureDataResponse,
} from "../../legacy-types";
import { MatchInterface } from "@/db/mogodb/schemas/match.schema";

export class LeaguesRepository {
  constructor(private readonly cacheService: CacheService) {
    console.log("🏆 LeaguesRepository initialized with MongoDB");
  }

  /**
   * Get leagues by country using MongoDB data
   */
  async getLeagues(): Promise<LeagueData[]> {
    const cacheKey = this.cacheService.createKey("leagues", "country");

    let cachedData = this.cacheService.get<LeagueData[]>(cacheKey);
    if (cachedData) {
      console.log(`Leagues served from cache`);
      return cachedData;
    }

    try {
      // Get tournaments from MongoDB
      const tournaments = await Models.League.find();

      console.log(`Found ${tournaments.length} tournaments`);

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
          code: this.getCountryCode("Saudi Arabia"),
          flag: this.getCountryFlag(tournament.country.id),
        },
        seasons: tournament.seasons.map((season) => ({
          year: season.year,
          start: season.start,
          end: season.end,
          current: season.current,
        })),
      }));

      // Cache for 1 hour
      this.cacheService.set(cacheKey, leagues, 60 * 60 * 1000);
      return leagues;
    } catch (error) {
      console.error(`Failed to fetch leagues:`, error);
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
      const tournament = await Models.League.findOne({
        korastats_id: league,
      });

      if (tournament) {
        // If a specific season year is provided and per-season rounds exist, return that
        if (season && Array.isArray(tournament.seasons)) {
          const seasonData = tournament.seasons.find((s: any) => s.year === season);
          if (
            seasonData &&
            Array.isArray((seasonData as any).rounds) &&
            (seasonData as any).rounds.length > 0
          ) {
            const rounds = (seasonData as any).rounds as string[];
            this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
            return rounds;
          }
        }

        // Fallback to league-level rounds union for backward compatibility
        if (
          Array.isArray((tournament as any).rounds) &&
          (tournament as any).rounds.length > 0
        ) {
          const rounds = (tournament as any).rounds as string[];
          this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
          return rounds;
        }
      }

      // Get matches from MongoDB for round data
      const matches = await Models.Match.find({
        tournament_id: league,
      }).limit(100);
      console.log(`Found ${matches.length} matches`);
      if (matches.length > 0) {
        const rounds = this.extractRoundsFromMatches(matches);
        if (rounds.length > 0) {
          this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
          console.log(`Found ${rounds.length} rounds`);
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
      const standings = await Models.Standings.findOne({
        korastats_id: league,
      })
        .sort({ "standings.rank": 1 })
        .limit(2);

      if (!standings) {
        console.warn(`No standings found for league ${league}`);
        return [];
      }

      // Get team details for winner and runner-up
      const [winnerTeam, runnerUpTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: standings.seasons[0].standings[0].team.id }),
        Models.Team.findOne({ korastats_id: standings.seasons[0].standings[1].team.id }),
      ]);

      if (!winnerTeam || !runnerUpTeam) {
        console.warn(`Could not find team details for league ${league}`);
        return [];
      }

      const winners: LeagueHistoricalWinner[] = [
        {
          season: this.extractYearFromSeason(standings.seasons[0].year.toString()),
          winner: {
            id: winnerTeam.korastats_id,
            name: winnerTeam.name,
            code: winnerTeam.code || null,
            country: winnerTeam.country,
            founded: winnerTeam.founded || null,
            national: winnerTeam.national || true,
            logo: winnerTeam.logo || "",
          },
          runnerUp: {
            id: runnerUpTeam.korastats_id,
            name: runnerUpTeam.name,
            code: runnerUpTeam.code || null,
            country: runnerUpTeam.country,
            founded: runnerUpTeam.founded || null,
            national: runnerUpTeam.national || true,
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
  async getLastFixture(league: number): Promise<FixtureDataResponse> {
    const cacheKey = this.cacheService.createKey("leagues", "last_fixture", league);

    let cachedData = this.cacheService.get<FixtureDataResponse | null>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Getting last fixture for league ${league}`);

      // Get tournament from MongoDB
      const tournament = await Models.League.findOne({
        korastats_id: league,
      });

      if (!tournament) {
        console.warn(`No tournament found for league ${league}`);
        return null;
      }

      // Get last completed match from MongoDB
      const lastMatch = await Models.Match.findOne({
        tournament_id: league,
        "fixture.status.short": { $in: ["FT", "AET", "PEN"] }, // Match finished statuses
      }).sort({ date: -1 });

      if (!lastMatch) {
        console.warn(`No completed matches found for league ${league}`);
        return null;
      }

      const fixture = [
        {
          fixture: lastMatch.fixture,
          league: lastMatch.league,
          teams: lastMatch.teams,
          goals: lastMatch.goals,
          score: lastMatch.score,
          tablePosition: lastMatch.tablePosition,
          averageTeamRating: lastMatch.averageTeamRating,
        },
      ];

      // Cache for 30 minutes
      this.cacheService.set(cacheKey, fixture, 30 * 60 * 1000);

      console.log(
        `Found last fixture: ${fixture[0].teams.home.name} vs ${fixture[0].teams.away.name}`,
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
  private extractRoundsFromMatches(matches: MatchInterface[]): string[] {
    const rounds = new Set<string>();

    matches.forEach((match) => {
      if (match.league.round) {
        rounds.add("Round " + match.league.round);
      }
    });

    const roundArray = Array.from(rounds).sort();
    return roundArray.length > 0 ? roundArray : [];
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

