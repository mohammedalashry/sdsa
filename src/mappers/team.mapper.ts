import { TeamData, Team, TeamVenue, TeamInfo } from "@/legacy-types/teams.types";
import { CoachData } from "@/legacy-types/players.types";
import { TransferData } from "@/legacy-types/transfers.types";
import {
  KorastatsTeamInfoResponse,
  KorastatsTournamentTeamStatsResponse,
  KorastatsEntityClubResponse,
  KorastatsTournamentTeamListResponse,
} from "@/integrations/korastats/types/team.types";

export class TeamMapper {
  static toTeamData(korastatsTeam: any): TeamData {
    // This method is used for fallback when MongoDB data is not available
    // It should handle the actual Korastats response structure
    return {
      team: {
        id: korastatsTeam.id || 0,
        name: korastatsTeam.name || "Unknown Team",
        code: korastatsTeam.short_name || "-",
        country: korastatsTeam.country?.name || "Unknown",
        founded: korastatsTeam.founded || null,
        national: korastatsTeam.is_national_team || false,
        logo: korastatsTeam.logo || "",
      },
      venue: {
        id: korastatsTeam.stadium?.id || null,
        name: korastatsTeam.stadium?.name || null,
        address: null,
        city: korastatsTeam.stadium?.city || null,
        capacity: korastatsTeam.stadium?.capacity || null,
        surface: korastatsTeam.stadium?.surface || null,
        image: null,
      },
    };
  }

  static toTeamInfo(
    basicInfo: any,
    squad: any = {},
    transfers: any[] = [],
    trophies: any[] = [],
  ): TeamInfo {
    const baseTeamData = this.toTeamData(basicInfo);

    return {
      ...baseTeamData,
      coach: this.transformCoaches(basicInfo.coaches || []),
      transfers: this.transformTransfers(transfers),
      totalPlayers: basicInfo.players?.length || 0,
      foreignPlayers: 0, // Would need to calculate from player data
      averagePlayerAge: this.calculateAverageAge(basicInfo.players || []),
      clubMarketValue: null, // Not available in current Korastats response
      currentLeagues: [], // Would need separate API call
      trophies: this.transformTrophies(trophies),
    };
  }

  static toTeamStats(korastatsStats: any): any {
    // This method is used for fallback when MongoDB data is not available
    // It should handle the actual Korastats response structure
    const stats = korastatsStats.data || {};

    // Transform Korastats stats to legacy format
    return {
      team: {
        id: stats.id || 0,
        name: stats.name || "Unknown Team",
      },
      season: 0, // Would need to be provided from context
      stats: {
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        position: 0,
      },
      form: {
        recent_results: [],
        form_string: "-----",
        points_from_last_5: 0,
      },
      goals: {
        total_for: 0,
        total_against: 0,
        home_for: 0,
        home_against: 0,
        away_for: 0,
        away_against: 0,
      },
      cards: {
        total_yellow: 0,
        total_red: 0,
        home_yellow: 0,
        home_red: 0,
        away_yellow: 0,
        away_red: 0,
      },
      recent_matches: [],
    };
  }

  private static transformCoaches(coaches: any[]): CoachData[] {
    return coaches.map((coach) => ({
      id: coach.id || 0,
      name: coach.name || "Unknown",
      firstname: coach.name?.split(" ")[0] || "-",
      lastname: coach.name?.split(" ")[1] || "-",
      age: coach.age || null,
      birth: {
        date: coach.dob || null,
        place: null,
        country: coach.nationality || "-",
      },
      nationality: coach.nationality || "-",
      height: null,
      weight: null,
      photo: coach.photo || "",
      team: {
        id: 0,
        name: "",
        code: "-",
        country: "",
        founded: null,
        national: false,
        logo: "",
      }, // Would need team context
      career: [],
    }));
  }

  private static transformTransfers(transfers: any[]): TransferData[] {
    // Transform transfers to legacy TransferData format
    return transfers.map((transfer) => ({
      player: {
        id: transfer.player?.id || 0,
        name: transfer.player?.name || "",
        firstname: transfer.player?.name?.split(" ")[0] || "-",
        lastname: transfer.player?.name?.split(" ")[1] || "-",
        age: transfer.player?.age || 0,
        birth: {
          date: transfer.player?.dob || null,
          place: null,
          country: transfer.player?.nationality || "-",
        },
        nationality: transfer.player?.nationality || "-",
        height: null,
        weight: null,
        injured: false,
        photo: transfer.player?.photo || "",
      },
      update: new Date().toISOString(),
      transfers: [],
    }));
  }

  private static calculateAverageAge(players: any[]): number {
    if (!players.length) return 0;
    const totalAge = players.reduce((sum, player) => sum + (player.age || 0), 0);
    return Math.round((totalAge / players.length) * 10) / 10;
  }

  private static formatMarketValue(value?: number): string {
    if (!value) return "N/A";
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
  }

  private static transformLeagues(leagues: any[]): any[] {
    return leagues.map((league) => ({
      id: league.id || 0,
      name: league.name || "Unknown League",
      country: league.country?.name || "",
      logo: league.logo || "",
      flag: null,
      season: league.season || 0,
    }));
  }

  private static transformTrophies(trophies: any[]): any[] {
    return trophies.map((trophy) => ({
      league: trophy.league || trophy.tournament || "Unknown",
      country: trophy.country || "Unknown",
      season: trophy.season || "Unknown",
    }));
  }
}

