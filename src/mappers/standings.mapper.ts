// src/integrations/korastats/mappers/standings.mapper.ts
import {
  StandingsResponse,
  StandingsLeague,
  StandingsEntry,
  StandingsTeam,
  StandingsStats,
  StandingsGoals,
} from "@/legacy-types/standings.types";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import { TeamKorastatsService } from "@/integrations/korastats/services/team.service";
import { KorastatsClient } from "@/integrations/korastats/client";

export class StandingsMapper {
  private static teamService: TeamKorastatsService;

  static {
    this.teamService = new TeamKorastatsService(new KorastatsClient());
  }

  /**
   * Map KoraStats tournament structure to Django standings format
   */
  static async mapToStandingsResponse(
    tournamentStructure: any,
    leagueId: number,
    season: number,
  ): Promise<StandingsResponse> {
    console.log(`StandingsMapper: Mapping standings for league ${leagueId}`);

    // Extract standings from the first stage and group
    const standings = await this.extractStandings(tournamentStructure);

    // Get league information
    const league = this.mapToStandingsLeague(leagueId, season, standings);

    return {
      league,
    };
  }

  /**
   * Extract and map standings from tournament structure
   */
  private static async extractStandings(
    tournamentStructure: any,
  ): Promise<StandingsEntry[][]> {
    console.log("StandingsMapper: Examining tournament structure...");
    console.log(
      "Tournament structure stages:",
      JSON.stringify(tournamentStructure, null, 2),
    );

    if (!tournamentStructure?.stages || tournamentStructure.stages.length === 0) {
      console.warn("No stages found in tournament structure");
      return [];
    }

    const mainStage = tournamentStructure.stages[0];
    console.log("Main stage:", JSON.stringify(tournamentStructure, null, 2));

    if (!mainStage?.groups || mainStage.groups.length === 0) {
      console.warn("No groups found in main stage");
      return [];
    }

    const mainGroup = mainStage.groups[0];
    console.log("Main group:", JSON.stringify(mainGroup, null, 2));

    // Check for both 'standings' and 'teams' arrays
    let standingsData = mainGroup?.standings || mainGroup?.teams;

    if (!standingsData || standingsData.length === 0) {
      console.warn("No standings/teams found in main group");
      console.log("Available keys in main group:", Object.keys(mainGroup));
      return [];
    }

    console.log(`Found ${standingsData.length} teams in standings/teams`);

    // Get team logos for all teams
    const teamIds = standingsData.map((standing: any) => standing.teamID || standing.id);
    const teamLogosMap = await this.teamService.getTeamLogos(teamIds);

    // Map standings to Django format
    const standingsEntries: StandingsEntry[] = standingsData.map((standing: any) =>
      this.mapToStandingsEntry(standing, teamLogosMap),
    );

    // Return as array of arrays (one group)
    return [standingsEntries];
  }

  /**
   * Map individual standing entry
   */
  private static mapToStandingsEntry(
    standing: any,
    teamLogosMap: Map<number, string>,
  ): StandingsEntry {
    console.log("Mapping standing entry:", JSON.stringify(standing, null, 2));

    // Handle both 'standings' and 'teams' data structures
    const teamId = standing.teamID || standing.id;
    const teamName = standing.team || standing.name || "Unknown Team";
    const rank = standing.rank || 0;
    const points = standing.points || 0;

    // Goals handling for different structures
    const goalsFor = standing.scored?.total || standing.goals_scored || 0;
    const goalsAgainst = standing.conceded?.total || standing.goals_conceded || 0;
    const goalsDiff = standing.goals_difference || goalsFor - goalsAgainst;

    return {
      rank,
      team: {
        id: teamId,
        name: teamName,
        logo: teamLogosMap.get(teamId) || "",
      },
      points,
      goalsDiff,
      group: "Saudi League",
      form: this.generateForm(standing), // We'll generate a simple form
      status: "same", // Default status
      description: this.getDescription(rank),
      all: this.mapToStandingsStats(standing, "total"),
      home: this.mapToStandingsStats(standing, "home"),
      away: this.mapToStandingsStats(standing, "away"),
      update: new Date().toISOString(),
    };
  }

  /**
   * Map standing stats for all/home/away
   */
  private static mapToStandingsStats(
    standing: any,
    type: "total" | "home" | "away",
  ): StandingsStats {
    // Handle different data structures
    let played, won, draw, lost, scored, conceded;

    if (type === "total") {
      // For 'teams' structure (from TournamentStructure)
      played = standing.played || standing.won + standing.draw + standing.lost || 0;
      won = standing.won || 0;
      draw = standing.draw || 0;
      lost = standing.lost || 0;
      scored = standing.goals_scored || 0;
      conceded = standing.goals_conceded || 0;
    } else {
      // For 'standings' structure (from TournamentGroupStandings)
      played = standing.played?.[type] || 0;
      won = standing.won?.[type] || 0;
      draw = standing.draw?.[type] || 0;
      lost = standing.lost?.[type] || 0;
      scored = standing.scored?.[type] || 0;
      conceded = standing.conceded?.[type] || 0;
    }

    return {
      played,
      win: won,
      draw,
      lose: lost,
      goals: {
        for_: scored,
        against: conceded,
      },
    };
  }

  /**
   * Map to standings league
   */
  private static mapToStandingsLeague(
    leagueId: number,
    season: number,
    standings: StandingsEntry[][],
  ): StandingsLeague {
    const leagueName = LeagueLogoService.getLeagueName(leagueId) || `League ${leagueId}`;
    const leagueLogo = LeagueLogoService.getLeagueLogoUrl(leagueId) || "";

    return {
      id: leagueId,
      name: leagueName,
      country: "Saudi-Arabia",
      logo: leagueLogo,
      flag: "https://media.api-sports.io/flags/sa.svg",
      season,
      standings,
    };
  }

  /**
   * Generate form string (simplified)
   */
  private static generateForm(standing: any): string {
    // This is a simplified form generation
    // In a real implementation, you'd look at recent matches
    const winRate = standing.won?.total / standing.played?.total || 0;
    if (winRate > 0.7) return "W";
    if (winRate > 0.4) return "D";
    return "L";
  }

  /**
   * Get description based on rank
   */
  private static getDescription(rank: number): string {
    if (rank <= 1) return "Champions League Elite";
    if (rank <= 3) return "Champions League";
    if (rank <= 5) return "Europa League";
    if (rank >= 16) return "Relegation";
    return "Mid Table";
  }
}

