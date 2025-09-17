// src/mapper/fixtureNew.ts
import { MatchInterface } from "@/db/mogodb/schemas/match.schema";
import { MatchDetailsInterface } from "@/db/mogodb/schemas/matchDetails.schema";
import {
  KorastatsMatchPlayersStats,
  KorastatsMatchFormation,
  KorastatsMatchTimeline,
  KorastatsMatchSummary,
  KorastatsMatchSquad,
  KorastatsMatchVideo,
  KorastatsMatchListItem,
  KorastatsTournament,
  KorastatsPlayerMatchStats,
  KorastatsStandingsData,
  KorastatsTeamMatchStats,
} from "@/integrations/korastats/types";

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  LeagueLogoInfo,
  LeagueLogoService,
} from "@/integrations/korastats/services/league-logo.service";

export class FixtureNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // BASIC MATCH MAPPER (Match Schema)
  // Uses: MatchSummary + Tournament + MatchList
  // ===================================================================

  async mapToMatch(
    matchListItem: KorastatsMatchListItem,
    matchSummary: KorastatsMatchSummary, // Using Timeline as it has team data
    tournament: KorastatsTournament,
    StandingsData: KorastatsStandingsData,
  ): Promise<MatchInterface> {
    // Get league logo from LeagueLogoService
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournament.id);
    const standings = StandingsData.stages[0].groups[0].standings;
    const homeStandings = standings.find(
      (standing) => standing.teamID === matchListItem.home.id,
    );
    const awayStandings = standings.find(
      (standing) => standing.teamID === matchListItem.away.id,
    );
    // Get team logos using getImageUrl
    const [homeTeamLogo, awayTeamLogo] = await Promise.all([
      this.korastatsService.getImageUrl("club", matchListItem.home.id).catch(() => ""),
      this.korastatsService.getImageUrl("club", matchListItem.away.id).catch(() => ""),
    ]);

    return {
      // === IDENTIFIERS ===
      korastats_id: matchListItem.matchId,
      tournament_id: tournament.id,

      // === BASIC FIXTURE DATA ===
      fixture: {
        id: matchListItem.matchId,
        referee: matchListItem.referee?.name || null,
        timezone: "Asia/Riyadh", // Saudi timezone
        date: matchListItem.dateTime,
        timestamp: new Date(matchListItem.dateTime).getTime(),
        periods: {
          first: null, // Not available in match list
          second: null,
        },
        venue: {
          id: matchListItem.stadium?.id || null,
          name: matchListItem.stadium?.name || null,
          city: null, // Not available
        },
        status: this.mapMatchStatus(matchListItem.status?.status || "Unknown"),
      },

      // === LEAGUE INFO ===
      league: {
        id: tournament.id,
        name: leagueInfo?.name || tournament.tournament,
        country: tournament.organizer?.country?.name || "Saudi Arabia",
        logo: leagueInfo?.logo || "",
        flag: "https://media.api-sports.io/flags/sa.svg", // Saudi flag
        season: parseInt(tournament.season),
        round: matchListItem.round?.toString() || "Regular Season",
      },

      // === TEAMS WITH LOGOS ===
      teams: {
        home: {
          id: matchListItem.home.id,
          name: this.cleanTeamName(matchListItem.home.name),
          logo: homeTeamLogo,
          winner: this.determineWinner(matchListItem.score, "home"),
        },
        away: {
          id: matchListItem.away.id,
          name: this.cleanTeamName(matchListItem.away.name),
          logo: awayTeamLogo,
          winner: this.determineWinner(matchListItem.score, "away"),
        },
      },

      // === SCORES ===
      goals: {
        home: matchListItem.score?.home || null,
        away: matchListItem.score?.away || null,
      },
      score: this.mapDetailedScore(matchSummary),

      // === ADDITIONAL DATA ===
      tablePosition: {
        home: homeStandings?.rank || null,
        away: awayStandings?.rank || null,
      },
      averageTeamRating: {
        home: this.calculateTeamRating(matchSummary.home.stats),
        away: this.calculateTeamRating(matchSummary.away.stats),
      },

      // === METADATA ===
      dataAvailable: {
        events: matchListItem.status?.status === "Approved",
        stats: matchListItem.status?.status === "Approved",
        formations: matchListItem.status?.status === "Approved",
        playerStats: matchListItem.status?.status === "Approved",
        video: false, // Set by video sync process
      },
      lastSynced: new Date(),
      syncVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ===================================================================
  // DETAILED MATCH MAPPER (MatchDetails Schema)
  // Uses: ALL Korastats endpoints for comprehensive data
  // ===================================================================

  async mapToMatchDetails(
    matchId: number,
    tournamentId: number,
    matchTimeline: KorastatsMatchTimeline,
    matchSquad: KorastatsMatchSquad,
    matchPlayerStats: KorastatsMatchPlayersStats,
    matchFormationHome: KorastatsMatchFormation,
    matchFormationAway: KorastatsMatchFormation,
    matchVideo: KorastatsMatchVideo,
    matchSummary: KorastatsMatchSummary,
  ): Promise<MatchDetailsInterface> {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    return {
      // === IDENTIFIERS ===
      korastats_id: matchId,
      tournament_id: tournamentId,

      // === TIMELINE EVENTS ===
      timelineData: await this.mapTimelineEvents(matchTimeline),

      // === LINEUPS WITH PHOTOS ===
      lineupsData: await this.mapLineups(
        matchSquad,
        matchSummary,
        matchFormationHome,
        matchFormationAway,
      ),

      // === PLAYER STATISTICS WITH PHOTOS ===
      playerStatsData: await this.mapPlayerStats(matchPlayerStats),

      // === TEAM STATISTICS ===
      statisticsData: await this.mapTeamStatistics(matchSummary),

      injuriesData: null, // TODO: Add injuries data

      // === VIDEO DATA ===

      // === ADVANCED ANALYTICS (Calculated in mapper) ===
      heatmapsData: await this.collectTeamHeatmaps(matchId, matchSquad),
      predictionsData: null, // TODO: Add predictions data
      momentumData: await this.generateMomentum(matchTimeline),
      highlightsData: await this.generateHighlights(matchVideo),
      topPerformersData: await this.calculateTopPerformers(
        matchPlayerStats.players,
        matchSquad,
        leagueInfo,
      ),
      shotmapsData: null, // TODO: Add shotmaps data
      // === METADATA ===
      lastSynced: new Date(),
      syncVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private mapMatchStatus(status: string) {
    const statusMap: Record<string, { long: string; short: string }> = {
      Approved: { long: "Match Finished", short: "FT" },
      Live: { long: "Match In Progress", short: "LIVE" },
      Pending: { long: "Match Not Started", short: "NS" },
      Halftime: { long: "Match Halftime", short: "HT" },
      Cancelled: { long: "Match Cancelled", short: "CANC" },
      Postponed: { long: "Match Postponed", short: "POST" },
    };

    const mapped = statusMap[status] || { long: status, short: "NS" };

    return {
      long: mapped.long,
      short: mapped.short,
      elapsed: null, // Not available in match list
    };
  }

  private determineWinner(
    score: { home: number; away: number } | null,
    side: "home" | "away",
  ): boolean | null {
    if (!score) return null;

    const homeScore = score.home || 0;
    const awayScore = score.away || 0;

    if (homeScore === awayScore) return null; // Draw
    if (side === "home") return homeScore > awayScore;
    return awayScore > homeScore;
  }

  private mapDetailedScore(matchSummary: KorastatsMatchSummary) {
    if (!matchSummary) {
      return {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 0, away: 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      };
    }

    try {
      const homeGoals = matchSummary.home?.stats?.GoalsScored;
      const awayGoals = matchSummary.away?.stats?.GoalsScored;

      if (!homeGoals || !awayGoals) {
        return {
          halftime: { home: 0, away: 0 },
          fulltime: { home: 0, away: 0 },
          extratime: { home: 0, away: 0 },
          penalty: { home: 0, away: 0 },
        };
      }

      // Calculate goals by time periods
      const homeHalfTime =
        (homeGoals.T_0_15 || 0) + (homeGoals.T_15_30 || 0) + (homeGoals.T_30_45 || 0);
      const awayHalfTime =
        (awayGoals.T_0_15 || 0) + (awayGoals.T_15_30 || 0) + (awayGoals.T_30_45 || 0);

      const homeFullTime =
        (homeGoals.T_45_60 || 0) + (homeGoals.T_60_75 || 0) + (homeGoals.T_75_90 || 0);
      const awayFullTime =
        (awayGoals.T_45_60 || 0) + (awayGoals.T_60_75 || 0) + (awayGoals.T_75_90 || 0);

      const homeExtraTime = (homeGoals.T_90_105 || 0) + (homeGoals.T_105_120 || 0);
      const awayExtraTime = (awayGoals.T_90_105 || 0) + (awayGoals.T_105_120 || 0);

      const homePenalty = homeGoals.PenaltyScored || 0;
      const awayPenalty = awayGoals.PenaltyScored || 0;

      return {
        halftime: { home: homeHalfTime, away: awayHalfTime },
        fulltime: { home: homeFullTime, away: awayFullTime },
        extratime: { home: homeExtraTime, away: awayExtraTime },
        penalty: { home: homePenalty, away: awayPenalty },
      };
    } catch (error) {
      console.error("âš ï¸ Error calculating score breakdown:", error);
      return {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 0, away: 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      };
    }
  }

  private async mapTimelineEvents(matchTimeline: KorastatsMatchTimeline) {
    return await Promise.all(
      matchTimeline.timeline.map(async (event) => ({
        time: {
          elapsed: this.parseTimeToMinutes(event.time),
          extra: event.half > 2 ? this.parseTimeToMinutes(event.time) - 90 : null,
        },
        team: {
          id: event.team.id,
          name: event.team.name,
          logo: await this.korastatsService
            .getImageUrl("club", event.team.id)
            .catch(() => ""),
        },
        player: {
          id: event.player?.id || 0,
          name: event.player?.nickname || "Unknown Player",
        },
        assist: event.in
          ? {
              id: event.in.id,
              name: event.in.name,
            }
          : null,
        type: this.mapEventType(event.event),
        detail: event.event,
        comments: null,
      })),
    );
  }

  private async mapLineups(
    matchSquad: KorastatsMatchSquad,
    matchSummary: KorastatsMatchSummary,
    matchFormationHome: KorastatsMatchFormation,
    matchFormationAway: KorastatsMatchFormation,
  ) {
    console.log("MODA match squad", matchSquad);
    const matchSquads = [matchSquad.home.squad, matchSquad.away.squad];
    console.log("MODA match Squads", matchSquads);
    return await Promise.all(
      matchSquads.map(async (squad, index) => {
        // Get coach photo - coach info not available in squad
        const coachPhoto =
          index === 0
            ? await this.korastatsService.getImageUrl(
                "coach",
                matchSummary.home?.coach?.id,
              )
            : await this.korastatsService.getImageUrl(
                "coach",
                matchSummary.away?.coach?.id,
              );
        const formationHtext = matchFormationHome.lineupFormationName
          .split("1-")[1]
          .split("")
          .join("-");
        const formationAText = matchFormationAway.lineupFormationName
          .split("1-")[1]
          .split("")
          .join("-");
        // Filter starting lineup and substitutes
        const startingPlayers = squad.filter((p) => p.lineup) || [];
        const substitutePlayers = squad.filter((p) => p.bench) || [];

        // Get team info
        const teamId = index === 0 ? matchSquad.home.team.id : matchSquad.away.team.id;
        const teamName =
          index === 0 ? matchSquad.home.team.name : matchSquad.away.team.name;
        const teamLogo = await this.korastatsService
          .getImageUrl("club", teamId)
          .catch(() => "");

        // Get player photos for starting XI
        const startXIWithPhotos = await Promise.all(
          startingPlayers.map(async (player) => ({
            player: {
              id: player.id,
              name: player.nick_name,
              photo: await this.korastatsService
                .getImageUrl("player", player.id)
                .catch(() => ""),
              number: player.shirt_number,
              pos: player.position.name,
              grid: this.mapPositionToGrid(player.position.name),
              rating: "0.0", // Will be updated from player stats
            },
          })),
        );

        // Get player photos for substitutes
        const substitutesWithPhotos = await Promise.all(
          substitutePlayers.map(async (player) => ({
            player: {
              id: player.id,
              name: player.nick_name,
              photo: await this.korastatsService
                .getImageUrl("player", player.id)
                .catch(() => ""),
              number: player.shirt_number,
              pos: player.position.name,
              grid: this.mapPositionToGrid(player.position.name),
              rating: "0.0",
            },
          })),
        );

        return {
          team: {
            id: teamId,
            name: teamName,
            logo: teamLogo,
            colors: {
              player: {
                primary: "#FFFFFF",
                number: "#000000",
                border: "#CCCCCC",
              },
              goalkeeper: {
                primary: "#00FF00",
                number: "#000000",
                border: "#CCCCCC",
              },
            },
          },
          formation: index === 0 ? formationHtext : formationAText,
          coach: {
            id: index === 0 ? matchSummary.home?.coach?.id : matchSummary.away?.coach?.id,
            name:
              index === 0
                ? matchSummary.home?.coach?.name
                : matchSummary.away?.coach?.name,
            photo: coachPhoto,
          },
          startXI: startXIWithPhotos,
          substitutes: substitutesWithPhotos,
        };
      }),
    );
  }

  private async mapPlayerStats(matchPlayerStats: KorastatsMatchPlayersStats) {
    const teams = new Map();

    // Group players by team
    for (const player of matchPlayerStats.players) {
      const teamId = player.team?.id || 0;
      if (!teams.has(teamId)) {
        teams.set(teamId, {
          team: { id: teamId, name: player.team?.name || "Unknown Team" },
          players: [],
        });
      }

      const playerPhoto = await this.korastatsService
        .getImageUrl("player", player.id)
        .catch(() => "");

      teams.get(teamId).players.push({
        player: {
          id: player.id,
          name: player.name,
          photo: playerPhoto,
        },
        statistics: this.mapPlayerDetailedStats(player.stats),
      });
    }

    return Array.from(teams.values());
  }

  private async mapTeamStatistics(matchSummary: KorastatsMatchSummary) {
    // Get team logos for statistics
    const [homeTeamLogo, awayTeamLogo] = await Promise.all([
      this.korastatsService
        .getImageUrl("club", matchSummary.home?.team.id || 0)
        .catch(() => ""),
      this.korastatsService
        .getImageUrl("club", matchSummary.away?.team.id || 0)
        .catch(() => ""),
    ]);

    // Helper function to safely get stat values
    const getStat = (stats: any, path: string): number => {
      const keys = path.split(".");
      let value = stats;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined || value === null) return 0;
      }
      return typeof value === "number" ? value : 0;
    };

    // Helper function to calculate percentage
    const getPercentage = (part: number, total: number): string => {
      if (total === 0) return "0%";
      return `${Math.round((part / total) * 100)}%`;
    };

    const homeStats = matchSummary.home?.stats;
    const awayStats = matchSummary.away?.stats;

    // Comprehensive team statistics extraction
    return [
      {
        team: {
          id: matchSummary.home?.team.id || 0,
          name: matchSummary.home?.team.name || "Home Team",
          logo: homeTeamLogo,
        },
        statistics: [
          // Goals & Scoring
          { type: "Goals", value: getStat(homeStats, "GoalsScored.Total") },
          {
            type: "Penalty Goals",
            value: getStat(homeStats, "GoalsScored.PenaltyScored"),
          },
          { type: "Own Goals", value: getStat(homeStats, "GoalsScored.OwnGoals") },
          { type: "Goals Conceded", value: getStat(homeStats, "GoalsConceded.Total") },

          // Shooting
          { type: "Shots", value: getStat(homeStats, "Shots.Total") },
          { type: "Shots on Target", value: getStat(homeStats, "Shots.OnTarget") },
          {
            type: "Shot Accuracy",
            value: getPercentage(
              getStat(homeStats, "Shots.OnTarget"),
              getStat(homeStats, "Shots.Total"),
            ),
          },
          { type: "xG (Expected Goals)", value: getStat(homeStats, "GoalsScored.XG") },

          // Passing
          { type: "Passes", value: getStat(homeStats, "Pass.Total") },
          { type: "Pass Success", value: getStat(homeStats, "Pass.Success") },
          { type: "Pass Accuracy", value: `${getStat(homeStats, "Pass.Accuracy")}%` },
          { type: "Long Passes", value: getStat(homeStats, "LongPass.Total") },
          { type: "Long Pass Success", value: getStat(homeStats, "LongPass.Success") },
          {
            type: "Long Pass Accuracy",
            value: `${getStat(homeStats, "LongPass.Accuracy")}%`,
          },
          { type: "Short Passes", value: getStat(homeStats, "ShortPass.Total") },
          { type: "Short Pass Success", value: getStat(homeStats, "ShortPass.Success") },
          {
            type: "Short Pass Accuracy",
            value: `${getStat(homeStats, "ShortPass.Accuracy")}%`,
          },

          // Possession & Control
          {
            type: "Possession %",
            value: `${Math.round((getStat(homeStats, "Possession.TimePercent.Average") || 0) * 100)}%`,
          },
          { type: "Touches", value: getStat(homeStats, "Touches.Total") },
          { type: "Duels Won", value: getStat(homeStats, "Duels.Won") },
          { type: "Duels Total", value: getStat(homeStats, "Duels.Total") },
          {
            type: "Duel Success Rate",
            value: getPercentage(
              getStat(homeStats, "Duels.Won"),
              getStat(homeStats, "Duels.Total"),
            ),
          },

          // Attacking
          { type: "Attacks Total", value: getStat(homeStats, "Attacks.Total") },
          { type: "Dangerous Attacks", value: getStat(homeStats, "Attacks.Dangerous") },
          { type: "Assists", value: getStat(homeStats, "Assists.Total") },
          { type: "Chances Created", value: getStat(homeStats, "Chances.Created") },
          { type: "Corners", value: getStat(homeStats, "Corners.Total") },
          { type: "Crosses", value: getStat(homeStats, "Crosses.Total") },
          { type: "Cross Success", value: getStat(homeStats, "Crosses.Success") },
          {
            type: "Cross Accuracy",
            value: getPercentage(
              getStat(homeStats, "Crosses.Success"),
              getStat(homeStats, "Crosses.Total"),
            ),
          },

          // Defending
          { type: "Tackles", value: getStat(homeStats, "Tackles.Total") },
          { type: "Tackle Success", value: getStat(homeStats, "Tackles.Success") },
          {
            type: "Tackle Success Rate",
            value: getPercentage(
              getStat(homeStats, "Tackles.Success"),
              getStat(homeStats, "Tackles.Total"),
            ),
          },
          { type: "Interceptions", value: getStat(homeStats, "Interceptions.Total") },
          { type: "Blocks", value: getStat(homeStats, "Blocks.Total") },
          { type: "Clearances", value: getStat(homeStats, "Clearances.Total") },

          // Discipline
          { type: "Fouls", value: getStat(homeStats, "Fouls.Total") },
          { type: "Yellow Cards", value: getStat(homeStats, "Cards.Yellow") },
          { type: "Red Cards", value: getStat(homeStats, "Cards.Red") },
          { type: "Offsides", value: getStat(homeStats, "Offsides.Total") },

          // Goalkeeping
          { type: "Saves", value: getStat(homeStats, "GoalKeeper.Attempts.Saved") },
          {
            type: "Goals Conceded",
            value: getStat(homeStats, "GoalKeeper.GoalConceded"),
          },
          {
            type: "Save Success Rate",
            value: getPercentage(
              getStat(homeStats, "GoalKeeper.Attempts.Saved"),
              getStat(homeStats, "GoalKeeper.Attempts.Total"),
            ),
          },

          // Advanced Metrics
          { type: "xT (Expected Threat)", value: getStat(homeStats, "xT.Total") },
          { type: "xT Positive", value: getStat(homeStats, "xT.Positive_Total") },
          {
            type: "Distance Covered (km)",
            value: Math.round(getStat(homeStats, "Distance.Total") / 1000),
          },
          { type: "Sprint Distance (m)", value: getStat(homeStats, "Distance.Sprint") },
        ],
      },
      {
        team: {
          id: matchSummary.away?.team.id || 0,
          name: matchSummary.away?.team.name || "Away Team",
          logo: awayTeamLogo,
        },
        statistics: [
          // Goals & Scoring
          { type: "Goals", value: getStat(awayStats, "GoalsScored.Total") },
          {
            type: "Penalty Goals",
            value: getStat(awayStats, "GoalsScored.PenaltyScored"),
          },
          { type: "Own Goals", value: getStat(awayStats, "GoalsScored.OwnGoals") },
          { type: "Goals Conceded", value: getStat(awayStats, "GoalsConceded.Total") },

          // Shooting
          { type: "Shots", value: getStat(awayStats, "Shots.Total") },
          { type: "Shots on Target", value: getStat(awayStats, "Shots.OnTarget") },
          {
            type: "Shot Accuracy",
            value: getPercentage(
              getStat(awayStats, "Shots.OnTarget"),
              getStat(awayStats, "Shots.Total"),
            ),
          },
          { type: "xG (Expected Goals)", value: getStat(awayStats, "GoalsScored.XG") },

          // Passing
          { type: "Passes", value: getStat(awayStats, "Pass.Total") },
          { type: "Pass Success", value: getStat(awayStats, "Pass.Success") },
          { type: "Pass Accuracy", value: `${getStat(awayStats, "Pass.Accuracy")}%` },
          { type: "Long Passes", value: getStat(awayStats, "LongPass.Total") },
          { type: "Long Pass Success", value: getStat(awayStats, "LongPass.Success") },
          {
            type: "Long Pass Accuracy",
            value: `${getStat(awayStats, "LongPass.Accuracy")}%`,
          },
          { type: "Short Passes", value: getStat(awayStats, "ShortPass.Total") },
          { type: "Short Pass Success", value: getStat(awayStats, "ShortPass.Success") },
          {
            type: "Short Pass Accuracy",
            value: `${getStat(awayStats, "ShortPass.Accuracy")}%`,
          },

          // Possession & Control
          {
            type: "Possession %",
            value: `${Math.round((getStat(awayStats, "Possession.TimePercent.Average") || 0) * 100)}%`,
          },
          { type: "Touches", value: getStat(awayStats, "Touches.Total") },
          { type: "Duels Won", value: getStat(awayStats, "Duels.Won") },
          { type: "Duels Total", value: getStat(awayStats, "Duels.Total") },
          {
            type: "Duel Success Rate",
            value: getPercentage(
              getStat(awayStats, "Duels.Won"),
              getStat(awayStats, "Duels.Total"),
            ),
          },

          // Attacking
          { type: "Attacks Total", value: getStat(awayStats, "Attacks.Total") },
          { type: "Dangerous Attacks", value: getStat(awayStats, "Attacks.Dangerous") },
          { type: "Assists", value: getStat(awayStats, "Assists.Total") },
          { type: "Chances Created", value: getStat(awayStats, "Chances.Created") },
          { type: "Corners", value: getStat(awayStats, "Corners.Total") },
          { type: "Crosses", value: getStat(awayStats, "Crosses.Total") },
          { type: "Cross Success", value: getStat(awayStats, "Crosses.Success") },
          {
            type: "Cross Accuracy",
            value: getPercentage(
              getStat(awayStats, "Crosses.Success"),
              getStat(awayStats, "Crosses.Total"),
            ),
          },

          // Defending
          { type: "Tackles", value: getStat(awayStats, "Tackles.Total") },
          { type: "Tackle Success", value: getStat(awayStats, "Tackles.Success") },
          {
            type: "Tackle Success Rate",
            value: getPercentage(
              getStat(awayStats, "Tackles.Success"),
              getStat(awayStats, "Tackles.Total"),
            ),
          },
          { type: "Interceptions", value: getStat(awayStats, "Interceptions.Total") },
          { type: "Blocks", value: getStat(awayStats, "Blocks.Total") },
          { type: "Clearances", value: getStat(awayStats, "Clearances.Total") },

          // Discipline
          { type: "Fouls", value: getStat(awayStats, "Fouls.Total") },
          { type: "Yellow Cards", value: getStat(awayStats, "Cards.Yellow") },
          { type: "Red Cards", value: getStat(awayStats, "Cards.Red") },
          { type: "Offsides", value: getStat(awayStats, "Offsides.Total") },

          // Goalkeeping
          { type: "Saves", value: getStat(awayStats, "GoalKeeper.Attempts.Saved") },
          {
            type: "Goals Conceded",
            value: getStat(awayStats, "GoalKeeper.GoalConceded"),
          },
          {
            type: "Save Success Rate",
            value: getPercentage(
              getStat(awayStats, "GoalKeeper.Attempts.Saved"),
              getStat(awayStats, "GoalKeeper.Attempts.Total"),
            ),
          },

          // Advanced Metrics
          { type: "xT (Expected Threat)", value: getStat(awayStats, "xT.Total") },
          { type: "xT Positive", value: getStat(awayStats, "xT.Positive_Total") },
          {
            type: "Distance Covered (km)",
            value: Math.round(getStat(awayStats, "Distance.Total") / 1000),
          },
          { type: "Sprint Distance (m)", value: getStat(awayStats, "Distance.Sprint") },
        ],
      },
    ];
  }

  private mapPlayerDetailedStats(stats: any) {
    // Map team stats to player format
    return {
      games: {
        minutes: 90, // Default
        rating: 5.0, // Default
        substitute: false,
      },
      shots: {
        total: stats?.Shots?.Total || 0,
        on: stats?.Shots?.OnTarget || 0,
      },
      goals: {
        total: stats?.GoalsScored?.Total || 0,
        assists: stats?.Assists?.Total || 0,
      },
      passes: {
        total: stats?.Pass?.Total || 0,
        accuracy: `${Math.round(stats?.Pass?.Accuracy || 0)}%`,
      },
      tackles: {
        total: stats?.Tackles?.Total || 0,
        blocks: stats?.Blocks?.Total || 0,
        interceptions: stats?.Interceptions?.Total || 0,
      },
      duels: {
        total: stats?.Duels?.Total || 0,
        won: stats?.Duels?.Won || 0,
      },
      dribbles: {
        attempts: stats?.Dribbles?.Attempts || 0,
        success: stats?.Dribbles?.Success || 0,
      },
      fouls: {
        drawn: stats?.Fouls?.Drawn || 0,
        committed: stats?.Fouls?.Committed || 0,
      },
      cards: {
        yellow: stats?.Cards?.Yellow || 0,
        red: stats?.Cards?.Red || 0,
      },
    };
  }

  private parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)/);
    if (match) {
      return parseInt(match[1]) + Math.floor(parseInt(match[2]) / 60);
    }
    return parseInt(timeStr) || 0;
  }

  private mapEventType(korastatsEvent: string): string {
    const eventMap: Record<string, string> = {
      Goal: "Goal",
      "Yellow Card": "Card",
      "Red Card": "Card",
      Substitution: "Substitution",
      "Own Goal": "Goal",
      Penalty: "Goal",
    };
    return eventMap[korastatsEvent] || korastatsEvent;
  }

  private cleanTeamName(name: string): string {
    return name
      .replace(
        /\s+(FC|SC|U19|U21|U23|Club|United|City|Town|Athletic|Sporting|Football|Soccer|KSA)\s*$/i,
        "",
      )
      .trim();
  }

  private mapPositionToGrid(position: string): string {
    // Soccer position to grid mapping
    const positionGridMap: Record<string, string> = {
      GK: "1:1",
      CB: "2:1",
      LB: "2:2",
      RB: "2:3",
      DM: "3:1",
      CM: "3:2",
      AM: "3:3",
      RM: "3:5",
      LW: "4:1",
      RW: "4:2",
      CF: "4:3",
    };
    return positionGridMap[position] || "3:2";
  }

  // ===================================================================
  // ADVANCED ANALYTICS METHODS
  // ===================================================================

  /**
   * Calculate top performers for a match
   * Soccer Analytics: Find best scorer, assister, and keeper per team
   */
  private async calculateTopPerformers(
    playersStats: KorastatsPlayerMatchStats[],
    matchSquad: KorastatsMatchSquad,
    leagueInfo: LeagueLogoInfo,
  ) {
    // Get player IDs for each team from squad data
    const homeSquad = matchSquad.home.squad;
    const awaySquad = matchSquad.away.squad;

    const homePlayerIds = new Set(homeSquad?.map((player) => player.id) || []);
    const awayPlayerIds = new Set(awaySquad?.map((player) => player.id) || []);

    // Separate players by team
    const homePlayers = playersStats.filter((player) => homePlayerIds.has(player.id));
    const awayPlayers = playersStats.filter((player) => awayPlayerIds.has(player.id));

    if (homePlayers.length === 0 || awayPlayers.length === 0) {
      return null; // Not enough data
    }

    // Find top scorer for each team
    const homeTopScorer = homePlayers.reduce(
      (max, player) =>
        (player.stats?.GoalsScored?.Total || 0) > (max.stats?.GoalsScored?.Total || 0)
          ? player
          : max,
      homePlayers[0],
    );

    const awayTopScorer = awayPlayers.reduce(
      (max, player) =>
        (player.stats?.GoalsScored?.Total || 0) > (max.stats?.GoalsScored?.Total || 0)
          ? player
          : max,
      awayPlayers[0],
    );

    // Find top assister for each team - using Assists from stats
    const homeTopAssister = homePlayers.reduce(
      (max, player) =>
        (player.stats?.Chances?.Assists || 0) > (max.stats?.Chances?.Assists || 0)
          ? player
          : max,
      homePlayers[0],
    );

    const awayTopAssister = awayPlayers.reduce(
      (max, player) =>
        (player.stats?.Chances?.Assists || 0) > (max.stats?.Chances?.Assists || 0)
          ? player
          : max,
      awayPlayers[0],
    );

    // Find top keeper (most saves) for each team
    const homeTopKeeper = homePlayers.reduce(
      (max, player) =>
        (player.stats?.Defensive?.GoalsSaved || 0) >
        (max.stats?.Defensive?.GoalsSaved || 0)
          ? player
          : max,
      homePlayers[0],
    );

    const awayTopKeeper = awayPlayers.reduce(
      (max, player) =>
        (player.stats?.Defensive?.GoalsSaved || 0) >
        (max.stats?.Defensive?.GoalsSaved || 0)
          ? player
          : max,
      awayPlayers[0],
    );

    // Get player photos
    const [
      homeScorerPhoto,
      awayScorerPhoto,
      homeAssisterPhoto,
      awayAssisterPhoto,
      homeKeeperPhoto,
      awayKeeperPhoto,
    ] = await Promise.all([
      this.korastatsService.getImageUrl("player", homeTopScorer.id).catch(() => ""),
      this.korastatsService.getImageUrl("player", awayTopScorer.id).catch(() => ""),
      this.korastatsService.getImageUrl("player", homeTopAssister.id).catch(() => ""),
      this.korastatsService.getImageUrl("player", awayTopAssister.id).catch(() => ""),
      this.korastatsService.getImageUrl("player", homeTopKeeper.id).catch(() => ""),
      this.korastatsService.getImageUrl("player", awayTopKeeper.id).catch(() => ""),
    ]);

    // Get team info for response structure
    const homeTeam = matchSquad?.home?.team;
    const awayTeam = matchSquad?.away?.team;
    const homeTeamLogo = await this.korastatsService
      .getImageUrl("club", homeTeam?.id || 0)
      .catch(() => "");
    const awayTeamLogo = await this.korastatsService
      .getImageUrl("club", awayTeam?.id || 0)
      .catch(() => "");

    return {
      league: {
        name: leagueInfo.name,
        logo: leagueInfo.logo,
        season: new Date().getFullYear(),
      },
      homeTeam: {
        id: homeTeam?.id || 0,
        name: homeTeam?.name || "Home Team",
        logo: homeTeamLogo,
        winner: null,
      },
      awayTeam: {
        id: awayTeam?.id || 0,
        name: awayTeam?.name || "Away Team",
        logo: awayTeamLogo,
        winner: null,
      },
      topScorer: {
        homePlayer: {
          id: homeTopScorer.id,
          name: homeTopScorer.nickname,
          photo: homeScorerPhoto,
        },
        awayPlayer: {
          id: awayTopScorer.id,
          name: awayTopScorer.nickname,
          photo: awayScorerPhoto,
        },
        stats: [
          {
            name: "Goals",
            home: homeTopScorer.stats?.GoalsScored?.Total || 0,
            away: awayTopScorer.stats?.GoalsScored?.Total || 0,
          },
          {
            name: "Assists",
            home: homeTopScorer.stats?.Chances?.Assists || 0,
            away: awayTopScorer.stats?.Chances?.Assists || 0,
          },
          {
            name: "Minutes Played",
            home: 90, // Default
            away: 90, // Default
          },
        ],
      },
      topAssister: {
        homePlayer: {
          id: homeTopAssister.id,
          name: homeTopAssister.nickname,
          photo: homeAssisterPhoto,
        },
        awayPlayer: {
          id: awayTopAssister.id,
          name: awayTopAssister.nickname,
          photo: awayAssisterPhoto,
        },
        stats: [
          {
            name: "Assists",
            home: homeTopAssister.stats?.Chances?.Assists || 0,
            away: awayTopAssister.stats?.Chances?.Assists || 0,
          },
          {
            name: "Minutes Played",
            home: 90,
            away: 90,
          },
        ],
      },
      topKeeper: {
        homePlayer: {
          id: homeTopKeeper.id,
          name: homeTopKeeper.nickname,
          photo: homeKeeperPhoto,
        },
        awayPlayer: {
          id: awayTopKeeper.id,
          name: awayTopKeeper.nickname,
          photo: awayKeeperPhoto,
        },
        stats: [
          {
            name: "Goals Saved",
            home: homeTopKeeper.stats?.Defensive?.GoalsSaved || 0,
            away: awayTopKeeper.stats?.Defensive?.GoalsSaved || 0,
          },
        ],
      },
    };
  }

  /**
   * Collect player heatmaps for top performers
   * Soccer Analytics: Field position visualization with coordinate normalization
   */
  private async collectTeamHeatmaps(
    matchId: number,
    matchSquad: KorastatsMatchSquad,
  ): Promise<any[]> {
    const fieldWidth = 5069;
    const fieldHeight = 3290;

    try {
      // Get both teams' squads
      const homeSquad = matchSquad.home.squad;
      const awaySquad = matchSquad.away.squad;

      if (!homeSquad || !awaySquad) {
        return [];
      }

      // Get all player IDs for both teams
      const homePlayers = homeSquad || [];
      const awayPlayers = awaySquad || [];

      // Collect heatmaps for all home players
      const homeHeatmaps = await Promise.all(
        homePlayers.slice(0, 11).map(async (player) => {
          // Limit to starting 11 for performance
          try {
            const heatmapResponse = await this.korastatsService.getMatchPlayerHeatmap(
              matchId,
              player.id,
            );
            return {
              playerId: player.id,
              data: heatmapResponse.result === "Success" ? heatmapResponse.data : [],
            };
          } catch (error) {
            return { playerId: player.id, data: [] };
          }
        }),
      );

      // Collect heatmaps for all away players
      const awayHeatmaps = await Promise.all(
        awayPlayers.slice(0, 11).map(async (player) => {
          // Limit to starting 11 for performance
          try {
            const heatmapResponse = await this.korastatsService.getMatchPlayerHeatmap(
              matchId,
              player.id,
            );
            return {
              playerId: player.id,
              data: heatmapResponse.result === "Success" ? heatmapResponse.data : [],
            };
          } catch (error) {
            return { playerId: player.id, data: [] };
          }
        }),
      );

      // Aggregate home team heatmap points
      const homePoints = this.aggregateTeamHeatmap(homeHeatmaps, fieldWidth, fieldHeight);

      // Aggregate away team heatmap points
      const awayPoints = this.aggregateTeamHeatmap(awayHeatmaps, fieldWidth, fieldHeight);

      // Get team logos
      const [homeTeamLogo, awayTeamLogo] = await Promise.all([
        this.korastatsService
          .getImageUrl("club", matchSquad.home?.team.id || 0)
          .catch(() => ""),
        this.korastatsService
          .getImageUrl("club", matchSquad.away?.team.id || 0)
          .catch(() => ""),
      ]);

      return [
        {
          team: {
            id: matchSquad.home?.team.id || 0,
            name: matchSquad.home?.team.name || "Home Team",
            logo: homeTeamLogo,
          },
          heatmap: { points: homePoints },
        },
        {
          team: {
            id: matchSquad.away?.team.id || 0,
            name: matchSquad.away?.team.name || "Away Team",
            logo: awayTeamLogo,
          },
          heatmap: { points: awayPoints },
        },
      ];
    } catch (error) {
      console.warn(`⚠️ Failed to collect team heatmaps:`, error);
      return [];
    }
  }
  /**
   * Aggregate multiple player heatmaps into a single team heatmap
   * Creates heat zones across the field by combining all player positions
   */
  private aggregateTeamHeatmap(
    playerHeatmaps: any[],
    fieldWidth: number,
    fieldHeight: number,
  ): number[][] {
    const heatmapGrid: Map<string, number> = new Map();
    const gridSize = 10; // Divide field into 10x10 meter grid squares

    // Process each player's heatmap
    for (const playerHeatmap of playerHeatmaps) {
      if (!playerHeatmap.data || playerHeatmap.data.length === 0) continue;

      // Process each heat point from this player
      for (const point of playerHeatmap.data) {
        // Normalize coordinates
        const normalizedX = point.x / fieldWidth;
        const normalizedY = point.y / fieldHeight;

        // Create grid key (quantize to grid squares)
        const gridX = Math.floor(normalizedX * gridSize) / gridSize;
        const gridY = Math.floor(normalizedY * gridSize) / gridSize;
        const gridKey = `${gridX},${gridY}`;

        // Accumulate heat intensity at this grid position
        const currentHeat = heatmapGrid.get(gridKey) || 0;
        heatmapGrid.set(gridKey, currentHeat + (point.count || 1));
      }
    }

    // Convert grid map to points array with intensity
    const aggregatedPoints: number[][] = [];

    for (const [gridKey, intensity] of heatmapGrid.entries()) {
      const [x, y] = gridKey.split(",").map(Number);

      // Create multiple points for higher intensity areas (like the original implementation)
      const pointCount = Math.min(intensity, 20); // Cap at 20 points per grid square
      for (let i = 0; i < pointCount; i++) {
        // Add slight randomization within the grid square for more realistic distribution
        const randomOffsetX = (Math.random() - 0.5) * (1 / gridSize);
        const randomOffsetY = (Math.random() - 0.5) * (1 / gridSize);

        aggregatedPoints.push([
          Math.max(0, Math.min(1, x + randomOffsetX)),
          Math.max(0, Math.min(1, y + randomOffsetY)),
          intensity,
        ]);
      }
    }

    return aggregatedPoints;
  }
  /**
   * Generate momentum data from match timeline
   * Soccer Analytics: Track momentum shifts throughout the match
   */
  private async generateMomentum(matchTimeline: KorastatsMatchTimeline): Promise<any> {
    if (!matchTimeline?.timeline) {
      return {
        data: [],
        home: { id: 0, name: "Home Team", logo: "", winner: null },
        away: { id: 0, name: "Away Team", logo: "", winner: null },
      };
    }

    // Get team logos for momentum response
    const [homeTeamLogo, awayTeamLogo] = await Promise.all([
      this.korastatsService
        .getImageUrl("club", matchTimeline.home?.id || 0)
        .catch(() => ""),
      this.korastatsService
        .getImageUrl("club", matchTimeline.away?.id || 0)
        .catch(() => ""),
    ]);

    const momentumData = [];
    let homeMomentum = 50; // Start neutral
    let awayMomentum = 50;

    // Create time-based intervals (every 10 minutes)
    const timeIntervals = [];
    for (let time = 0; time <= 90; time += 10) {
      timeIntervals.push(time);
    }

    // Analyze events to calculate momentum shifts
    const sortedEvents = matchTimeline.timeline.sort(
      (a, b) => this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time),
    );

    // Process each time interval
    for (const intervalTime of timeIntervals) {
      let homeEvent: string | null = null;
      let awayEvent: string | null = null;

      // Find events in this time interval
      const intervalEvents = sortedEvents.filter((event) => {
        const eventTime = this.parseTimeToMinutes(event.time);
        return eventTime >= intervalTime && eventTime < intervalTime + 10;
      });

      // Apply momentum changes for events in this interval
      for (const event of intervalEvents) {
        let homeShift = 0;
        let awayShift = 0;

        // Soccer momentum analysis based on event types
        switch (event.event) {
          case "Goal Scored":
          case "Goal":
            // Goals create significant momentum shifts
            if (event.team?.id === matchTimeline.home?.id) {
              homeShift = +15;
              awayShift = -10;
              homeEvent = event.event;
            } else {
              awayShift = +15;
              homeShift = -10;
              awayEvent = event.event;
            }
            break;

          case "Yellow Card":
            // Cards create negative momentum for the team
            if (event.team?.id === matchTimeline.home?.id) {
              homeShift = -5;
              awayShift = +3;
              homeEvent = event.event;
            } else {
              awayShift = -5;
              homeShift = +3;
              awayEvent = event.event;
            }
            break;

          case "Red Card":
            // Red cards create major momentum shifts
            if (event.team?.id === matchTimeline.home?.id) {
              homeShift = -20;
              awayShift = +15;
              homeEvent = event.event;
            } else {
              awayShift = -20;
              homeShift = +15;
              awayEvent = event.event;
            }
            break;

          case "Substitution":
            // Substitutions can indicate tactical momentum
            if (event.team?.id === matchTimeline.home?.id) {
              homeShift = +2;
              homeEvent = event.event;
            } else {
              awayShift = +2;
              awayEvent = event.event;
            }
            break;
        }

        // Apply momentum shifts with bounds checking
        homeMomentum = Math.max(0, Math.min(100, homeMomentum + homeShift));
        awayMomentum = Math.max(0, Math.min(100, awayMomentum + awayShift));
      }

      // Add momentum data point for this time interval
      momentumData.push({
        time: intervalTime.toString(),
        homeEvent,
        awayEvent,
        homeMomentum: homeMomentum.toString(),
        awayMomentum: awayMomentum.toString(),
      });
    }

    return {
      data: momentumData,
      home: {
        id: matchTimeline.home?.id || 0,
        name: matchTimeline.home?.name || "Home Team",
        logo: homeTeamLogo,
        winner: null,
      },
      away: {
        id: matchTimeline.away?.id || 0,
        name: matchTimeline.away?.name || "Away Team",
        logo: awayTeamLogo,
        winner: null,
      },
    };
  }

  /**
   * Generate match highlights information
   * Currently returns default Saudi Sports Company channel
   */
  private generateHighlights(matchVideo: KorastatsMatchVideo) {
    return {
      host: "S3",
      url: matchVideo.objMatch.arrHalves[0].arrStreams[0].arrQualities[0].strLink,
    };
  }

  private calculateTeamRating(teamStats: KorastatsTeamMatchStats): number {
    // Soccer analytics: Calculate team rating based on performance metrics
    const possessionWeight = 0.2;
    const shotsWeight = 0.3;
    const accuracyWeight = 0.25;
    const disciplineWeight = 0.25;

    const possession = teamStats.Possession?.TimePercent?.Average || 0.5;
    const shotsRatio = Math.min(
      (teamStats.Attempts?.Success || 0) / Math.max(teamStats.Attempts?.Success || 1, 1),
      1,
    );
    const accuracy =
      (teamStats.Pass?.Accuracy || 0) / Math.max(teamStats.Pass?.Accuracy || 1, 1);
    const discipline = Math.max(
      0,
      1 - ((teamStats.Cards?.Red || 0) * 0.3 + (teamStats.Cards?.Yellow || 0) * 0.1),
    );

    const rating =
      (possession * possessionWeight +
        shotsRatio * shotsWeight +
        accuracy * accuracyWeight +
        discipline * disciplineWeight) *
      10;

    return Math.round(rating * 10) / 10; // Round to 1 decimal
  }
}

