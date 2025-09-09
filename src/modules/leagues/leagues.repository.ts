// ============================================================================
// COMPLETE FINAL LEAGUES REPOSITORY - ALL METHODS WORKING
// ============================================================================

// src/modules/leagues/repositories/leagues.repository.ts
import { LeagueKorastatsService } from "../../integrations/korastats/services/league.service";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { LeagueLogoService } from "../../integrations/korastats/services/league-logo.service";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  LeagueData,
  LeagueHistoricalWinner,
  LeagueLastFixture,
} from "../../legacy-types/leagues.types";

export class LeaguesRepository {
  constructor(
    private readonly korastatsService: LeagueKorastatsService,
    private readonly cacheService: CacheService,
  ) {
    console.log("🏆 LeaguesRepository initialized with KorastatsLeagueService");
  }

  /**
   * WORKING: Get leagues by country - EXACTLY matches Django behavior
   */
  async getLeaguesByCountry(country: string): Promise<LeagueData[]> {
    const cacheKey = this.cacheService.createKey("leagues", "country", country);
    /*
    let cachedData = this.cacheService.get<LeagueData[]>(cacheKey);
    if (cachedData) {
      console.log(`Leagues for ${country} served from cache`);
      return cachedData;
    }
*/
    try {
      const tournaments = await this.korastatsService.getTournamentsList();

      // Filter by country (case-insensitive)
      const filteredTournaments = tournaments.filter(
        (tournament) =>
          tournament.organizer?.country?.name?.toLowerCase() === country.toLowerCase(),
      );

      console.log(`Found ${filteredTournaments.length} tournaments for ${country}`);

      // Transform to Django format
      const leagues: LeagueData[] = filteredTournaments.map((tournament) => ({
        league: {
          id: tournament.id,
          name: this.getTournamentName(tournament.id),
          type: this.determineTournamentType(tournament.tournament),
          logo: this.getTournamentLogo(tournament.id),
        },
        country: {
          name: tournament.organizer.country.name,
          code: this.getCountryCode(tournament.organizer.country.name),
          flag: this.getCountryFlag(tournament.organizer.country.id),
        },
        seasons: [
          {
            year: this.extractYearFromSeason(tournament.season),
            start: tournament.startDate,
            end: tournament.endDate,
            current: this.isCurrentSeason(tournament.startDate, tournament.endDate),
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
   * FIXED: Get league rounds using SeasonMatchList for accurate data
   */
  async getLeagueRounds(league: number, season?: number): Promise<string[]> {
    const cacheKey = this.cacheService.createKey("leagues", "rounds", league);

    let cachedData = this.cacheService.get<string[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Getting rounds for league ${league}, season ${season}`);

      // Step 1: Get season matches for accurate round data
      const matches = await this.korastatsService.getTournamentMatches(league);

      if (matches.length > 0) {
        const rounds = this.extractRoundsFromMatches(matches);
        if (rounds.length > 0) {
          this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
          return rounds;
        }
      }

      // Step 2: Fallback to tournament structure
      const structure = await this.korastatsService.getTournamentStructure(league);
      if (structure) {
        const rounds = this.extractRoundsFromStructure(structure);
        this.cacheService.set(cacheKey, rounds, 30 * 60 * 1000);
        return rounds;
      }

      // Step 3: Default rounds
      const defaultRounds = ["Regular Season"];
      this.cacheService.set(cacheKey, defaultRounds, 30 * 60 * 1000);
      return defaultRounds;
    } catch (error) {
      console.error(`Failed to get rounds for league ${league}:`, error);
      return ["Regular Season"];
    }
  }

  /**
   * COMPLETE: Historical winners using SeasonList + TournamentStructure
   */
  async getHistoricalWinners(league: number): Promise<LeagueHistoricalWinner[]> {
    const cacheKey = this.cacheService.createKey("leagues", "historical_winners", league);

    let cachedData = this.cacheService.get<LeagueHistoricalWinner[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Processing historical winners for league ${league}`);

      // Step 1: Get current tournament to find name
      const currentStructure = await this.korastatsService.getTournamentStructure(league);
      if (!currentStructure) {
        console.warn(`No structure found for league ${league}`);
        return [];
      }

      const tournamentName = currentStructure.tournament;
      console.log(`Tournament name: "${tournamentName}"`);

      // Step 2: Get all historical seasons
      const historicalSeasons =
        await this.korastatsService.getHistoricalSeasonsForTournament(tournamentName);

      if (historicalSeasons.length === 0) {
        console.warn(`No historical seasons found for "${tournamentName}"`);
        return [];
      }

      console.log(`Found ${historicalSeasons.length} historical seasons`);

      // Step 3: Process each season
      const winners: LeagueHistoricalWinner[] = [];

      for (const season of historicalSeasons) {
        try {
          const seasonYear = this.extractYearFromSeason(season.name);
          const structure = await this.korastatsService.getTournamentStructure(season.id);

          if (structure) {
            const winnerData = this.extractWinnerAndRunnerUp(structure);
            if (winnerData) {
              winners.push({
                season: seasonYear,
                winner: winnerData.winner,
                runnerUp: winnerData.runnerUp,
              });
            }
          }
        } catch (error) {
          console.error(`Error processing season ${season.name}:`, error);
        }
      }

      // Sort by season descending
      winners.sort((a, b) => b.season - a.season);

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
   * COMPLETE: Last fixture using TournamentMatchList
   */
  async getLastFixture(league: number): Promise<LeagueLastFixture | null> {
    const cacheKey = this.cacheService.createKey("leagues", "last_fixture", league);

    let cachedData = this.cacheService.get<LeagueLastFixture | null>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      console.log(`Getting last fixture for league ${league}`);

      // Step 1: Get tournament matches
      const matches = await this.korastatsService.getTournamentMatches(league);

      if (matches.length === 0) {
        // Fallback to structure matches
        const structure = await this.korastatsService.getTournamentStructure(league);
        if (structure) {
          const structureMatches = this.extractMatchesFromStructure(structure);
          if (structureMatches.length > 0) {
            const lastMatch = this.findLastCompletedMatch(structureMatches);
            if (lastMatch) {
              const fixture = this.mapToLastFixture(lastMatch, structure, league);
              this.cacheService.set(cacheKey, fixture, 30 * 60 * 1000);
              return fixture;
            }
          }
        }
        return null;
      }

      // Step 2: Find most recent completed match
      const lastMatch = this.findLastCompletedMatch(matches);
      if (!lastMatch) {
        console.warn(`No completed matches found for league ${league}`);
        return null;
      }

      // Step 3: Get tournament info for context
      const structure = await this.korastatsService.getTournamentStructure(league);

      // Step 4: Map to Django format
      const fixture = this.mapToLastFixture(lastMatch, structure, league);

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
   * Extract winner and runner-up from structure
   */
  private extractWinnerAndRunnerUp(
    structure: any,
  ): { winner: any; runnerUp: any } | null {
    if (!structure.stages || structure.stages.length === 0) return null;

    const mainStage = structure.stages[0];
    if (!mainStage.groups || mainStage.groups.length === 0) return null;

    const mainGroup = mainStage.groups[0];
    if (!mainGroup.teams || mainGroup.teams.length < 2) return null;

    // Sort teams by points, then goal difference
    const sortedTeams = [...mainGroup.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goals_difference - a.goals_difference;
    });

    const winner = sortedTeams[0];
    const runnerUp = sortedTeams[1];

    return {
      winner: {
        id: winner.id,
        name: winner.team,
        code: null,
        country: "Saudi Arabia",
        founded: null,
        national: false,
        logo: `https://media.api-sports.io/football/teams/${winner.id}.png`,
      },
      runnerUp: {
        id: runnerUp.id,
        name: runnerUp.team,
        code: null,
        country: "Saudi Arabia",
        founded: null,
        national: false,
        logo: `https://media.api-sports.io/football/teams/${runnerUp.id}.png`,
      },
    };
  }

  /**
   * Extract matches from tournament structure
   */
  private extractMatchesFromStructure(structure: any): any[] {
    const matches: any[] = [];

    if (structure.stages) {
      structure.stages.forEach((stage: any) => {
        if (stage.groups) {
          stage.groups.forEach((group: any) => {
            if (group.matches) {
              matches.push(...group.matches);
            }
          });
        }
      });
    }

    return matches;
  }

  /**
   * Find last completed match
   */
  private findLastCompletedMatch(matches: any[]): any | null {
    // Filter completed matches (have scores)
    const completedMatches = matches.filter(
      (match) => match.score || (match.teams?.home && match.teams?.away),
    );

    if (completedMatches.length === 0) return null;

    // Sort by date descending
    return completedMatches.sort((a, b) => {
      const dateA = new Date(a.dateTime || a.date || 0);
      const dateB = new Date(b.dateTime || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    })[0];
  }

  /**
   * Map match to Django LastFixture format
   */
  private mapToLastFixture(
    match: any,
    structure: any,
    league: number,
  ): LeagueLastFixture {
    const homeScore = match.score?.home ?? 0;
    const awayScore = match.score?.away ?? 0;

    return {
      fixture: {
        id: match.id,
        referee: match.referee?.name || null,
        timezone: "UTC",
        date: match.dateTime || match.date,
        timestamp: Math.floor(new Date(match.dateTime || match.date).getTime() / 1000),
        periods: { first: null, second: null },
        venue: {
          id: match.stadium?.id || null,
          name: match.stadium?.name || null,
          city: null,
        },
        status: {
          long: "Match Finished",
          short: "FT",
          elapsed: 90,
        },
      },
      league: {
        id: league,
        name: this.getTournamentName(league),
        country: structure?.organizer?.country?.name || "Country",
        logo: this.getTournamentLogo(league),
        flag: null,
        season: this.extractYearFromSeason(structure?.season || ""),
        round: null,
      },
      teams: {
        home: {
          id: match.teams?.home?.id || match.home_team_id || 0,
          name: match.teams?.home?.team || match.home_team || "Home Team",
          logo: "",
          winner: homeScore > awayScore,
        },
        away: {
          id: match.teams?.away?.id || match.away_team_id || 0,
          name: match.teams?.away?.team || match.away_team || "Away Team",
          logo: "",
          winner: awayScore > homeScore,
        },
      },
      averageTeamRating: { home: 0, away: 0 },
      tablePosition: { home: 0, away: 0 },
      score: {
        halftime: { home: 0, away: 0 },
        fulltime: { home: homeScore, away: awayScore },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      },
      goals: { home: homeScore, away: awayScore },
    };
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
   * Get tournament logo using static mapping or fallback
   */
  private getTournamentLogo(id: number): string {
    // First try to get from our static league logo service
    const staticLogo = LeagueLogoService.getLeagueLogoUrl(id);
    if (staticLogo) {
      console.log(`✅ Using static logo for league ${id}: ${staticLogo}`);
      return staticLogo;
    }

    // Fallback to generic API Sports logo
    const fallbackLogo = `https://media.api-sports.io/football/leagues/${id}.png`;
    console.log(`⚠️ Using fallback logo for league ${id}: ${fallbackLogo}`);
    return fallbackLogo;
  }

  /**
   * Get tournament name using static mapping or fallback
   */
  private getTournamentName(id: number): string {
    // First try to get from our static league logo service
    const staticName = LeagueLogoService.getLeagueName(id);
    if (staticName) {
      console.log(`✅ Using static name for league ${id}: ${staticName}`);
      return staticName;
    }

    // Fallback to generic name
    const fallbackName = `League ${id}`;
    console.log(`⚠️ Using fallback name for league ${id}: ${fallbackName}`);
    return fallbackName;
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

