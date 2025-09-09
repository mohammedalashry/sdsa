import { TeamData, Team, TeamVenue, TeamInfo } from "@/legacy-types/teams.types";
import { CoachData } from "@/legacy-types/players.types";
import { TransferData } from "@/legacy-types/transfers.types";
//import { League } from "../../../legacy-types/leagues.types";
import {
  KorastatsTeamResponse,
  KorastatsTeamInfoResponse,
  KorastatsTournamentTeamStatsResponse,
} from "@/integrations/korastats/types/team.types";

export class TeamMapper {
  static toTeamData(korastatsTeam: KorastatsTeamResponse): TeamData {
    return {
      team: {
        id: korastatsTeam.intTeamID,
        name: korastatsTeam.strTeamNameEn || korastatsTeam.strTeamName,
        code: korastatsTeam.strTeamShortCode || "-",
        country:
          korastatsTeam.strCountryNameEn || korastatsTeam.strCountryName || "Unknown",
        founded: korastatsTeam.intFoundedYear || 0,
        national: korastatsTeam.blnNationalTeam === 1,
        logo: korastatsTeam.strTeamLogo || "",
      },
      venue: {
        id: korastatsTeam.intStadiumID || 0,
        name: korastatsTeam.strStadiumName || "-",
        address: korastatsTeam.strStadiumAddress || "-",
        city: korastatsTeam.strStadiumCity || "-",
        capacity: korastatsTeam.intStadiumCapacity || 0,
        surface: korastatsTeam.strStadiumSurface || "-",
        image: korastatsTeam.strStadiumImage || "-",
      },
    };
  }

  static toTeamInfo(
    basicInfo: KorastatsTeamInfoResponse,
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
      foreignPlayers:
        basicInfo.players?.filter(
          (p: any) => p.strNationality !== basicInfo.strCountryNameEn,
        ).length || 0,
      averagePlayerAge: this.calculateAverageAge(basicInfo.players || []),
      clubMarketValue: this.formatMarketValue(basicInfo.totalMarketValue),
      currentLeagues: this.transformLeagues(basicInfo.leagues || []),
      trophies: this.transformTrophies(trophies),
    };
  }

  static toTeamStats(korastatsStats: KorastatsTournamentTeamStatsResponse): any {
    // This would need to be implemented based on the exact structure
    // of the Django TeamStatsData and the Korastats response format
    const stats = korastatsStats.data || [];

    // Transform Korastats stats to Django format
    // This is a simplified version - you'd need to map all the specific fields
    return {
      league: "-", // Would need to be provided from context
      team: "-", // Would need to be provided from context
      form: "-",
      fixtures: {
        played: { home: 0, away: 0, total: 0 },
        wins: { home: 0, away: 0, total: 0 },
        draws: { home: 0, away: 0, total: 0 },
        loses: { home: 0, away: 0, total: 0 },
      },
      // ... map other fields based on Korastats data
    };
  }

  private static transformCoaches(coaches: any[]): CoachData[] {
    return coaches.map((coach) => ({
      id: coach.intPlayerID,
      name: coach.strPlayerNameEn || "Unknown",
      firstname: "-", // Extract from name if available
      lastname: "-", // Extract from name if available
      age: coach.intAge || "-",
      birth: {
        date: "-",
        place: "-",
        country: coach.strNationality || "-",
      },
      nationality: coach.strNationality || "-",
      height: "-",
      weight: "-",
      photo: coach.strPlayerImage || "",
      team: {
        id: 0,
        name: "",
        code: "-",
        country: "",
        founded: 0,
        national: false,
        logo: "",
      }, // Would need team context
      career: [],
    }));
  }

  private static transformTransfers(transfers: any[]): TransferData[] {
    // Transform transfers to Django TransferData format
    return transfers.map((transfer) => ({
      player: {
        id: 0,
        name: "",
        firstname: "-",
        lastname: "-",
        age: 0,
        birth: { date: "-", place: "-", country: "-" },
        nationality: "-",
        height: "-",
        weight: "-",
        injured: false,
        photo: "",
      }, // Would need player context
      update: new Date().toISOString(),
      transfers: [],
    }));
  }

  private static calculateAverageAge(players: any[]): number {
    if (!players.length) return 0;
    const totalAge = players.reduce((sum, player) => sum + (player.intAge || 0), 0);
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
      id: league.intTournamentID,
      name: league.strTournamentName,
      country: league.strCountryNameEn || "",
      logo: league.strTournamentLogo || "",
      flag: "-",
      season: "-",
    }));
  }

  private static transformTrophies(trophies: any[]): any[] {
    return trophies.map((trophy) => ({
      league: trophy.strTournamentName || "Unknown",
      country: trophy.strCountryName || "Unknown",
      season: trophy.strSeason || "Unknown",
    }));
  }
}

