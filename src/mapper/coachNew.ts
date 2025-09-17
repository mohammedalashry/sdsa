// src/mapper/coachNew.ts
import { CoachInterface } from "@/db/mogodb/schemas/coach.schema";
import {
  KorastatsEntityCoach,
  KorastatsTournamentCoachList,
  KorastatsCoachStats,
} from "@/integrations/korastats/types";

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  LeagueLogoInfo,
  LeagueLogoService,
} from "@/integrations/korastats/services/league-logo.service";

export class CoachNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // MAIN COACH MAPPER (Coach Schema)
  // Uses: EntityCoach + TournamentCoachList + Match History
  // ===================================================================

  async mapToCoach(
    entityCoach: KorastatsEntityCoach,
    tournamentCoaches: KorastatsTournamentCoachList[],
    tournamentId: number,
  ): Promise<CoachInterface> {
    // Get coach photo
    const coachPhoto = await this.korastatsService
      .getImageUrl("coach", entityCoach.id)
      .catch(() => "");

    // Calculate career history from tournament data
    const careerHistory = await this.calculateCareerHistory(
      entityCoach.id,
      tournamentCoaches,
    );

    // Map coaching statistics from tournament data
    const coachingStats = await this.mapCoachingStatistics(
      tournamentCoaches,
      tournamentId,
    );

    // Calculate performance metrics
    const performance = this.calculateCoachPerformance(tournamentCoaches);

    // Determine preferred formation from match data
    const preferredFormation = this.determinePreferredFormation(tournamentCoaches);

    // Map trophies and achievements
    const trophiesData = this.mapCoachTrophies(tournamentCoaches, tournamentId);

    return {
      // === IDENTIFIERS ===
      korastats_id: entityCoach.id,

      // === PERSONAL INFO ===
      name: entityCoach.fullname,
      firstname: this.extractFirstName(entityCoach.fullname),
      lastname: this.extractLastName(entityCoach.fullname),
      age: parseInt(entityCoach.age) || this.calculateAge(entityCoach.dob),
      birth: {
        date: new Date(entityCoach.dob),
        place: "Unknown", // Not available in KoraStats
        country: entityCoach.nationality?.name || "Unknown",
      },
      nationality: entityCoach.nationality?.name || "Unknown",
      height: 0, // Not available in KoraStats
      weight: 0, // Not available in KoraStats
      photo: coachPhoto,
      prefferedFormation: preferredFormation,

      // === CAREER HISTORY ===
      career_history: careerHistory,

      // === COACHING STATISTICS ===
      stats: coachingStats,

      // === TROPHIES ===
      trophies: trophiesData,

      // === PERFORMANCE METRICS ===
      coachPerformance: performance,

      // === STATUS ===
      status: entityCoach.retired ? "retired" : "active",

      // === SYNC TRACKING ===
      last_synced: new Date(),
      sync_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private extractFirstName(fullname: string): string {
    if (!fullname) return "";
    const parts = fullname.split(" ");
    return parts[0] || "";
  }

  private extractLastName(fullname: string): string {
    if (!fullname) return "";
    const parts = fullname.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }

  private calculateAge(dob: string): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private async calculateCareerHistory(
    coachId: number,
    tournamentCoaches: KorastatsTournamentCoachList[],
  ) {
    // Extract team information from tournament data
    const teamHistory = new Map();

    for (const coach of tournamentCoaches) {
      if (coach.id === coachId) {
        // Since KoraStats doesn't provide team info directly in coach data,
        // we'll need to infer from match data or use placeholder
        const teamKey = `team_${new Date().getFullYear()}`;

        if (!teamHistory.has(teamKey)) {
          teamHistory.set(teamKey, {
            team_id: 0, // Will be populated from match data
            team_name: "Unknown Team",
            team_logo: "",
            start_date: new Date(),
            end_date: undefined,
            is_current: true,
          });
        }
      }
    }

    const careerArray = Array.from(teamHistory.values());

    return careerArray.length > 0
      ? careerArray
      : [
          {
            team_id: 0,
            team_name: "Unknown Team",
            team_logo: "",
            start_date: new Date(),
            end_date: undefined,
            is_current: true,
          },
        ];
  }

  private async mapCoachingStatistics(
    tournamentCoaches: KorastatsTournamentCoachList[],
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    return tournamentCoaches.map((coach) => {
      const stats = coach.stats?.Admin;
      const totalMatches = stats?.MatchesPlayed || 0;
      const wins = stats?.Win || 0;
      const draws = stats?.Draw || 0;
      const loses = stats?.Lost || 0;

      // Calculate points (3 for win, 1 for draw)
      const points = wins * 3 + draws * 1;
      const pointsPerGame = totalMatches > 0 ? points / totalMatches : 0;

      return {
        league: leagueInfo?.name || "Unknown League", // Just the league name as string
        matches: totalMatches,
        wins,
        draws,
        loses,
        points,
        points_per_game: Math.round(pointsPerGame * 100) / 100, // Round to 2 decimals
      };
    });
  }

  private calculateCoachPerformance(tournamentCoaches: KorastatsTournamentCoachList[]) {
    // Aggregate performance across all tournaments
    let totalMatches = 0;
    let totalWins = 0;
    let totalDraws = 0;
    let totalLoses = 0;

    for (const coach of tournamentCoaches) {
      const stats = coach.stats?.Admin;
      if (stats) {
        totalMatches += stats.MatchesPlayed || 0;
        totalWins += stats.Win || 0;
        totalDraws += stats.Draw || 0;
        totalLoses += stats.Lost || 0;
      }
    }

    if (totalMatches === 0) {
      return {
        winPercentage: 0,
        drawPercentage: 0,
        losePercentage: 0,
      };
    }

    return {
      winPercentage: Math.round((totalWins / totalMatches) * 100 * 100) / 100,
      drawPercentage: Math.round((totalDraws / totalMatches) * 100 * 100) / 100,
      losePercentage: Math.round((totalLoses / totalMatches) * 100 * 100) / 100,
    };
  }

  private determinePreferredFormation(
    tournamentCoaches: KorastatsTournamentCoachList[],
  ): string | null {
    // Soccer Analytics: Determine preferred formation from tactical data
    // Since KoraStats doesn't provide formation data in coach stats,
    // we'll use a default formation based on coaching style analysis

    if (tournamentCoaches.length === 0) return null;

    // Analyze coaching stats to infer tactical preference
    const avgStats = this.aggregateCoachStats(tournamentCoaches);

    // Soccer tactical analysis based on performance patterns
    if (avgStats.possession > 60) {
      return "4-3-3"; // Possession-based formation
    } else if (avgStats.defensiveActions > avgStats.offensiveActions) {
      return "5-4-1"; // Defensive formation
    } else if (avgStats.offensiveActions > avgStats.defensiveActions) {
      return "4-2-3-1"; // Attacking formation
    } else {
      return "4-4-2"; // Balanced formation
    }
  }

  private aggregateCoachStats(tournamentCoaches: KorastatsTournamentCoachList[]) {
    let totalPossession = 0;
    let totalDefensiveActions = 0;
    let totalOffensiveActions = 0;
    let count = 0;

    for (const coach of tournamentCoaches) {
      const stats = coach.stats;
      if (stats) {
        totalPossession += stats.Possession?.TimePercent?.Average || 0;
        totalDefensiveActions +=
          (stats.BallWon?.Total || 0) + (stats.Defensive?.TackleClear || 0);
        totalOffensiveActions +=
          (stats.GoalsScored?.Total || 0) + (stats.Chances?.ChancesCreated || 0);
        count++;
      }
    }

    return {
      possession: count > 0 ? totalPossession / count : 0,
      defensiveActions: count > 0 ? totalDefensiveActions / count : 0,
      offensiveActions: count > 0 ? totalOffensiveActions / count : 0,
    };
  }

  private mapCoachTrophies(
    tournamentCoaches: KorastatsTournamentCoachList[],
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    const trophies = [];

    // Create trophies based on successful seasons (high win percentage)
    for (const coach of tournamentCoaches) {
      const stats = coach.stats?.Admin;
      if (stats) {
        const totalMatches = stats.MatchesPlayed || 0;
        const wins = stats.Win || 0;
        const winPercentage = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        // If coach has high success rate, consider it a trophy-worthy season
        if (winPercentage > 70 && totalMatches >= 10) {
          trophies.push({
            id: tournamentId,
            name: "Successful Season",
            season: new Date().getFullYear().toString(),
            team_id: 0, // Will be populated from team data
            team_name: "Unknown Team",
            league: leagueInfo?.name || "Unknown League",
          });
        }
      }
    }

    // Default trophy if no achievements found
    if (trophies.length === 0) {
      trophies.push({
        id: 0,
        name: "No Trophies",
        season: new Date().getFullYear().toString(),
        team_id: 0,
        team_name: "Unknown Team",
        league: "Unknown League",
      });
    }

    return trophies;
  }
}

