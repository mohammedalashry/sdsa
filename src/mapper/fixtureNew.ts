import { MatchInterface } from "@/db/mogodb/schemas/match.schema";
import {
  KorastatsMatchPlayersStats,
  KorastatsMatchFormation,
  KorastatsMatchTimeline,
  KorastatsMatchSummary,
  KorastatsMatchSquad,
  KorastatsMatchPossessionTimeline,
  KorastatsPlayerDetailedStats,
  KorastatsMatchVideo,
  KorastatsMatchPlayerHeatmapResponse,
} from "@/integrations/korastats/types/fixture.types";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { FixtureScore } from "@/modules/fixtures";
// Create a plain object type for mapping (without Mongoose Document properties)
export type MatchComprehensiveData = MatchInterface;

export class FixtureNew {
  private readonly korastatsClient: KorastatsService;
  constructor() {
    this.korastatsClient = new KorastatsService();
  }
  //==============================================
  matchMapper(
    matchPlayerStats: KorastatsMatchPlayersStats,
    matchSummary: KorastatsMatchSummary,
    matchSquad: KorastatsMatchSquad,
    matchTimeline: KorastatsMatchTimeline,
    matchFormationHome: KorastatsMatchFormation,
    matchFormationAway: KorastatsMatchFormation,
    matchPossessionTimeline: KorastatsMatchPossessionTimeline,
    matchVideo: KorastatsMatchVideo,
    topPerformers: MatchInterface["topPerformers"],
    heatmaps: MatchInterface["heatmaps"],
  ): MatchComprehensiveData {
    // Calculate referee cards from team stats
    const refereeRedCards =
      matchSummary.home.stats.Cards.Red + matchSummary.away.stats.Cards.Red;
    const refereeYellowCards =
      matchSummary.home.stats.Cards.Yellow + matchSummary.away.stats.Cards.Yellow;

    // Calculate possession from team stats
    const homePossession = matchSummary.home.stats.Possession.TimePercent.Average * 100;
    const awayPossession = matchSummary.away.stats.Possession.TimePercent.Average * 100;

    // Map timeline events
    const events = matchTimeline.timeline.map((event) => ({
      time: {
        elapsed: this.parseTimeToMinutes(event.time),
        extra: event.half > 2 ? this.parseTimeToMinutes(event.time) - 90 : null,
      },
      team: {
        id: event.team.id,
        name: event.team.name,
      },
      player: event.player
        ? {
            id: event.player.id,
            name: event.player.name,
          }
        : {
            id: 0,
            name: "Unknown Player",
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
    }));

    // Map lineups from squad and formation data
    const lineups = this.mapLineups(matchSquad, matchFormationHome, matchFormationAway);

    // Map team statistics
    const statistics = [
      {
        team: {
          id: matchSummary.home.team.id,
          name: matchSummary.home.team.name,
        },
        statistics: this.mapTeamStats(matchSummary.home.stats),
      },
      {
        team: {
          id: matchSummary.away.team.id,
          name: matchSummary.away.team.name,
        },
        statistics: this.mapTeamStats(matchSummary.away.stats),
      },
    ];

    // Map player stats
    const playersStats = matchPlayerStats.players.map((player) => ({
      player: {
        id: player.id,
        name: player.name,
        number: player.shirtnumber,
        statistics: {
          ...this.mapPlayerDetailedStats(player.stats),
          games: {
            ...this.mapPlayerDetailedStats(player.stats).games,
            number: player.shirtnumber,
            position: player.position?.name || "Unknown",
            rating: "0.0",
            captain: false,
          },
        },
      },
    }));

    // Top performers and heatmaps are now passed as parameters from syncer

    const result: MatchComprehensiveData = {
      // Korastats identifiers
      korastats_id: matchSummary.matchId,
      tournament_id: matchSquad.tournament_id,
      season: matchSummary.season,
      round: matchSummary.round,
      id: matchSummary.matchId,
      // Basic fixture data
      date: matchSummary.dateTime,
      timestamp: new Date(matchSummary.dateTime).getTime(),
      periods: {
        first: 45,
        second: 90, // Standard second half
      },
      venue: {
        id: matchSummary.stadium.id,
        name: matchSummary.stadium.name,
      },
      status: {
        long: "Match Finished", // Would need to determine from match state
        short: "FT",
        elapsed: 90,
      },

      // Referee information
      referee: {
        id: matchSummary.referee.id,
        name: matchSummary.referee.name,
        redCards: refereeRedCards,
        yellowCards: refereeYellowCards,
      },

      // League information
      league: {
        id: matchSquad.tournament_id,
        name: matchSummary.tournament,
        country: "Saudi Arabia", // Default country for Saudi leagues
        season: parseInt(matchSummary.season),
        round: matchSummary.round.toString(),
      },

      // Possession
      possession: {
        home: homePossession,
        away: awayPossession,
      },

      // Teams information
      teams: {
        home: {
          id: matchSummary.home.team.id,
          name: matchSummary.home.team.name,
          winner: matchSummary.score.home > matchSummary.score.away,
          coach: {
            id: matchSummary.home.coach?.id || 0,
            name: matchSummary.home.coach?.name || "Unknown Coach",
            redCards: matchSummary.home.stats.Cards.Red,
            yellowCards: matchSummary.home.stats.Cards.Yellow,
          },
        },
        away: {
          id: matchSummary.away.team.id,
          name: matchSummary.away.team.name,
          winner: matchSummary.score.away > matchSummary.score.home,
          coach: {
            id: matchSummary.away.coach?.id || 0,
            name: matchSummary.away.coach?.name || "Unknown Coach",
            redCards: matchSummary.away.stats.Cards.Red,
            yellowCards: matchSummary.away.stats.Cards.Yellow,
          },
        },
      },

      // Goals
      goals: {
        home: matchSummary.score.home,
        away: matchSummary.score.away,
      },

      // Score breakdown
      score: this.calculateScoreBreakdown(matchSummary),
      // Momentum (would need additional data)
      momentum: this.generateMomentum(matchPossessionTimeline, matchTimeline),

      // Predictions (would need additional data)
      predictions: {
        winner: {
          id:
            matchSummary.score.home > matchSummary.score.away
              ? matchSummary.home.team.id
              : matchSummary.away.team.id,
          name:
            matchSummary.score.home > matchSummary.score.away
              ? matchSummary.home.team.name
              : matchSummary.away.team.name,
          comment: null,
        },
        winOrDraw: false,
        underOver: null,
        goals: {
          home: null,
          away: null,
        },
        percent: {
          home: "0",
          draw: "0",
          away: "0",
        },
      },
      highlights: this.generateHighlights(matchVideo),
      heatmaps: heatmaps,
      // Events from timeline
      events,

      // Lineups from squad and formation
      lineups,

      // Statistics from team stats
      statistics,

      // Player stats
      playersStats,

      // Top performers
      topPerformers,

      // Additional data

      averageTeamRating: {
        home: Math.floor(Math.random() * 10) + 1,
        away: Math.floor(Math.random() * 10) + 1,
      },

      dataAvailable: {
        events: events.length > 0,
        stats: statistics.length > 0,
        formations: lineups.length > 0,
        playerStats: playersStats.length > 0,
        video: false,
      },

      // Sync tracking
      lastSynced: new Date(),
      syncVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return result;
  }

  // Helper methods
  private parseTimeToMinutes(timeString: string): number {
    const [minutes, seconds] = timeString.split(":").map(Number);
    return minutes + (seconds || 0) / 60;
  }

  private mapEventType(event: string): string {
    if (event.includes("Goal")) return "Goal";
    if (event.includes("Card")) return "Card";
    if (event.includes("Substitution")) return "Substitution";
    return "Other";
  }

  private mapLineups(
    squad: KorastatsMatchSquad,
    formationHome: KorastatsMatchFormation,
    formationAway: KorastatsMatchFormation,
  ) {
    const formationHtext = formationHome.lineupFormationName
      .split("1-")[1]
      .split("-")
      .map((item) => parseInt(item.trim()))
      .filter((item) => typeof item === "number" && item !== 0 && !isNaN(item))
      .join("-");
    const formationAText = formationAway.lineupFormationName
      .split("1-")[1]
      .split("-")
      .map((item) => parseInt(item.trim()))
      .filter((item) => typeof item === "number" && item !== 0 && !isNaN(item))
      .join("-");

    // Map home team lineup
    const homeLineup = {
      team: squad.home?.team
        ? {
            id: squad.home.team.id,
            name: squad.home.team.name,
            colors: {
              player: { primary: "", number: "", border: "" }, //would need team data
              goalkeeper: { primary: "", number: "", border: "" }, //would need team data
            },
          }
        : null,
      //formation is like this "1-523" we need to map it to "1-5-2-3"
      formation: formationHtext.split("").join("-"),
      startXI: squad.home.squad
        .filter((player) => player.lineup)
        .map((player) => ({
          player: {
            id: player.id,
            name: player.name,
            number: player.shirt_number,
            pos: player.position?.name || "Unknown",
            grid: "0-0", // Default grid position
          },
        })),
      substitutes: squad.home.squad
        .filter((player) => player.bench)
        .map((player) => ({
          player: {
            id: player.id,
            name: player.name,
            number: player.shirt_number,
            pos: player.position?.name || "Unknown",
            grid: null,
          },
        })),
      coach: {
        id: 0, // Would need coach data
        name: "Unknown Coach",
        photo: "https://via.placeholder.com/150x150?text=Coach",
      },
    };

    // Map away team lineup
    const awayLineup = {
      team: squad.away?.team
        ? {
            id: squad.away.team.id,
            name: squad.away.team.name,
            colors: {
              player: { primary: "", number: "", border: "" },
              goalkeeper: { primary: "", number: "", border: "" },
            },
          }
        : null,
      formation: formationAText.split("").join("-"),
      startXI: squad.away.squad
        .filter((player) => player.lineup)
        .map((player) => ({
          player: {
            id: player.id,
            name: player.name,
            number: player.shirt_number,
            pos: player.position?.name || "Unknown",
            grid: "0-0", // Default grid position
          },
        })),
      substitutes: squad.away.squad
        .filter((player) => player.bench)
        .map((player) => ({
          player: {
            id: player.id,
            name: player.name,
            number: player.shirt_number,
            pos: player.position?.name || "Unknown",
            grid: null,
          },
        })),
      coach: {
        id: 0, // Would need coach data
        name: "Unknown Coach",
        photo: "https://via.placeholder.com/150x150?text=Coach",
      },
    };

    return [homeLineup, awayLineup];
  }

  private mapTeamStats(stats: any) {
    return [
      { type: "Ball Possession", value: stats.Possession.TimePercent.Average },
      { type: "Total Shots", value: stats.Attempts.Total },
      { type: "Shots on Target", value: stats.Attempts.Success },
      { type: "Shots off Target", value: stats.Attempts.Total - stats.Attempts.Success },
      { type: "Blocked Shots", value: stats.Attempts.Blocked || 0 },
      { type: "Shots insidebox", value: stats.Attempts.AttemptToScore },
      {
        type: "Shots outsidebox",
        value: stats.Attempts.Total - stats.Attempts.AttemptToScore,
      },
      { type: "Fouls", value: stats.Fouls.Committed },
      { type: "Corner Kicks", value: stats.Admin.Corners },
      { type: "Offsides", value: stats.Admin.Offside },
      { type: "Yellow Cards", value: stats.Cards.Yellow },
      { type: "Red Cards", value: stats.Cards.Red },
      { type: "Goalkeeper Saves", value: stats.Defensive.GoalsSaved },
      { type: "Total passes", value: stats.Pass.Total },
      { type: "Passes accurate", value: stats.Pass.Success },
      { type: "Passes %", value: stats.Pass.Accuracy },
    ];
  }
  calculateScoreBreakdown(matchSummary: KorastatsMatchSummary): FixtureScore {
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
      console.error("⚠️ Error calculating score breakdown:", error);
      return {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 0, away: 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      };
    }
  }
  private mapPlayerDetailedStats(stats: KorastatsPlayerDetailedStats) {
    return {
      games: {
        appearences: stats.Admin.MatchesPlayed,
        lineups: stats.Admin.MatchesPlayed - stats.Admin.MatchesPlayedasSub,
        minutes: stats.Admin.MinutesPlayed,
        captain: false, // Would need additional data
      },
      substitutes: {
        in: stats.Admin.MatchesPlayerSubstitutedIn,
        out: stats.Admin.MatchesPlayedasSub,
        bench: 0, // Would need additional data
      },
      shots: {
        total: stats.Attempts.Total,
        on: stats.Attempts.Success,
      },
      goals: {
        total: stats.GoalsScored.Total,
        conceded: stats.GoalsConceded.Total,
        assists: stats.Chances.Assists,
        saves: stats.Defensive.GoalsSaved,
      },
      passes: {
        total: stats.Pass.Total,
        key: stats.Chances.KeyPasses,
        accuracy: stats.Pass.Accuracy,
      },
      tackles: {
        total: stats.BallWon.TackleWon,
        blocks: stats.Defensive.Blocks,
        interceptions: stats.BallWon.InterceptionWon,
      },
      duels: {
        total: stats.BallWon.Total + stats.BallLost.Total,
        won: stats.BallWon.Total,
      },
      dribbles: {
        attempts: stats.Dribble.Total,
        success: stats.Dribble.Success,
        past: stats.Dribble.Success,
      },
      fouls: {
        drawn: stats.Fouls.Awarded,
        committed: stats.Fouls.Committed,
      },
      cards: {
        yellow: stats.Cards.Yellow,
        yellowred: stats.Cards.SecondYellow,
        red: stats.Cards.Red,
      },
    };
  }

  private generateMomentum(
    possessionTimeline: KorastatsMatchPossessionTimeline,
    matchTimeline: KorastatsMatchTimeline,
  ): MatchInterface["momentum"] {
    const dataArray: any[] = [];
    const possionHomeArray = possessionTimeline.home.possession.map((item) => {
      return { time: item.period, possession: item.possession };
    });

    const possionPeriods = possionHomeArray.map((item) => {
      return {
        startTime: parseInt(item.time.split("-")[0]),
        endTime: Number(item.time.split("-")[1]),
        possession: item.possession,
      };
    });
    const timeBasedArray = Array.from({ length: 91 }, (_, i) =>
      i % 10 == 0 ? i : null,
    ).filter((item) => typeof item === "number");
    const matchTimelineArraySorted = matchTimeline.timeline.sort(
      (a, b) => Number(a.time.split(":")[0]) - Number(b.time.split(":")[0]),
    );
    // period is like this "00-15" we need to find the corresponding possession time
    timeBasedArray.forEach((time) => {
      let possesionHome = possionPeriods.find(
        (item) => item.startTime <= time && item.endTime >= time,
      );
      let homeEvent = null;
      let awayEvent = null;
      matchTimelineArraySorted.forEach((item) => {
        const itemTime = parseInt(item.time.split(":")[0]);
        if (itemTime >= time && itemTime < time + 10) {
          homeEvent =
            item.team.id === matchTimeline.home.id &&
            this.mapEventType(item.event) == "Goal"
              ? item.event
              : null;
          awayEvent =
            item.team.id === matchTimeline.away.id &&
            this.mapEventType(item.event) == "Goal"
              ? item.event
              : null;
        }
      });

      const result: MatchInterface["momentum"]["data"][0] = {
        time: time.toString(),
        homeEvent,
        awayEvent,
        homeMomentum: Math.floor(possesionHome.possession).toString().trim(),
        awayMomentum: (100 - Math.floor(possesionHome.possession)).toString().trim(),
      };
      dataArray.push(result);
    });
    const momentum: MatchInterface["momentum"] = {
      home: {
        id: matchTimeline.home.id,
        name: matchTimeline.home.name,
      },
      away: {
        id: matchTimeline.away.id,
        name: matchTimeline.away.name,
      },
      data: dataArray as any, // Cast to match the schema array type
    };
    return momentum;
  }
  private generateHighlights(matchVideo: KorastatsMatchVideo) {
    return {
      host: "S3",
      url: matchVideo.objMatch.arrHalves[0].arrStreams[0].arrQualities[0].strLink,
    };
  }
  private generateForm(possessionTimeline: KorastatsMatchPossessionTimeline) {
    // we need to generate the form for the match based on possession timeline but real not bad
    const form = {
      home: 0,
      away: 0,
    };
  }
}

