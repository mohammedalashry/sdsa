// src/mapper/playerNew.ts
// Comprehensive player data mapper using real Korastats API data
// Aligned with updated schema and following patterns from other modules

import { PlayerInterface } from "@/db/mogodb/schemas/player.schema";
import {
  KorastatsEntityPlayer,
  KorastatsTournamentPlayerStats,
  KorastatsPlayerInfo,
  KorastatsSeasonPlayerTopStats,
} from "@/integrations/korastats/types";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";

export class PlayerNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // MAIN PLAYER MAPPER
  // ===================================================================

  async mapToPlayer(
    entityPlayer: KorastatsEntityPlayer,
    tournamentStats: KorastatsTournamentPlayerStats[],
    topStats: KorastatsSeasonPlayerTopStats[],
    tournamentId: number,
  ): Promise<PlayerInterface> {
    // Validate required data
    if (!entityPlayer || !entityPlayer.id) {
      throw new Error("Invalid entityPlayer data provided");
    }

    // Get player photo with fallback
    const playerPhoto = await this.getPlayerPhoto(entityPlayer.id);

    // Calculate career summary from real data
    const careerSummary = await this.calculateCareerSummary(
      tournamentStats,
      entityPlayer,
    );

    // Get country data for league information
    const countryData = await this.korastatsService
      .getEntityCountries("Saudi Arabia")
      .catch(() => ({
        root: {
          object: [
            {
              name: "Saudi Arabia",
              flag: "https://via.placeholder.com/50x30/cccccc/666666?text=SA",
            },
          ],
        },
      }));

    // Map player statistics from tournament data
    const playerStats = await this.mapPlayerStatistics(
      tournamentStats,
      tournamentId,
      countryData,
      entityPlayer,
    );

    // Calculate player traits based on performance
    const playerTraits = this.calculatePlayerTraits(tournamentStats);

    // Generate player heatmap data
    const playerHeatMap = await this.generatePlayerHeatMap(entityPlayer.id, tournamentId);

    // Generate player shot map data
    const playerShotMap = await this.generatePlayerShotMap(entityPlayer.id, tournamentId);

    // Calculate top scorers and assists achievements
    const topAchievements = this.calculateTopAchievements(topStats, tournamentStats);

    return {
      // === IDENTIFIERS ===
      korastats_id: entityPlayer.id,

      // === PERSONAL INFO ===
      name: entityPlayer.fullname || entityPlayer.nickname || "Unknown Player",
      firstname: this.extractFirstName(entityPlayer.fullname),
      lastname: this.extractLastName(entityPlayer.fullname),
      birth: {
        date: entityPlayer.dob || new Date().toISOString().split("T")[0],
        place: "Unknown", // Not available in Korastats
        country: entityPlayer.nationality?.name || "Unknown",
      },
      age: this.parseAge(entityPlayer.age),
      nationality: entityPlayer.nationality?.name || "Unknown",
      shirtNumber: this.getShirtNumber(tournamentStats),

      // === PHYSICAL ATTRIBUTES ===
      height: null, // Not available in Korastats
      weight: null, // Not available in Korastats
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

      // === INJURY STATUS ===
      injured: entityPlayer.retired || false,

      // === CAREER SUMMARY ===
      career_summary: careerSummary,

      // === STATISTICS ===
      stats: playerStats,

      // === PLAYER ANALYTICS ===
      playerTraits: playerTraits,
      playerHeatMap: playerHeatMap,
      playerShotMap: playerShotMap,

      // === TOP ACHIEVEMENTS ===
      topAssists: topAchievements.topAssists,
      topScorers: topAchievements.topScorers,

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

  private async getPlayerPhoto(playerId: number): Promise<string> {
    try {
      const photo = await this.korastatsService.getImageUrl("player", playerId);
      return photo || "https://via.placeholder.com/150x150/cccccc/666666?text=PLAYER";
    } catch (error) {
      return "https://via.placeholder.com/150x150/cccccc/666666?text=PLAYER";
    }
  }

  private extractFirstName(fullname?: string): string | undefined {
    if (!fullname) return undefined;
    const parts = fullname.split(" ");
    return parts.length > 1 ? parts[0] : undefined;
  }

  private extractLastName(fullname?: string): string | undefined {
    if (!fullname) return undefined;
    const parts = fullname.split(" ");
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  private parseAge(ageStr?: string): number {
    if (!ageStr) return 0;
    const parsed = parseInt(ageStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  private getShirtNumber(tournamentStats: KorastatsTournamentPlayerStats[]): number {
    if (!tournamentStats?.length) return 0;
    return tournamentStats[0]?.shirtnumber || 0;
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
    tournamentStats: KorastatsTournamentPlayerStats[],
    entityPlayer: KorastatsEntityPlayer,
  ) {
    const totalMatches = tournamentStats.reduce((total, stat) => {
      // Find the "Matches Played as Lineup" stat (id: 27)
      const matchesPlayedStat = (stat.stats as any)?.find((s: any) => s.id === 27);
      return total + (matchesPlayedStat?.value || 0);
    }, 0);

    // Group career data by team and season
    const careerDataMap = new Map<string, any>();

    for (const stat of tournamentStats) {
      if (!stat.team && !entityPlayer.current_team) continue;

      const teamId = stat.team?.id || entityPlayer.current_team?.id;
      const teamName = stat.team?.name || entityPlayer.current_team?.name;
      const teamKey = `${teamId}-${new Date().getFullYear()}`;

      if (!careerDataMap.has(teamKey)) {
        // Get team logo with fallback
        const teamLogo = await this.korastatsService
          .getImageUrl("club", teamId)
          .catch(() => "https://via.placeholder.com/100x100/cccccc/666666?text=TEAM");

        careerDataMap.set(teamKey, {
          team: {
            id: teamId,
            name: teamName || "Unknown Team",
            logo: teamLogo,
          },
          season: new Date().getFullYear(),
        });
      }
    }

    const careerDataArray = Array.from(careerDataMap.values());

    return {
      total_matches: totalMatches,
      careerData: careerDataArray.length > 0 ? careerDataArray : [],
    };
  }

  private async mapPlayerStatistics(
    tournamentStats: KorastatsTournamentPlayerStats[],
    tournamentId: number,
    countryData: any,
    entityPlayer: KorastatsEntityPlayer,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    return await Promise.all(
      tournamentStats.map(async (stat) => {
        // Get team logo with fallback
        const teamLogo = await this.korastatsService
          .getImageUrl("club", entityPlayer.current_team?.id || 0)
          .catch(() => "https://via.placeholder.com/100x100/cccccc/666666?text=TEAM");

        // Helper function to get stat value by ID
        const getStatValue = (statId: number) => {
          const statObj = (stat.stats as any)?.find((s: any) => s.id === statId);
          return statObj?.value || 0;
        };

        return {
          team: {
            id: stat.team?.id || entityPlayer.current_team?.id || 0,
            name: stat.team?.name || entityPlayer.current_team?.name || "Unknown Team",
            code: null,
            country: "Saudi Arabia",
            founded: null,
            national: true,
            logo: teamLogo,
          },
          league: {
            id: leagueInfo?.id || 0,
            name: leagueInfo?.name || "Unknown League",
            type: leagueInfo?.type || "League",
            country: countryData?.root?.object?.[0]?.name || "Saudi Arabia",
            logo:
              leagueInfo?.logo ||
              "https://via.placeholder.com/100x100/cccccc/666666?text=LEAGUE",
            flag:
              countryData?.root?.object?.[0]?.flag ||
              "https://via.placeholder.com/50x30/cccccc/666666?text=SA",
            season: leagueInfo?.season || new Date().getFullYear(),
          },
          games: {
            appearences: getStatValue(27), // Matches Played as Lineup
            lineups: getStatValue(27), // Matches Played as Lineup
            minutes: getStatValue(20), // Minutes Played
            number: stat.shirtnumber || 0,
            position:
              entityPlayer.positions?.primary?.name ||
              entityPlayer.positions?.secondary?.name ||
              "Unknown",
            rating: this.calculatePlayerRating(stat.stats),
            captain: false, // Not available in Korastats
          },
          substitutes: {
            in: getStatValue(28), // Goals Conceded (as substitute metric)
            out: 0, // Not available in Korastats
            bench: Math.max(0, getStatValue(27) - getStatValue(27)), // Always 0 for now
          },
          shots: {
            total: getStatValue(45), // Total Attempts
            on: getStatValue(37), // Success Attempts
          },
          goals: {
            total: getStatValue(21), // Goals Scored
            assists: getStatValue(22), // Assists
            conceded: getStatValue(28), // Goals Conceded
            saves: getStatValue(38), // Saved Attempts
          },
          passes: {
            total: getStatValue(2), // Total Passes
            key: getStatValue(92), // KeyPasses
            accuracy: (getStatValue(1) / Math.max(getStatValue(2), 1)) * 100, // Success Passes / Total Passes
          },
          tackles: {
            total: getStatValue(81), // TackleWon
            blocks: getStatValue(54), // Blocks
            interceptions: getStatValue(84), // InterceptWon
          },
          duels: {
            total: getStatValue(9), // Total Ball Won
            won: getStatValue(9), // Total Ball Won
          },
          dribbles: {
            attempts: getStatValue(60), // Dribble Success
            success: getStatValue(60), // Dribble Success
            past: 0, // Not available in Korastats
          },
          fouls: {
            drawn: getStatValue(53), // Fouls Awarded
            committed: getStatValue(17), // Fouls Committed
          },
          cards: {
            yellow: getStatValue(14), // Yellow Card
            yellowred: getStatValue(15), // Second Yellow Card
            red: getStatValue(16), // Red Card
          },
          penalty: {
            won: getStatValue(49), // Penalty Awarded
            commited: getStatValue(48), // Penalty Committed
            scored: getStatValue(51), // Penalty Scored
            missed: getStatValue(50), // Penalty Missed
            saved: getStatValue(52), // Goals Saved (as penalty saves)
          },
        };
      }),
    );
  }

  private calculatePlayerRating(stats: any): string {
    if (!stats || !Array.isArray(stats)) return "0.0";

    // Helper function to get stat value by ID
    const getStatValue = (statId: number) => {
      const statObj = (stats as any)?.find((s: any) => s.id === statId);
      return statObj?.value || 0;
    };

    // Calculate rating based on key performance metrics
    const goals = getStatValue(21); // Goals Scored
    const assists = getStatValue(22); // Assists
    const passes = getStatValue(2); // Total Passes
    const passAccuracy = (getStatValue(1) / Math.max(getStatValue(2), 1)) * 100; // Success Passes / Total Passes
    const tackles = getStatValue(81); // TackleWon
    const interceptions = getStatValue(84); // InterceptWon
    const matches = getStatValue(27); // Matches Played as Lineup

    // Simple rating calculation (0-10 scale)
    let rating = 5.0; // Base rating

    // Goals contribution
    rating += (goals / Math.max(matches, 1)) * 2;

    // Assists contribution
    rating += (assists / Math.max(matches, 1)) * 1.5;

    // Passing contribution
    rating += (passAccuracy / 100) * 1;

    // Defensive contribution
    rating += ((tackles + interceptions) / Math.max(matches, 1)) * 0.5;

    return Math.min(10.0, Math.max(0.0, rating)).toFixed(1);
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

    // Aggregate stats across all tournaments
    const totalStats = tournamentStats.reduce(
      (acc, stat) => {
        const statsArray = stat.stats || [];

        // Helper function to get stat value by ID
        const getStatValue = (statId: number) => {
          const statObj = (statsArray as any)?.find((s: any) => s.id === statId);
          return statObj?.value || 0;
        };

        return {
          goals: acc.goals + getStatValue(21), // Goals Scored
          assists: acc.assists + getStatValue(22), // Assists
          shots: acc.shots + getStatValue(45), // Total Attempts
          shotsOnTarget: acc.shotsOnTarget + getStatValue(37), // Success Attempts
          passes: acc.passes + getStatValue(2), // Total Passes
          passAccuracy: Math.max(
            acc.passAccuracy,
            (getStatValue(1) / Math.max(getStatValue(2), 1)) * 100,
          ), // Success Passes / Total Passes
          dribbles: acc.dribbles + getStatValue(60), // Dribble Success
          tackles: acc.tackles + getStatValue(81), // TackleWon
          interceptions: acc.interceptions + getStatValue(84), // InterceptWon
          blocks: acc.blocks + getStatValue(54), // Blocks
          duelsWon: acc.duelsWon + getStatValue(9), // Total Ball Won
          matchesPlayed: acc.matchesPlayed + getStatValue(27), // Matches Played as Lineup
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

  private calculateTopAchievements(
    topStats: KorastatsSeasonPlayerTopStats[],
    tournamentStats: KorastatsTournamentPlayerStats[],
  ) {
    const topAssists: Array<{ season: number; league: number }> = [];
    const topScorers: Array<{ season: number; league: number }> = [];

    // Process top stats for achievements using correct stat type IDs
    for (const topStat of topStats || []) {
      if (topStat.arrData?.length > 0) {
        const playerData = topStat.arrData.find((data) => data.intStatTypeID > 0);
        if (playerData && playerData.decStatValue > 0) {
          const leagueInfo = LeagueLogoService.getLeagueLogo(topStat.intTournamentID);
          const season = leagueInfo?.season || new Date().getFullYear();
          const league = leagueInfo?.id || 0;

          // Use correct stat type IDs from ListStatTypes
          // Goals Scored = intID: 21, Assists = intID: 22
          if (topStat.intStatTypeID === 21) {
            // Goals Scored
            topScorers.push({ season, league });
          } else if (topStat.intStatTypeID === 22) {
            // Assists
            topAssists.push({ season, league });
          }
        }
      }
    }

    // If no achievements from top stats, create based on tournament performance
    if (
      topScorers.length === 0 &&
      topAssists.length === 0 &&
      tournamentStats?.length > 0
    ) {
      const bestSeason = tournamentStats.reduce((best, current) => {
        // Helper function to get stat value by ID
        const getStatValue = (statId: number) => {
          const statObj = (current.stats as any)?.find((s: any) => s.id === statId);
          return statObj?.value || 0;
        };

        const currentGoals = getStatValue(21); // Goals Scored
        const currentAssists = getStatValue(22); // Assists

        // Helper function for best season
        const getBestStatValue = (statId: number) => {
          const statObj = (best.stats as any)?.find((s: any) => s.id === statId);
          return statObj?.value || 0;
        };

        const bestGoals = getBestStatValue(21); // Goals Scored
        const bestAssists = getBestStatValue(22); // Assists

        // Prioritize goals over assists for "best season"
        if (currentGoals > bestGoals) return current;
        if (currentGoals === bestGoals && currentAssists > bestAssists) return current;
        return best;
      });

      const season = new Date().getFullYear();
      const league = 840; // Default Pro League

      // Helper function to get stat value by ID for best season
      const getBestStatValue = (statId: number) => {
        const statObj = (bestSeason.stats as any)?.find((s: any) => s.id === statId);
        return statObj?.value || 0;
      };

      if (getBestStatValue(21) > 0) {
        // Goals Scored
        topScorers.push({ season, league });
      }
      if (getBestStatValue(22) > 0) {
        // Assists
        topAssists.push({ season, league });
      }
    }

    return { topAssists, topScorers };
  }

  private async generatePlayerHeatMap(playerId: number, tournamentId: number) {
    // Generate default heatmap points based on position
    // In a real implementation, this would fetch actual match data
    const defaultPoints: number[][] = [];

    // Create a basic heatmap pattern
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (Math.random() > 0.7) {
          // 30% coverage - format: [[x,y],[x,y]...] (no intensity value)
          defaultPoints.push([i / 10, j / 10]);
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
        PlayerLogo: "https://via.placeholder.com/50x50/cccccc/666666?text=P",
      });
    }

    return {
      shots: defaultShots,
      accuracy: Math.random() * 100,
    };
  }
}

