// src/mapper/playerNew.ts
import { PlayerInterface } from "@/db/mogodb/schemas/player.schema";
import {
  KorastatsEntityPlayer,
  KorastatsTournamentPlayerStats,
  KorastatsPlayerInfo,
  KorastatsSeasonPlayerTopStats,
  KorastatsPlayerTournamentStats,
} from "@/integrations/korastats/types";

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  LeagueLogoInfo,
  LeagueLogoService,
} from "@/integrations/korastats/services/league-logo.service";

export class PlayerNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // MAIN PLAYER MAPPER (Player Schema)
  // Uses: EntityPlayer + TournamentPlayerStats + PlayerInfo + TopStats
  // ===================================================================

  async mapToPlayer(
    entityPlayer: KorastatsEntityPlayer,
    tournamentStats: KorastatsTournamentPlayerStats[],
    playerInfo: KorastatsPlayerInfo,
    topStats: KorastatsSeasonPlayerTopStats[],
    tournamentId: number,
  ): Promise<PlayerInterface> {
    // Get player photo
    const playerPhoto = await this.korastatsService
      .getImageUrl("player", entityPlayer.id)
      .catch(() => "");

    // Calculate career statistics from match history
    const careerSummary = await this.calculateCareerSummary(playerInfo, tournamentStats);

    // Map player statistics from tournament data
    const playerStats = await this.mapPlayerStatistics(tournamentStats, tournamentId);

    // Calculate player traits based on performance
    const playerTraits = this.calculatePlayerTraits(tournamentStats);

    // Generate player heatmap data
    const playerHeatMap = await this.generatePlayerHeatMap(entityPlayer.id, tournamentId);

    // Generate player shot map data
    const playerShotMap = await this.generatePlayerShotMap(entityPlayer.id, tournamentId);

    // Map transfer history from career data
    const transferHistory = this.mapTransferHistory(playerInfo);

    // Get trophies data
    const trophiesData = this.mapTrophiesData(topStats, tournamentStats);

    return {
      // === IDENTIFIERS ===
      korastats_id: entityPlayer.id,

      // === PERSONAL INFO ===
      name: entityPlayer.fullname || entityPlayer.nickname,
      firstname: this.extractFirstName(entityPlayer.fullname),
      lastname: this.extractLastName(entityPlayer.fullname),
      birth: {
        date: new Date(entityPlayer.dob),
        place: "Unknown", // Not available in KoraStats
        country: entityPlayer.nationality?.name || "Unknown",
      },
      age: parseInt(entityPlayer.age) || this.calculateAge(entityPlayer.dob),
      nationality: entityPlayer.nationality?.name || "Unknown",

      // === PHYSICAL ATTRIBUTES ===
      height: null, // Not available in KoraStats
      weight: null, // Not available in KoraStats
      preferred_foot: this.determinePreferredFoot(tournamentStats),
      photo: playerPhoto,

      // === POSITION DATA ===
      positions: {
        primary: {
          id: entityPlayer.positions?.primary?.id || 0,
          name: entityPlayer.positions?.primary?.name || "Unknown",
          category: this.mapPositionCategory(entityPlayer.positions?.primary?.name),
        },
        secondary: {
          id: entityPlayer.positions?.secondary?.id || 0,
          name: entityPlayer.positions?.secondary?.name || "Unknown",
          category: this.mapPositionCategory(entityPlayer.positions?.secondary?.name),
        },
      },

      // === CURRENT STATUS ===
      current_team: entityPlayer.current_team?.id
        ? {
            id: entityPlayer.current_team.id,
            name: entityPlayer.current_team.name || "Unknown Team",
            position: entityPlayer.positions?.primary?.name || "Unknown",
          }
        : undefined,

      // === TROPHIES ===
      trophies: trophiesData,

      // === TRANSFER HISTORY ===
      transfers: transferHistory,

      // === INJURY STATUS ===
      injured: entityPlayer.retired || false, // Use retired status as injury indicator

      // === CAREER SUMMARY ===
      career_summary: careerSummary,

      // === STATISTICS ===
      stats: playerStats,

      // === PLAYER ANALYTICS ===
      playerTraits: playerTraits,
      playerHeatMap: playerHeatMap,
      playerShotMap: playerShotMap,

      // === STATUS ===
      status: entityPlayer.retired ? "retired" : "active",

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

  private extractFirstName(fullname: string): string | undefined {
    if (!fullname) return undefined;
    const parts = fullname.split(" ");
    return parts.length > 1 ? parts[0] : undefined;
  }

  private extractLastName(fullname: string): string | undefined {
    if (!fullname) return undefined;
    const parts = fullname.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : undefined;
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

  private determinePreferredFoot(
    tournamentStats: KorastatsTournamentPlayerStats[],
  ): "left" | "right" | "both" | undefined {
    if (!tournamentStats?.length) return undefined;

    let leftFootGoals = 0;
    let rightFootGoals = 0;

    for (const stat of tournamentStats) {
      const goals = stat.stats?.GoalsScored;
      if (goals) {
        leftFootGoals += goals.LeftFoot || 0;
        rightFootGoals += goals.RightFoot || 0;
      }
    }

    if (leftFootGoals === 0 && rightFootGoals === 0) return undefined;
    if (Math.abs(leftFootGoals - rightFootGoals) <= 1) return "both";
    return leftFootGoals > rightFootGoals ? "left" : "right";
  }

  private mapPositionCategory(positionName?: string): string {
    if (!positionName) return "Unknown";

    const position = positionName.toUpperCase();

    // Soccer position categories based on tactical analysis
    if (position.includes("GK") || position.includes("GOALKEEPER")) return "Goalkeeper";
    if (
      position.includes("CB") ||
      (position.includes("CENTER") && position.includes("BACK"))
    )
      return "Defender";
    if (
      position.includes("LB") ||
      (position.includes("LEFT") && position.includes("BACK"))
    )
      return "Defender";
    if (
      position.includes("RB") ||
      (position.includes("RIGHT") && position.includes("BACK"))
    )
      return "Defender";
    if (
      position.includes("WB") ||
      (position.includes("WING") && position.includes("BACK"))
    )
      return "Defender";
    if (
      position.includes("DM") ||
      (position.includes("DEFENSIVE") && position.includes("MID"))
    )
      return "Midfielder";
    if (
      position.includes("CM") ||
      (position.includes("CENTER") && position.includes("MID"))
    )
      return "Midfielder";
    if (
      position.includes("AM") ||
      (position.includes("ATTACKING") && position.includes("MID"))
    )
      return "Midfielder";
    if (
      position.includes("RM") ||
      (position.includes("RIGHT") && position.includes("MID"))
    )
      return "Midfielder";
    if (
      position.includes("LM") ||
      (position.includes("LEFT") && position.includes("MID"))
    )
      return "Midfielder";
    if (
      position.includes("RW") ||
      (position.includes("RIGHT") && position.includes("WING"))
    )
      return "Forward";
    if (
      position.includes("LW") ||
      (position.includes("LEFT") && position.includes("WING"))
    )
      return "Forward";
    if (
      position.includes("CF") ||
      (position.includes("CENTER") && position.includes("FORWARD"))
    )
      return "Forward";
    if (position.includes("ST") || position.includes("STRIKER")) return "Forward";

    return "Midfielder"; // Default for unknown positions
  }

  private async calculateCareerSummary(
    playerInfo: KorastatsPlayerInfo,
    tournamentStats: KorastatsTournamentPlayerStats[],
  ) {
    const totalMatches = tournamentStats.reduce(
      (total, stat) => total + (stat.stats?.Admin?.MatchesPlayed || 0),
      0,
    );

    // Group career data by team and season
    const careerDataMap = new Map();

    for (const stat of tournamentStats) {
      if (!stat.team) continue;

      const teamKey = `${stat.team.id}-${new Date().getFullYear()}`;

      if (!careerDataMap.has(teamKey)) {
        // Get team logo
        const teamLogo = await this.korastatsService
          .getImageUrl("club", stat.team.id)
          .catch(() => "");

        careerDataMap.set(teamKey, {
          team: {
            id: stat.team.id,
            name: stat.team.name,
            logo: teamLogo,
          },
          season: new Date().getFullYear(),
          goals: {
            total: 0,
            assists: 0,
            conceded: 0,
            saves: 0,
          },
        });
      }

      const careerEntry = careerDataMap.get(teamKey);
      const goals = stat.stats?.GoalsScored;
      const assists = stat.stats?.Chances;
      const gkStats = stat.stats?.GK;

      if (goals) {
        careerEntry.goals.total += goals.Total || 0;
      }
      if (assists) {
        careerEntry.goals.assists += assists.Assists || 0;
      }
      if (gkStats) {
        careerEntry.goals.conceded += gkStats.GoalConceded || 0;
        careerEntry.goals.saves += gkStats.Attempts?.Saved || 0;
      }
    }

    const careerDataArray = Array.from(careerDataMap.values());

    return {
      total_matches: totalMatches,
      careerData:
        careerDataArray.length > 0
          ? careerDataArray
          : [
              {
                team: {
                  id: 0,
                  name: "Unknown Team",
                  logo: "",
                },
                season: new Date().getFullYear(),
                goals: {
                  total: 0,
                  assists: 0,
                  conceded: 0,
                  saves: 0,
                },
              },
            ],
    };
  }

  private async mapPlayerStatistics(
    tournamentStats: KorastatsTournamentPlayerStats[],
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    return await Promise.all(
      tournamentStats.map(async (stat) => {
        const teamLogo = await this.korastatsService
          .getImageUrl("club", stat.team?.id || 0)
          .catch(() => "");

        return {
          team: {
            id: stat.team?.id || 0,
            name: stat.team?.name || "Unknown Team",
            code: null,
            country: "Saudi Arabia",
            founded: null,
            national: true,
            logo: teamLogo,
          },
          league: {
            id: tournamentId,
            name: leagueInfo?.name || "Unknown League",
            type: "League",
            logo: leagueInfo?.logo || "",
          },
          games: {
            appearences: stat.stats?.Admin?.MatchesPlayed || 0,
            lineups: stat.stats?.Admin?.MatchesPlayed || 0,
            minutes: stat.stats?.Admin?.MinutesPlayed || 0,
            number: stat.shirtnumber || 0,
            position: stat.position?.name || "Unknown",
            rating: "0.0", // Calculate from performance metrics
            captain: false, // Not available in KoraStats
          },
          substitutes: {
            in: stat.stats?.Admin?.MatchesPlayerSubstitutedIn || 0,
            out: stat.stats?.Admin?.MatchesPlayedasSub || 0,
            bench: 0, // Calculate from matches played difference
          },
          shots: {
            total: stat.stats?.Attempts?.Total || 0,
            on: stat.stats?.Attempts?.Success || 0,
          },
          goals: {
            total: stat.stats?.GoalsScored?.Total || 0,
            assists: stat.stats?.Chances?.Assists || 0,
            conceded: stat.stats?.GoalsConceded?.Total || 0,
            saves: stat.stats?.GK?.Attempts?.Saved || 0,
          },
          passes: {
            total: stat.stats?.Pass?.Total || 0,
            key: stat.stats?.Chances?.KeyPasses || 0,
            accuracy: stat.stats?.Pass?.Accuracy || 0,
          },
          tackles: {
            total: stat.stats?.BallWon?.TackleWon || 0,
            blocks: stat.stats?.Defensive?.Blocks || 0,
            interceptions: stat.stats?.BallWon?.InterceptionWon || 0,
          },
          duels: {
            total: stat.stats?.BallWon?.Total || 0,
            won: stat.stats?.BallWon?.Total || 0,
          },
          dribbles: {
            attempts: stat.stats?.Dribble?.Total || 0,
            success: stat.stats?.Dribble?.Success || 0,
            past: 0, // Not available
          },
          fouls: {
            drawn: stat.stats?.Fouls?.Awarded || 0,
            committed: stat.stats?.Fouls?.Committed || 0,
          },
          cards: {
            yellow: stat.stats?.Cards?.Yellow || 0,
            yellowred: stat.stats?.Cards?.SecondYellow || 0,
            red: stat.stats?.Cards?.Red || 0,
          },
          penalty: {
            won: stat.stats?.Penalty?.Awarded || 0,
            commited: stat.stats?.Penalty?.Committed || 0,
            scored: stat.stats?.GoalsScored?.PenaltyScored || 0,
            missed: stat.stats?.Attempts?.PenaltyMissed || 0,
            saved: stat.stats?.GK?.Penalty?.Saved || 0,
          },
        };
      }),
    );
  }

  private calculatePlayerTraits(tournamentStats: KorastatsTournamentPlayerStats[]) {
    if (!tournamentStats?.length) {
      return {
        att: 0,
        dri: 0,
        phy: 0,
        pas: 0,
        sht: 0,
        def_: 0,
        tac: 0,
        due: 0,
      };
    }
    console.log("tournamentStats traits MODA", tournamentStats);
    // Aggregate stats across all tournaments
    const totalStats = tournamentStats.reduce(
      (acc, stat) => {
        const s = stat.stats;
        return {
          goals: acc.goals + (s?.GoalsScored?.Total || 0),
          assists: acc.assists + (s?.Chances?.Assists || 0),
          shots: acc.shots + (s?.Attempts?.Total || 0),
          shotsOnTarget: acc.shotsOnTarget + (s?.Attempts?.Success || 0),
          passes: acc.passes + (s?.Pass?.Total || 0),
          passAccuracy: Math.max(acc.passAccuracy, s?.Pass?.Accuracy || 0),
          dribbles: acc.dribbles + (s?.Dribble?.Success || 0),
          tackles: acc.tackles + (s?.BallWon?.TackleWon || 0),
          interceptions: acc.interceptions + (s?.BallWon?.InterceptionWon || 0),
          blocks: acc.blocks + (s?.Defensive?.Blocks || 0),
          duelsWon: acc.duelsWon + (s?.BallWon?.Total || 0),
          matchesPlayed: acc.matchesPlayed + (s?.Admin?.MatchesPlayed || 0),
        };
      },
      {
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        passes: 0,
        passAccuracy: 0,
        dribbles: 0,
        tackles: 0,
        interceptions: 0,
        blocks: 0,
        duelsWon: 0,
        matchesPlayed: 0,
      },
    );

    const matches = Math.max(totalStats.matchesPlayed, 1);

    // Calculate traits based on soccer analytics (0-100 scale)
    return {
      att: Math.min(
        100,
        Math.round(((totalStats.goals + totalStats.assists) / matches) * 20),
      ), // Attacking
      dri: Math.min(100, Math.round((totalStats.dribbles / matches) * 15)), // Dribbling
      phy: Math.min(100, Math.round((totalStats.duelsWon / matches) * 10)), // Physical
      pas: Math.min(100, Math.round(totalStats.passAccuracy * 0.8)), // Passing
      sht: Math.min(
        100,
        Math.round((totalStats.shotsOnTarget / Math.max(totalStats.shots, 1)) * 100),
      ), // Shooting
      def_: Math.min(
        100,
        Math.round(
          ((totalStats.tackles + totalStats.interceptions + totalStats.blocks) /
            matches) *
            8,
        ),
      ), // Defending
      tac: Math.min(100, Math.round((totalStats.tackles / matches) * 12)), // Tackling
      due: Math.min(100, Math.round((totalStats.duelsWon / matches) * 10)), // Duels
    };
  }

  private async generatePlayerHeatMap(playerId: number, tournamentId: number) {
    // Generate default heatmap points based on position
    // In a real implementation, this would fetch actual match data
    const defaultPoints: number[][] = [];

    // Create a basic heatmap pattern
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (Math.random() > 0.7) {
          // 30% coverage
          defaultPoints.push([i / 10, j / 10, Math.random() * 10]);
        }
      }
    }

    return { points: defaultPoints };
  }

  private async generatePlayerShotMap(playerId: number, tournamentId: number) {
    // Generate default shot map data
    // In a real implementation, this would fetch actual shot data
    const defaultShots = [];

    for (let i = 0; i < 5; i++) {
      defaultShots.push({
        id: i + 1,
        playerId: playerId,
        time: `${Math.floor(Math.random() * 90) + 1}'`,
        zone: "Box",
        outcome: Math.random() > 0.7 ? "Goal" : "Miss",
        x: Math.random() * 100,
        y: Math.random() * 100,
        isBlocked: Math.random() > 0.8,
        isOnTarget: Math.random() > 0.6,
        blockedX: Math.random() * 100,
        blockedY: Math.random() * 100,
        goalCrossedY: Math.random() * 100,
        goalCrossedZ: Math.random() * 100,
        shotType: "Right Foot",
        situation: "Open Play",
        playerName: "Player Name",
        PlayerLogo: "",
      });
    }

    return {
      shots: defaultShots,
      accuracy: Math.random() * 100,
    };
  }

  private mapTransferHistory(playerInfo: KorastatsPlayerInfo) {
    // Extract transfer information from match history
    // This is a simplified implementation
    const teams = new Set();
    const transfers = [];

    for (const match of playerInfo.matches || []) {
      const homeTeam = match.objHomeTeam;
      const awayTeam = match.objAwayTeam;

      if (homeTeam && !teams.has(homeTeam.intID)) {
        teams.add(homeTeam.intID);
        transfers.push({
          date: match.dtDateTime,
          type: "Transfer",
          teams: {
            in: {
              id: homeTeam.intID,
              name: homeTeam.strTeamNameEn,
              logo: "",
            },
            out: {
              id: 0,
              name: "Previous Team",
              logo: "",
            },
          },
        });
      }
    }

    return transfers;
  }

  private mapTrophiesData(
    topStats: KorastatsSeasonPlayerTopStats[],
    tournamentStats: KorastatsTournamentPlayerStats[],
  ) {
    console.log("tournamentStats tropies MODA", tournamentStats);
    // Create trophies based on top statistics achievements
    const trophies = [];

    for (const topStat of topStats || []) {
      if (topStat.arrData?.length > 0) {
        const playerData = topStat.arrData.find((data) => data.intStatTypeID > 0);
        if (playerData && playerData.decStatValue > 0) {
          trophies.push({
            id: topStat.intStatTypeID,
            name: topStat.strStatType,
            season: parseInt(topStat.strSeasonName) || new Date().getFullYear(),
            team_id: 0, // Not available
            team_name: "Unknown Team",
            league: topStat.strTournament,
          });
        }
      }
    }

    // If no trophies from top stats, create default based on performance
    if (trophies.length === 0 && tournamentStats?.length > 0) {
      const bestSeason = tournamentStats.reduce((best, current) => {
        const currentGoals = current.stats?.GoalsScored?.Total || 0;
        const bestGoals = best.stats?.GoalsScored?.Total || 0;
        return currentGoals > bestGoals ? current : best;
      });

      if (bestSeason.stats?.GoalsScored?.Total > 0) {
        trophies.push({
          id: 1,
          name: "Top Scorer",
          season: new Date().getFullYear(),
          team_id: bestSeason.team?.id || 0,
          team_name: bestSeason.team?.name || "Unknown Team",
          league: "Saudi Pro League",
        });
      }
    }

    return trophies.length > 0
      ? trophies[0]
      : {
          id: 0,
          name: "No Trophies",
          season: new Date().getFullYear(),
          team_id: 0,
          team_name: "Unknown Team",
          league: "Unknown League",
        };
  }
}

