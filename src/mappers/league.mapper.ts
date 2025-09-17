// src/integrations/korastats/mappers/league.mapper.ts
import {
  LeagueData,
  LeagueSeason,
  LeagueHistoricalWinner,
} from "../legacy-types/leagues.types";
import {
  KorastatsTournament,
  KorastatsTournamentStructure,
  KorastatsTeamInStructure,
  KorastatsMatchInStructure,
  KorastatsStanding,
  //  KorastatsMatchListItem,
  KorastatsSeason,
} from "../integrations/korastats/types/league.types";
import { Team } from "../legacy-types/teams.types";
import { LeagueLogoService } from "../integrations/korastats/services/league-logo.service";

export class LeagueMapper {
  /**
   * Map Korastats Tournament to Django LeagueData
   * Using REAL tournament structure from your data
   */
  static toLeagueData(korastatsTournament: KorastatsTournament): LeagueData {
    const country = korastatsTournament.organizer.country;
    const season = this.parseSeasonFromTournament(korastatsTournament);

    return {
      league: {
        id: korastatsTournament.id,
        name: this.getTournamentName(korastatsTournament.id),
        type: this.determineTournamentType(korastatsTournament), // Smart logic
        logo: this.getTournamentLogo(korastatsTournament.id),
      },
      country: {
        name: country.name,
        code: this.getCountryCode(country.name),
        flag: this.getCountryFlag(country.id),
      },
      seasons: [season],
    };
  }

  /**
   * Convert multiple tournaments to LeagueData array
   */
  static toLeagueDataArray(tournaments: KorastatsTournament[]): LeagueData[] {
    console.log(`LeagueMapper: Transforming ${tournaments.length} tournaments`);

    const leagues = tournaments.map((tournament, index) => {
      console.log(`LeagueMapper: Processing tournament ${index + 1}:`, {
        id: tournament.id,
        name: tournament.tournament,
        country: tournament.organizer?.country?.name,
      });

      try {
        const leagueData = this.toLeagueData(tournament);
        console.log(`✓ Successfully mapped tournament ${tournament.id}`);
        return leagueData;
      } catch (error) {
        console.error(`✗ Failed to map tournament ${tournament.id}:`, error);
        throw error;
      }
    });

    console.log(`LeagueMapper: Successfully transformed ${leagues.length} leagues`);
    return leagues;
  }

  /**
   * FIXED: Extract rounds from tournament structure
   * Analyzes matches to determine unique round names - preserves meaningful stage names
   */
  static extractRounds(structure: KorastatsTournamentStructure): string[] {
    console.log("LeagueMapper: Extracting rounds from tournament structure");

    if (!structure || !structure.stages || !Array.isArray(structure.stages)) {
      console.warn("No stages found in tournament structure");
      return [];
    }

    const rounds = new Set<string>();
    let allMatches: any[] = [];

    // First, check if we have meaningful stage names
    const meaningfulStageNames = this.extractMeaningfulStageNames(structure.stages);
    if (meaningfulStageNames.length > 0) {
      console.log("Using meaningful stage names:", meaningfulStageNames);
      return meaningfulStageNames;
    }

    // Collect all matches from all stages and groups
    structure.stages.forEach((stage) => {
      console.log(`Processing stage: ${stage.stage} (${stage.type})`);

      if (stage.groups && Array.isArray(stage.groups)) {
        stage.groups.forEach((group) => {
          if (group.matches && Array.isArray(group.matches)) {
            allMatches.push(...group.matches);
          }
        });
      }
    });

    console.log(`Found ${allMatches.length} total matches across all stages`);

    if (allMatches.length === 0) {
      console.warn("No matches found, using default rounds");
      return ["Regular Season"];
    }

    // Extract unique round names from matches
    allMatches.forEach((match) => {
      if (match.round && typeof match.round === "string") {
        rounds.add(match.round);
      }
    });

    const roundArray = Array.from(rounds).sort();
    console.log(`Extracted ${roundArray.length} unique rounds:`, roundArray);

    return roundArray.length > 0 ? roundArray : ["Regular Season"];
  }

  /**
   * Helper: Extract meaningful stage names that can serve as rounds
   */
  private static extractMeaningfulStageNames(stages: any[]): string[] {
    const meaningfulNames = stages
      .filter((stage) => {
        const name = stage.stage?.toLowerCase() || "";
        // Filter out generic names like "main", "group", etc.
        return !["main", "group", "stage", "round"].includes(name);
      })
      .map((stage) => stage.stage)
      .filter((name) => name && typeof name === "string");

    return meaningfulNames;
  }

  /**
   * FIXED: Determine winner and runner-up from real tournament data
   * Uses team standings from tournament structure (teams are already ranked)
   */
  static determineWinnerAndRunnerUp(
    structure: KorastatsTournamentStructure,
  ): { winner: Team; runnerUp: Team } | null {
    if (!structure.stages || structure.stages.length === 0) {
      console.warn("No stages found in tournament structure");
      return null;
    }

    const mainStage = structure.stages[0]; // Usually "Main" stage
    if (!mainStage.groups || mainStage.groups.length === 0) {
      console.warn("No groups found in main stage");
      return null;
    }

    const mainGroup = mainStage.groups[0]; // Usually "Main" group
    if (!mainGroup.teams || mainGroup.teams.length < 2) {
      console.warn(`Insufficient teams in main group: ${mainGroup.teams?.length || 0}`);
      return null;
    }

    // Teams are already sorted by points/position in Korastats response
    // But let's ensure proper sorting just in case
    const sortedTeams = [...mainGroup.teams].sort((a, b) => {
      // Sort by points desc, then by goal difference desc
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.goals_difference - a.goals_difference;
    });

    const winner = sortedTeams[0];
    const runnerUp = sortedTeams[1];

    console.log(`Winner: ${winner.team} (${winner.points} pts)`);
    console.log(`Runner-up: ${runnerUp.team} (${runnerUp.points} pts)`);

    return {
      winner: {
        id: winner.id,
        name: winner.team,
        code: "-",
        country: "Saudi Arabia", // From the organizer data
        founded: 0,
        national: false,
        logo: this.getTeamLogo(winner.id),
      },
      runnerUp: {
        id: runnerUp.id,
        name: runnerUp.team,
        code: "-",
        country: "Saudi Arabia",
        founded: 0,
        national: false,
        logo: this.getTeamLogo(runnerUp.id),
      },
    };
  }

  /**
   * FIXED: Process historical winners using real tournament structure data
   * Works with Season List data and Tournament Structure data
   */
  static async processHistoricalWinners(
    currentTournamentId: number,
    allSeasons: KorastatsSeason[],
    getStructureFn: (tournamentId: number) => Promise<KorastatsTournamentStructure | "-">,
  ): Promise<LeagueHistoricalWinner[]> {
    console.log(
      `Processing historical winners for tournament ${currentTournamentId} with ${allSeasons.length} seasons`,
    );

    const winners: LeagueHistoricalWinner[] = [];

    // Process each season
    for (const season of allSeasons) {
      try {
        const seasonYear = this.extractYearFromSeasonName(season.name);
        console.log(`Processing season ${season.name} (${seasonYear}), ID: ${season.id}`);

        // Get tournament structure which contains final standings
        const structure = await getStructureFn(season.id);

        if (structure) {
          const winnerData = this.determineWinnerAndRunnerUp(
            structure as KorastatsTournamentStructure,
          );

          if (winnerData) {
            winners.push({
              season: seasonYear,
              winner: winnerData.winner,
              runnerUp: winnerData.runnerUp,
            });

            console.log(
              `✓ Added winners for ${seasonYear}: ${winnerData.winner.name} vs ${winnerData.runnerUp.name}`,
            );
          } else {
            console.warn(`Could not determine winners for season ${season.name}`);
          }
        } else {
          console.warn(`No structure found for season ${season.name} (ID: ${season.id})`);
        }
      } catch (error) {
        console.error(`Error processing season ${season.name}:`, error);
      }
    }

    // Sort by season year descending (newest first)
    winners.sort((a, b) => b.season - a.season);

    console.log(`✓ Successfully processed ${winners.length} historical winners`);
    return winners;
  }

  /**
   * Helper: Extract year from season name like "2024/2025" -> 2024
   */
  static extractYearFromSeasonName(seasonName: string): number {
    const match = seasonName.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Helper: Parse season from tournament data
   */
  private static parseSeasonFromTournament(
    tournament: KorastatsTournament,
  ): LeagueSeason {
    const currentYear = new Date().getFullYear();
    const seasonYear = this.extractYearFromSeasonName(tournament.season);

    return {
      year: seasonYear || currentYear,
      start: tournament.startDate,
      end: tournament.endDate,
      current: seasonYear === currentYear,
    };
  }

  /**
   * Helper: Determine tournament type based on name and structure
   */
  private static determineTournamentType(tournament: KorastatsTournament): string {
    const name = tournament.tournament.toLowerCase();

    if (name.includes("cup") || name.includes("champions")) {
      return "Cup";
    }
    if (
      name.includes("league") ||
      name.includes("premier") ||
      name.includes("professional")
    ) {
      return "League";
    }

    return "League"; // Default
  }

  /**
   * Helper: Get tournament logo using static mapping or fallback
   */
  private static getTournamentLogo(leagueId: number): string {
    // First try to get from our static league logo service
    const staticLogo = LeagueLogoService.getLeagueLogoUrl(leagueId);
    if (staticLogo) {
      console.log(`✅ Using static logo for league ${leagueId}: ${staticLogo}`);
      return staticLogo;
    }

    // Fallback to generic API Sports logo
    const fallbackLogo = `https://media.api-sports.io/football/leagues/${leagueId}.png`;
    console.log(`⚠️ Using fallback logo for league ${leagueId}: ${fallbackLogo}`);
    return fallbackLogo;
  }

  /**
   * Helper: Get tournament name using static mapping or fallback
  /**
   * Helper: Get tournament name using static mapping or fallback
   */
  private static getTournamentName(leagueId: number): string {
    // First try to get from our static league logo service
    const staticName = LeagueLogoService.getLeagueName(leagueId);
    if (staticName) {
      console.log(`✅ Using static name for league ${leagueId}: ${staticName}`);
      return staticName;
    }

    // Fallback to generic API Sports name
    const fallbackName = `League ${leagueId}`;
    console.log(`⚠️ Using fallback name for league ${leagueId}: ${fallbackName}`);
    return fallbackName;
  }

  /**
   * Helper: Get team logo
   */
  private static getTeamLogo(teamId: number): string {
    // This could be enhanced with actual team logo mapping
    return `https://media.api-sports.io/football/teams/${teamId}.png`;
  }

  /**
   * Helper: Get country code from name
   */
  private static getCountryCode(countryName: string): string | "-" {
    const countryMap: Record<string, string> = {
      "Saudi Arabia": "SA",
      Egypt: "EG",
      UAE: "AE",
    };

    return countryMap[countryName] || "-";
  }

  /**
   * Helper: Get country flag URL
   */
  private static getCountryFlag(countryId: number): string | "-" {
    const flagMap: Record<number, string> = {
      160: "https://media.api-sports.io/flags/sa.svg", // Saudi Arabia
      57: "https://media.api-sports.io/flags/eg.svg", // Egypt
    };

    return flagMap[countryId] || "-";
  }
}

