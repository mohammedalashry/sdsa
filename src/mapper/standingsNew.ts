// src/mapper/standingsNew.ts
// Mapper for KoraStats TournamentGroupStandings to MongoDB schema

import { StandingsInterface } from "@/db/mogodb/schemas/standings.schema";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import {
  KorastatsTournament,
  KorastatsStandingsData,
} from "@/integrations/korastats/types";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";

export class StandingsNew {
  private readonly korastatsService: KorastatsService;
  constructor() {
    this.korastatsService = new KorastatsService();
  }
  /**
   * Map KoraStats TournamentGroupStandings data to MongoDB Standings schema
   */
  async mapToStandings(
    tournament: KorastatsTournament,
    standingsData: KorastatsStandingsData,
  ): Promise<StandingsInterface> {
    // Extract standings from the first stage and group
    const stage = standingsData.stages?.[0];
    const group = stage?.groups?.[0];
    const teamsData = group?.standings || [];
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournament.id);
    // Transform teams data to standings entries
    const standingsEntries = teamsData.map(async (team, index) => ({
      rank: team.rank, // Position in the table
      team: {
        id: team.teamID,
        name: team.team,
        logo: await this.korastatsService.getImageUrl("club", team.teamID),
      },
      points: team.points,
      goalsDiff: team.scored.total - team.conceded.total,
      group: group?.group || "Main",
      form: "",
      status: "same",
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
      korastats_id: leagueInfo?.id || 0,
      name: leagueInfo?.name || tournament.tournament,
      country: tournament.organizer?.country?.name || "Unknown",
      logo: leagueInfo?.logo || "",
      flag: "https://korastats.sirv.com/countries/160.svg",
      seasons: [
        {
          year: parseInt(tournament.season),
          standings: await Promise.all(standingsEntries),
        },
      ],
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

  /**
   * Get description based on position
   */
  private getDescription(rank: number): string {
    if (rank <= 3) return "Champion League Elite";
    return "Mid-table";
  }
  private getForm(rank: number): string {
    if (rank === 1) return "W";
    if (rank === 2) return "L";
    if (rank === 3) return "D";
    return "L";
  }
}

