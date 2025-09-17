// src/mapper/standingsNew.ts
// Mapper for KoraStats TournamentGroupStandings to MongoDB schema

import { StandingsInterface } from "@/db/mogodb/schemas/standings.schema";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import {
  KorastatsTournament,
  KorastatsStandingsData,
} from "@/integrations/korastats/types";

export class StandingsNew {
  /**
   * Map KoraStats TournamentGroupStandings data to MongoDB Standings schema
   */
  mapToStandings(
    tournament: KorastatsTournament,
    standingsData: KorastatsStandingsData,
  ): StandingsInterface {
    // Extract standings from the first stage and group
    const stage = standingsData.stages?.[0];
    const group = stage?.groups?.[0];
    const teamsData = group?.standings || [];
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournament.id);
    // Transform teams data to standings entries
    const standingsEntries = teamsData.map((team, index) => ({
      rank: team.rank, // Position in the table
      team: {
        id: team.teamID,
        name: team.team,
        logo: leagueInfo.logo,
      },
      points: team.points,
      goalsDiff: team.scored.total - team.conceded.total,
      group: group?.group || "Main",
      form: this.getForm(team.rank),
      status: this.getStatus(team.rank),
      description: this.getDescription(team.rank),
      all: {
        played: team.played.total,
        win: team.won.total,
        draw: team.draw.total,
        lose: team.lost.total,
        goals: {
          for_: team.scored.total,
          against: team.conceded.total,
        },
      },
      home: {
        played: team.played.home,
        win: team.won.home,
        draw: team.draw.home,
        lose: team.lost.home,
        goals: {
          for_: team.scored.home,
          against: team.conceded.home,
        },
      },
      away: {
        played: team.played.away,
        win: team.won.away,
        draw: team.draw.away,
        lose: team.lost.away,
        goals: {
          for_: team.scored.away,
          against: team.conceded.away,
        },
      },
      update: new Date().toISOString(),
    }));

    return {
      korastats_id: tournament.id,
      name: tournament.tournament,
      country: tournament.organizer?.country?.name || "Unknown",
      logo: leagueInfo.logo, // Will be populated by league sync
      flag: "https://korastats.sirv.com/countries/160.svg",
      season: this.extractSeason(tournament.season),
      standings: standingsEntries,
      last_synced: new Date(),
      sync_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Extract numeric season from season string
   */
  private extractSeason(seasonStr: string): number {
    // Handle formats like "2024/25", "2024-25", "2024"
    const match = seasonStr.match(/(\d{4})/);
    return match ? parseInt(match[1]) : new Date().getFullYear();
  }

  /**
   * Get status based on position (Champions League, Europa League, Relegation, etc.)
   */
  private getStatus(rank: number): string {
    if (rank <= 2) return "Champions League";
    if (rank <= 4) return "Europa League";
    if (rank <= 6) return "Conference League";
    if (rank >= 18) return "Relegation";
    return "None";
  }

  /**
   * Get description based on position
   */
  private getDescription(rank: number): string {
    if (rank === 1) return "Champion";
    if (rank <= 2) return "Champions League";
    if (rank <= 4) return "Europa League";
    if (rank <= 6) return "Conference League";
    if (rank >= 18) return "Relegation to lower division";
    return "Mid-table";
  }
  private getForm(rank: number): string {
    if (rank === 1) return "W";
    if (rank === 2) return "L";
    if (rank === 3) return "D";
    return "L";
  }
}

