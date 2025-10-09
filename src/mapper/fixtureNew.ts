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
  KorastatsPlayerDetailedStats,
  KorastatsMatchPossessionTimeline,
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
    const matchTimestamp = new Date(matchListItem.dateTime).getTime();
    // if match in future data set zeros for all elapsed and periods
    const firstHalf =
      matchTimestamp > new Date().getTime() ? 0 : 45 + Math.floor(Math.random() * 3);
    const secondHalf =
      matchTimestamp > new Date().getTime() ? 0 : 45 + Math.floor(Math.random() * 3);
    return {
      // === IDENTIFIERS ===
      korastats_id: matchListItem.matchId,
      tournament_id: leagueInfo?.id || 0,

      // === BASIC FIXTURE DATA ===
      fixture: {
        id: matchListItem.matchId,
        referee: matchListItem.referee?.name || null,
        timezone: "Asia/Riyadh", // Saudi timezone
        date: matchListItem.dateTime,
        timestamp: new Date(matchListItem.dateTime).getTime(),
        periods: {
          first: firstHalf * 60 * 1000,
          second: secondHalf * 60 * 1000,
        },
        venue: {
          id: matchListItem.stadium?.id || null,
          name: matchListItem.stadium?.name || null,
          city: null, // Not available
        },
        status: this.mapMatchStatus(
          matchListItem.status?.status || "Unknown",
          firstHalf,
          secondHalf,
        ),
      },

      // === LEAGUE INFO ===
      league: {
        id: leagueInfo?.id || 0,
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
          name: this.cleanTeamName(matchListItem?.home?.name),
          logo: homeTeamLogo,
          winner: this.determineWinner(matchListItem.score, "home"),
        },
        away: {
          id: matchListItem.away.id,
          name: this.cleanTeamName(matchListItem?.away?.name),
          logo: awayTeamLogo,
          winner: this.determineWinner(matchListItem.score, "away"),
        },
      },

      // === SCORES ===
      goals: {
        home: matchListItem.score?.home || 0,
        away: matchListItem.score?.away || 0,
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
    matchTimeline: KorastatsMatchTimeline | null,
    matchSquad: KorastatsMatchSquad | null,
    matchPlayerStats: KorastatsMatchPlayersStats | null,
    matchFormationHome: KorastatsMatchFormation | null,
    matchFormationAway: KorastatsMatchFormation | null,
    matchVideo: KorastatsMatchVideo | null,
    matchSummary: KorastatsMatchSummary | null,
    matchPossession: KorastatsMatchPossessionTimeline | null,
    dataAvailable: boolean = true,
  ): Promise<MatchDetailsInterface> {
    // If data is not available, construct default Korastats-shaped objects
    if (!dataAvailable) {
      const defaults = await this.buildDefaultKorastatsData(matchId, tournamentId, {
        timeline: matchTimeline,
        squad: matchSquad,
        playerStats: matchPlayerStats,
        formationHome: matchFormationHome,
        formationAway: matchFormationAway,
        video: matchVideo,
        summary: matchSummary,
        possession: matchPossession,
      });
      matchTimeline = defaults.timeline;
      matchSquad = defaults.squad;
      matchPlayerStats = defaults.playerStats;
      matchFormationHome = defaults.formationHome;
      matchFormationAway = defaults.formationAway;
      matchVideo = defaults.video;
      matchSummary = defaults.summary;
      matchPossession = defaults.possession;
    }

    // Normalize top-level/nullish structures to safe defaults and use normalized types
    const normalized = this.normalizeKorastatsInputs({
      matchTimeline,
      matchSquad,
      matchPlayerStats,
      matchFormationHome,
      matchFormationAway,
      matchVideo,
      matchSummary,
      matchPossession,
    });
    matchTimeline = normalized.matchTimeline;
    matchSquad = normalized.matchSquad;
    matchPlayerStats = normalized.matchPlayerStats;
    matchFormationHome = normalized.matchFormationHome;
    matchFormationAway = normalized.matchFormationAway;
    matchVideo = normalized.matchVideo;
    matchSummary = normalized.matchSummary;
    matchPossession = normalized.matchPossession;
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    return {
      // === IDENTIFIERS ===
      korastats_id: matchId,
      tournament_id: leagueInfo?.id || 0,

      // === TIMELINE EVENTS ===
      timelineData: await this.mapTimelineEvents(matchTimeline),

      // === LINEUPS WITH PHOTOS ===
      lineupsData: await this.mapLineups(
        matchSquad,
        matchSummary,
        matchFormationHome,
        matchFormationAway,
        matchPlayerStats,
      ),

      // === PLAYER STATISTICS WITH PHOTOS ===
      playerStatsData: await this.mapPlayerStats(matchPlayerStats),

      // === TEAM STATISTICS ===
      statisticsData: (await this.mapTeamStatistics(matchSummary)) as any,

      injuriesData: null, // TODO: Add injuries data

      // === VIDEO DATA ===

      // === ADVANCED ANALYTICS (Calculated in mapper) ===
      heatmapsData: await this.collectTeamHeatmaps(matchId, matchSquad, matchSummary),
      predictionsData: null, // TODO: Add predictions data
      momentumData: await this.generateMomentum(matchTimeline, matchPossession),
      highlightsData: await this.generateHighlights(matchVideo),
      topPerformersData: await this.calculateTopPerformers(
        matchPlayerStats.players,
        matchSquad,
        leagueInfo,
        matchSummary,
      ),
      shotmapsData: null, // TODO: Add shotmaps data
      // === METADATA ===
      lastSynced: new Date(),
      syncVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async buildDefaultKorastatsData(
    matchId: number,
    tournamentId: number,
    existing: {
      timeline: KorastatsMatchTimeline | null;
      squad: KorastatsMatchSquad | null;
      playerStats: KorastatsMatchPlayersStats | null;
      formationHome: KorastatsMatchFormation | null;
      formationAway: KorastatsMatchFormation | null;
      video: KorastatsMatchVideo | null;
      summary: KorastatsMatchSummary | null;
      possession: KorastatsMatchPossessionTimeline | null;
    },
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    const safeTeam = { _type: "TEAM" as const, id: 0, name: "Unknown Team" };

    const timeline: KorastatsMatchTimeline = existing.timeline ?? {
      _type: "MATCH_SUMMARY",
      matchId,
      tournament: leagueInfo?.name || "",
      seasonId: 0,
      season: "",
      round: 0,
      home: { ...safeTeam },
      away: { ...safeTeam },
      score: { home: 0, away: 0 },
      dateTime: new Date().toISOString(),
      dtLastUpdateDateTime: new Date().toISOString(),
      stadium: { _type: "STADIUM", id: 0, name: "" },
      referee: {
        _type: "REFEREE",
        id: 0,
        name: "",
        dob: "",
        nationality: { _type: "NATIONALITY", id: 0, name: "" },
      },
      assistant1: {
        _type: "ASSISTANT RFFEREE",
        id: 0,
        name: "",
        dob: "",
        gender: "",
        nationality: { _type: "NATIONALITY", id: 0, name: "" },
      },
      assistant2: {
        _type: "ASSISTANT RFFEREE",
        id: 0,
        name: "",
        dob: null,
        gender: "",
        nationality: null,
      },
      timeline: [],
    };

    const summary: KorastatsMatchSummary = existing.summary ?? {
      _type: "MATCH SUMMARY",
      matchId,
      tournament: leagueInfo?.name || "",
      season: "",
      round: 0,
      dateTime: new Date().toISOString(),
      lastUpdateDateTime: new Date().toISOString(),
      stadium: { _type: "STADIUM", id: 0, name: "" },
      referee: {
        _type: "REFEREE",
        id: 0,
        name: "",
        dob: "",
        nationality: { _type: "NATIONALITY", id: 0, name: "" },
      },
      assistant1: {
        _type: "ASSISTANT RFFEREE",
        id: 0,
        name: "",
        dob: "",
        gender: "",
        nationality: { _type: "NATIONALITY", id: 0, name: "" },
      },
      assistant2: {
        _type: "ASSISTANT RFFEREE",
        id: 0,
        name: "",
        dob: null,
        gender: "",
        nationality: null,
      },
      score: { home: 0, away: 0 },
      home: {
        _type: "TEAM SUMMARY",
        team: { _type: "TEAM", id: 0, name: "Home Team" },
        coach: {
          _type: "COACH",
          id: 0,
          name: "",
          dob: "",
          gender: "",
          nationality: { _type: "NATIONALITY", id: 0, name: "" },
        },
        stats: {} as any,
      },
      away: {
        _type: "TEAM SUMMARY",
        team: { _type: "TEAM", id: 0, name: "Away Team" },
        coach: {
          _type: "COACH",
          id: 0,
          name: "",
          dob: "",
          gender: "",
          nationality: { _type: "NATIONALITY", id: 0, name: "" },
        },
        stats: {} as any,
      },
    };

    const squad: KorastatsMatchSquad =
      existing.squad ??
      ({
        _type: "MATCH LINEUP",
        matchId,
        home: { team: { _type: "TEAM", id: 0, name: "Home Team" }, squad: [] },
        away: { team: { _type: "TEAM", id: 0, name: "Away Team" }, squad: [] },
      } as any);

    const playerStats: KorastatsMatchPlayersStats =
      existing.playerStats ?? ({ players: [] } as any);

    const formationHome: KorastatsMatchFormation =
      existing.formationHome ??
      ({ lineupFormationName: "1-4-4-2", lineupFormation: [] } as any);

    const formationAway: KorastatsMatchFormation =
      existing.formationAway ??
      ({ lineupFormationName: "1-4-4-2", lineupFormation: [] } as any);

    const video: KorastatsMatchVideo =
      existing.video ??
      ({
        objMatch: { arrHalves: [{ arrStreams: [{ arrQualities: [{ strLink: "" }] }] }] },
      } as any);

    const possession: KorastatsMatchPossessionTimeline =
      existing.possession ??
      ({ home: { possession: [] }, away: { possession: [] } } as any);

    return {
      timeline,
      squad,
      playerStats,
      formationHome,
      formationAway,
      video,
      summary,
      possession,
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private mapMatchStatus(status: string, firstHalf: number, secondHalf: number) {
    const statusMap: Record<string, { long: string; short: string }> = {
      Approved: { long: "Match Finished", short: "FT" },
      Live: { long: "Match In Progress", short: "LIVE" },
      Pending: { long: "Match Not Started", short: "NS" },
      Halftime: { long: "Match Halftime", short: "HT" },
      Cancelled: { long: "Match Cancelled", short: "CANC" },
      Postponed: { long: "Match Postponed", short: "POST" },
    };

    const mapped = statusMap[status];
    if (!mapped) {
      if (firstHalf + secondHalf === 0) {
        return {
          long: "Match Not Started",
          short: "NS",
          elapsed: 0,
        };
      }
      if (firstHalf + secondHalf <= 90) {
        return {
          long: "Match In Progress",
          short: "LIVE",
          elapsed: firstHalf + secondHalf,
        };
      }
      if (firstHalf + secondHalf > 90) {
        return {
          long: "Match In Progress",
          short: "LIVE",
          elapsed: firstHalf + secondHalf,
        };
      }
    }
    return {
      long: mapped.long,
      short: mapped.short,
      elapsed: firstHalf + secondHalf,
    };
  }

  private determineWinner(
    score: { home: number; away: number } | null,
    side: "home" | "away",
  ): boolean | false {
    if (!score) return false;

    const homeScore = score.home || 0;
    const awayScore = score.away || 0;

    if (homeScore === awayScore) return false; // Draw
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
    const firstHallastEventTime =
      matchTimeline.timeline
        .filter((event) => event.half === 1)
        .sort(
          (a, b) => Number(b?.time?.split(":")[0]) - Number(a?.time?.split(":")[0]),
        )[0]
        ?.time?.split(":")[0] || "0";
    console.log("MODA firstHallastEventTime", firstHallastEventTime);
    return (
      await Promise.all(
        matchTimeline.timeline.map(async (event) => ({
          time: {
            elapsed: this.parseTimeToMinutes(
              event.time,
              event.half,
              parseInt(firstHallastEventTime),
            ),
            extra:
              event.half > 2
                ? this.parseTimeToMinutes(
                    event.time,
                    event.half,
                    parseInt(firstHallastEventTime),
                  ) - 90
                : null,
          },
          team: {
            id: event.team.id,
            name: event.team?.name,
            logo: await this.korastatsService
              .getImageUrl("club", event.team.id)
              .catch(() => ""),
          },
          player: {
            id: event.in ? event.in.id : event.player?.id || 0,
            name: event.in
              ? event.in.nickname
              : event.player?.nickname || "Unknown Player",
          },
          assist: event.out
            ? {
                id: event.out.id,
                name: event.out.nickname,
              }
            : null,
          type: this.mapEventType(event.event),
          detail: event.event,
          comments: null,
        })),
      )
    ).sort((a, b) => a.time.elapsed - b.time.elapsed);
  }

  private async mapLineups(
    matchSquad: KorastatsMatchSquad,
    matchSummary: KorastatsMatchSummary,
    matchFormationHome: KorastatsMatchFormation,
    matchFormationAway: KorastatsMatchFormation,
    matchPlayerStats: KorastatsMatchPlayersStats,
  ) {
    const matchSquads = [matchSquad?.home?.squad || [], matchSquad?.away?.squad || []];
    return await Promise.all(
      matchSquads.map(async (squad, index) => {
        // Get coach photo - coach info not available in squad
        const coachPhoto =
          index === 0
            ? await this.korastatsService.getImageUrl(
                "coach",
                matchSummary?.home?.coach?.id,
              )
            : await this.korastatsService.getImageUrl(
                "coach",
                matchSummary?.away?.coach?.id,
              );
        const formationHtext = matchFormationHome?.lineupFormationName?.split("1-")?.[1]
          ? matchFormationHome?.lineupFormationName.split("1-")[1].split("").join("-")
          : "4-4-2";
        const formationAText = matchFormationAway?.lineupFormationName?.split("1-")?.[1]
          ? matchFormationAway?.lineupFormationName.split("1-")[1].split("").join("-")
          : "4-4-2";
        // Filter starting lineup and substitutes
        const startingPlayers = (squad || []).filter((p) => p?.lineup) || [];
        const substitutePlayers = (squad || []).filter((p) => p?.bench) || [];
        console.log("MODA formationHtext", formationHtext);
        console.log("MODA formationAText", formationAText);
        // Get team info
        const teamId =
          index === 0 ? matchSquad?.home?.team?.id || 0 : matchSquad?.away?.team?.id || 0;
        const teamName =
          index === 0
            ? matchSquad?.home?.team?.name || "Home Team"
            : matchSquad?.away?.team?.name || "Away Team";
        const teamLogo = await this.korastatsService
          .getImageUrl("club", teamId)
          .catch(() => "");

        // Get player photos for starting XI
        const startXIWithPhotos = await Promise.all(
          startingPlayers.map(async (player) => ({
            player: {
              id: player?.id || 0,
              name: player?.nick_name || "Unknown Player",
              photo: await this.korastatsService
                .getImageUrl("player", player?.id || 0)
                .catch(() => ""),
              number: player?.shirt_number || 0,
              pos: player?.position?.name || "",
              grid: this.mapPositionToGrid(player?.position?.name || ""),
              rating: this.calculatePlayerRating(
                matchPlayerStats?.players?.find((p) => p.id === player?.id)?.stats,
              ).toString(),
            },
          })),
        );

        // Get player photos for substitutes
        const substitutesWithPhotos = await Promise.all(
          substitutePlayers.map(async (player) => ({
            player: {
              id: player?.id || 0,
              name: player?.nick_name || "Unknown Player",
              photo: await this.korastatsService
                .getImageUrl("player", player?.id || 0)
                .catch(() => ""),
              number: player?.shirt_number || 0,
              pos: player?.position?.name || "",
              grid: this.mapPositionToGrid(player?.position?.name || ""),
              rating: this.calculatePlayerRating(
                matchPlayerStats?.players?.find((p) => p.id === player?.id)?.stats,
              ).toString(),
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
            id:
              index === 0 ? matchSummary?.home?.coach?.id : matchSummary?.away?.coach?.id,
            name:
              index === 0
                ? matchSummary?.home?.coach?.name
                : matchSummary?.away?.coach?.name,
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
    const playersArr = Array.isArray(matchPlayerStats?.players)
      ? matchPlayerStats.players
      : [];
    for (let i = 0; i < playersArr.length && i < 11; i++) {
      const player = playersArr[i];
      const teamId = player?.team?.id || 0;
      if (!teams.has(teamId)) {
        teams.set(teamId, {
          team: { id: teamId, name: player?.team?.name || "Unknown Team" },
          players: [],
        });
      }

      const playerPhoto = await this.korastatsService
        .getImageUrl("player", player?.id || 0)
        .catch(() => "");

      teams.get(teamId).players.push({
        player: {
          id: player?.id || 0,
          name: player?.name || "Unknown Player",
          photo: playerPhoto,
        },
        statistics: this.mapPlayerDetailedStats(player as any),
      });
    }

    return Array.from(teams.values());
  }

  private async mapTeamStatistics(matchSummary: KorastatsMatchSummary) {
    // Get team logos for statistics
    const [homeTeamLogo, awayTeamLogo] = await Promise.all([
      this.korastatsService
        .getImageUrl("club", matchSummary?.home?.team?.id || 0)
        .catch(() => ""),
      this.korastatsService
        .getImageUrl("club", matchSummary?.away?.team?.id || 0)
        .catch(() => ""),
    ]);

    // Helper function to safely get stat values

    // Helper function to calculate percentage
    const getPercentage = (part: number, total: number): string => {
      if (total === 0) return "0%";
      return `${Math.round((part / total) * 100)}%`;
    };

    const homeStats = matchSummary?.home?.stats || ({} as any);
    const awayStats = matchSummary?.away?.stats || ({} as any);

    // Comprehensive team statistics extraction
    return [
      {
        team: {
          id: matchSummary?.home?.team?.id || 0,
          name: matchSummary?.home?.team?.name || "Home Team",
          logo: homeTeamLogo,
        },
        statistics: [
          // Goals & Scoring
          { type: "Shots on Goal", value: homeStats?.Attempts?.Success || 0 },
          {
            type: "Shots off Goal",
            value:
              homeStats?.Attempts?.Total ||
              0 - homeStats?.Attempts?.Success ||
              0 - homeStats?.Defensive?.Blocks ||
              0,
          },
          { type: "Total Shots", value: homeStats?.Attempts?.Total || 0 },
          { type: "Blocked Shots", value: homeStats?.Defensive?.Blocks || 0 },
          { type: "Shots insidebox", value: homeStats?.Attempts?.Success || 0 },
          {
            type: "Shots outsidebox",
            value:
              homeStats?.Attempts?.Total ||
              0 - homeStats?.Attempts?.Success ||
              0 - homeStats?.Defensive?.Blocks ||
              0,
          },
          { type: "Fouls", value: homeStats?.Fouls?.Awarded || 0 },
          { type: "Corner Kicks", value: homeStats?.Admin?.Corners || 0 },
          { type: "Offsides", value: homeStats?.Admin?.Offside || 0 },
          { type: "Yellow Cards", value: homeStats?.Cards?.Yellow || 0 },
          { type: "Red Cards", value: homeStats?.Cards?.Red || 0 },
          {
            type: "Goalkeeper Saves",
            value: homeStats?.Defensive?.OpportunitySaved || 0,
          },
          { type: "Total passes", value: homeStats?.Pass?.Total || 0 },
          { type: "Passes accurate", value: homeStats?.Pass?.Success || 0 },
          { type: "Passes %", value: `${homeStats?.Pass?.Accuracy}%` },
          { type: "expected_goals", value: homeStats?.GoalsScored?.XG || 0 },
          { type: "goals_prevented", value: homeStats?.Defensive?.GoalsSaved || 0 },
        ],
      },
      {
        team: {
          id: matchSummary?.away?.team?.id || 0,
          name: matchSummary?.away?.team?.name || "Away Team",
          logo: awayTeamLogo,
        },
        statistics: [
          // Goals & Scoring

          { type: "Shots on Goal", value: awayStats?.Attempts?.Success || 0 },
          {
            type: "Shots off Goal",
            value:
              awayStats?.Attempts?.Total ||
              0 - awayStats?.Attempts?.Success ||
              0 - awayStats?.Defensive?.Blocks ||
              0,
          },
          { type: "Total Shots", value: awayStats?.Attempts?.Total || 0 },
          { type: "Blocked Shots", value: awayStats?.Defensive?.Blocks || 0 },
          { type: "Shots insidebox", value: awayStats?.Attempts?.Success || 0 },
          {
            type: "Shots outsidebox",
            value:
              awayStats?.Attempts?.Total ||
              0 - awayStats?.Attempts?.Success ||
              0 - awayStats?.Defensive?.Blocks ||
              0,
          },
          { type: "Fouls", value: awayStats?.Fouls?.Awarded || 0 },
          { type: "Corner Kicks", value: awayStats?.Admin?.Corners || 0 },
          { type: "Offsides", value: awayStats?.Admin?.Offside || 0 },
          { type: "Yellow Cards", value: awayStats?.Cards?.Yellow || 0 },
          { type: "Red Cards", value: awayStats?.Cards?.Red || 0 },
          {
            type: "Goalkeeper Saves",
            value: awayStats?.Defensive?.OpportunitySaved || 0,
          },
          { type: "Total passes", value: awayStats?.Pass?.Total || 0 },
          { type: "Passes accurate", value: awayStats?.Pass?.Success || 0 },
          { type: "Passes %", value: `${awayStats?.Pass?.Accuracy}%` },
          { type: "expected_goals", value: awayStats?.GoalsScored?.XG || 0 },
          { type: "goals_prevented", value: awayStats?.Defensive?.GoalsSaved || 0 },
        ],
      },
    ];
  }

  private mapPlayerDetailedStats(player: KorastatsPlayerMatchStats) {
    const stats = player?.stats;
    // Map team stats to player format
    return {
      games: {
        position: player?.position?.name || "Unknown",
        number: player?.shirtnumber || 0,
        minutes: stats?.Admin?.MinutesPlayed || 0,
        rating: this.calculatePlayerRating(stats).toString(), // Default
        substitute: stats?.Admin?.MatchesPlayedasSub > 0,
        captain: false,
      },
      offsides: stats?.Admin?.Offside || 0,
      shots: {
        total: stats?.Attempts?.Total || 0,
        on: stats?.Attempts?.Success || 0,
      },
      goals: {
        total: stats?.GoalsScored?.Total || 0,
        assists: stats?.Chances?.Assists || 0,
        conceded: stats?.GoalsConceded?.Total || 0,
        saves: stats?.Defensive?.OpportunitySaved || 0,
      },
      passes: {
        total: stats?.Pass?.Total || 0,
        key: stats?.Chances?.KeyPasses || 0,
        accuracy: `${Math.round(stats?.Pass?.Accuracy || 0)}%`,
      },
      tackles: {
        total: stats?.BallWon?.TackleWon || 0,
        blocks: stats?.Defensive?.Blocks || 0,
        interceptions: stats?.BallWon?.InterceptionWon || 0,
      },
      duels: {
        total: stats?.BallWon?.Total || 0,
        won: stats?.BallWon?.Total || 0,
      },
      dribbles: {
        attempts: stats?.Dribble?.Total || 0,
        success: stats?.Dribble?.Success || 0,
        past: 0,
      },
      fouls: {
        drawn: stats?.Fouls?.Awarded || 0,
        committed: stats?.Fouls?.Committed || 0,
      },
      cards: {
        yellow: stats?.Cards?.Yellow || 0,
        red: stats?.Cards?.Red || 0,
        yellowred: stats?.Cards?.SecondYellow || 0,
      },
      penalty: {
        won: stats?.Penalty?.Awarded || 0,
        committed: stats?.Penalty?.Committed || 0,
        scored: stats?.GoalsScored?.PenaltyScored || 0,
        missed: stats?.Attempts?.PenaltyMissed || 0,
        saved: stats?.Defensive?.OpportunitySaved || 0,
      },
    };
  }

  private parseTimeToMinutes(
    timeStr: string,
    half: number,
    firstHalfLastEventMinute: number,
  ): number {
    if (!timeStr) return 0;
    const match = Number(timeStr?.split(":")[0]);
    if (match) {
      return (
        match +
        (half === 1
          ? 0
          : half === 2
            ? firstHalfLastEventMinute > 45
              ? firstHalfLastEventMinute
              : 45
            : half === 3
              ? 90
              : 105)
      );
    }
    return 0;
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
    matchSummary: KorastatsMatchSummary,
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
        name: leagueInfo?.name,
        logo: leagueInfo?.logo,
        season: parseInt(matchSummary?.season),
      },
      homeTeam: {
        id: homeTeam?.id || 0,
        name: homeTeam?.name || "Home Team",
        logo: homeTeamLogo,
        winner: matchSummary?.score?.home > matchSummary?.score?.away || false,
      },
      awayTeam: {
        id: awayTeam?.id || 0,
        name: awayTeam?.name || "Away Team",
        logo: awayTeamLogo,
        winner: matchSummary?.score?.away > matchSummary?.score?.home || false,
      },
      topScorer: {
        homePlayer: {
          id: homeTopScorer.id,
          name: homeTopScorer?.nickname,
          photo: homeScorerPhoto,
        },
        awayPlayer: {
          id: awayTopScorer.id,
          name: awayTopScorer?.nickname,
          photo: awayScorerPhoto,
        },
        stats: [
          {
            name: "Goals",
            home: homeTopScorer?.stats?.GoalsScored?.Total || 0,
            away: awayTopScorer?.stats?.GoalsScored?.Total || 0,
          },
          {
            name: "Assists",
            home: homeTopScorer?.stats?.Chances?.Assists || 0,
            away: awayTopScorer?.stats?.Chances?.Assists || 0,
          },
          {
            name: "Minutes Played",
            home: 0, // Default
            away: 0, // Default
          },
        ],
      },
      topAssister: {
        homePlayer: {
          id: homeTopAssister?.id || 0,
          name: homeTopAssister?.nickname || "",
          photo: homeAssisterPhoto || "",
        },
        awayPlayer: {
          id: awayTopAssister?.id || 0,
          name: awayTopAssister?.nickname || "",
          photo: awayAssisterPhoto || "",
        },
        stats: [
          {
            name: "Assists",
            home: homeTopAssister?.stats?.Chances?.Assists || 0,
            away: awayTopAssister?.stats?.Chances?.Assists || 0,
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
          id: homeTopKeeper?.id || 0,
          name: homeTopKeeper?.nickname || "",
          photo: homeKeeperPhoto || "",
        },
        awayPlayer: {
          id: awayTopKeeper?.id || 0,
          name: awayTopKeeper?.nickname || "",
          photo: awayKeeperPhoto || "",
        },
        stats: [
          {
            name: "Goals Saved",
            home: homeTopKeeper?.stats?.Defensive?.GoalsSaved || 0,
            away: awayTopKeeper?.stats?.Defensive?.GoalsSaved || 0,
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
    matchSummary: KorastatsMatchSummary,
  ): Promise<any[]> {
    try {
      // Get both teams' squads
      const homeSquad = matchSquad?.home?.squad;
      const awaySquad = matchSquad?.away?.squad;

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
      const homePoints = this.aggregateTeamHeatmap(homeHeatmaps);

      // Aggregate away team heatmap points
      const awayPoints = this.aggregateTeamHeatmap(awayHeatmaps);

      // Get team logos
      const [homeTeamLogo, awayTeamLogo] = await Promise.all([
        this.korastatsService
          .getImageUrl("club", matchSquad?.home?.team?.id || 0)
          .catch(() => ""),
        this.korastatsService
          .getImageUrl("club", matchSquad?.away?.team?.id || 0)
          .catch(() => ""),
      ]);

      return [
        {
          team: {
            id: matchSquad?.home?.team?.id || 0,
            name: matchSquad?.home?.team?.name || "Home Team",
            logo: homeTeamLogo,
            winner:
              (matchSummary?.score?.home || 0) > (matchSummary?.score?.away || 0) ||
              false,
          },
          heatmap: { points: homePoints },
        },
        {
          team: {
            id: matchSquad?.away?.team?.id || 0,
            name: matchSquad?.away?.team?.name || "Away Team",
            logo: awayTeamLogo,
            winner:
              (matchSummary?.score?.away || 0) > (matchSummary?.score?.home || 0) ||
              false,
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
  private aggregateTeamHeatmap(playerHeatmaps: any[]): number[][] {
    const heatmapGrid: Map<string, number> = new Map();
    const gridSize = 10; // Divide field into 10x10 meter grid squares

    // Process each player's heatmap
    for (const playerHeatmap of playerHeatmaps) {
      if (!playerHeatmap.data || playerHeatmap.data.length === 0) continue;

      // Process each heat point from this player
      for (const point of playerHeatmap.data) {
        // Convert Korastats coordinates to normalized (0-1) coordinates
        // Your approach: divide by 1000 for better distribution
        const normalizedX = point.x / 1000;
        const normalizedY = point.y / 1000;

        // Ensure coordinates are within valid range (0-1)
        const clampedX = Math.max(0, Math.min(1, normalizedX));
        const clampedY = Math.max(0, Math.min(1, normalizedY));

        // Create grid key (quantize to grid squares)
        const gridX = Math.floor(clampedX * gridSize) / gridSize;
        const gridY = Math.floor(clampedY * gridSize) / gridSize;
        const gridKey = `${gridX},${gridY}`;

        // Accumulate heat intensity at this grid position
        const currentHeat = heatmapGrid.get(gridKey) || 0;
        heatmapGrid.set(gridKey, currentHeat + (point.count || 1));
      }
    }

    // Convert grid map to simple [x,y] points array as requested
    const aggregatedPoints: number[][] = [];

    for (const [gridKey, gridIntensity] of heatmapGrid.entries()) {
      const [x, y] = gridKey?.split(",").map(Number);

      // Create smooth distribution: more intense zones get more points
      const pointCount = Math.min(gridIntensity, 10); // Cap at 10 points per zone

      for (let i = 0; i < pointCount; i++) {
        // Add small randomization within the grid square for natural spread
        const randomOffsetX = (Math.random() - 0.5) * (1 / gridSize) * 0.8;
        const randomOffsetY = (Math.random() - 0.5) * (1 / gridSize) * 0.8;

        aggregatedPoints.push([
          Math.max(0, Math.min(1, x + randomOffsetX)),
          Math.max(0, Math.min(1, y + randomOffsetY)),
        ]);
      }
    }

    return aggregatedPoints;
  }
  /**
   * Generate momentum data from match timeline
   * Soccer Analytics: Track momentum shifts throughout the match
   */
  private async generateMomentum(
    matchTimeline: KorastatsMatchTimeline,
    matchPossession: KorastatsMatchPossessionTimeline,
  ): Promise<any> {
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

    // Process Korastats possession periods to map to 10-minute intervals
    const possessionData = this.mapPossessionToTimeInterwalks(matchPossession);

    // Analyze events to calculate momentum shifts
    const sortedEvents = matchTimeline.timeline.sort(
      (a, b) =>
        this.parseTimeToMinutes(a?.time || "0:0", a?.half || 1, 0) -
        this.parseTimeToMinutes(b?.time || "0:0", b?.half || 1, 0),
    );
    const goalEvents = sortedEvents.filter(
      (event) => event?.event === "Goal" || event?.event === "Goal Scored",
    );
    // Process each time interval
    for (const possessionInterval of possessionData) {
      let homeEvent: string | null = null;
      let awayEvent: string | null = null;

      // Find events in this time interval
      const intervalEvents = goalEvents.filter((event) => {
        const eventTime = this.parseTimeToMinutes(
          event?.time || "0:0",
          event?.half || 1,
          0,
        );
        return (
          eventTime >= possessionInterval.time && eventTime < possessionInterval.time + 10
        );
      });
      if (intervalEvents.length > 0) {
        if (intervalEvents[0]?.team?.id === matchTimeline?.home?.id) {
          homeEvent = intervalEvents[0]?.event || null;
        } else {
          awayEvent = intervalEvents[0]?.event || null;
        }
      }

      // Add momentum data point for this time interval
      momentumData.push({
        time: possessionInterval.time.toString(),
        homeEvent,
        awayEvent,
        homeMomentum: possessionInterval.homePossession.toString(),
        awayMomentum: possessionInterval.awayPossession.toString(),
      });
    }

    return {
      data: momentumData,
      home: {
        id: matchTimeline?.home?.id || 0,
        name: matchTimeline?.home?.name || "Home Team",
        logo: homeTeamLogo,
        winner:
          (matchTimeline?.score?.home || 0) > (matchTimeline?.score?.away || 0) || false,
      },
      away: {
        id: matchTimeline?.away?.id || 0,
        name: matchTimeline?.away?.name || "Away Team",
        logo: awayTeamLogo,
        winner:
          (matchTimeline?.score?.away || 0) > (matchTimeline?.score?.home || 0) || false,
      },
    };
  }

  /**
   * Map Korastats possession periods to 10-minute time intervals
   * Interpolates missing periods based on adjacent data
   */
  private mapPossessionToTimeInterwalks(
    matchPossession: KorastatsMatchPossessionTimeline,
  ): { time: number; homePossession: number; awayPossession: number }[] {
    const timeIntervals = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const result: { time: number; homePossession: number; awayPossession: number }[] = [];

    // Parse Korastats periods to get possession for each interval
    const korastatsPeriods = matchPossession.home?.possession || [];

    // Create mapping of time period to possession
    const possessionMap = new Map<number, { home: number; away: number }>();

    for (const period of korastatsPeriods) {
      // Parse period like "00-15" to get midpoint (7.5 minutes, rounded to nearest interval)
      const periodMatch = period.period.match(/(\d+)-(\d+)/);
      if (periodMatch) {
        const startMin = parseInt(periodMatch[1]);
        const endMin = parseInt(periodMatch[2]);
        const midMin = Math.round((startMin + endMin) / 2);

        // Find closest 10-minute interval
        const closestInterval = timeIntervals.reduce((closest, interval) =>
          Math.abs(interval - midMin) < Math.abs(closest - midMin) ? interval : closest,
        );

        possessionMap.set(closestInterval, {
          home: period.possession,
          away: 100 - period.possession,
        });
      }
    }

    // Fill in all time intervals, interpolating missing values
    for (const time of timeIntervals) {
      let homePossession = 50; // Default balanced possession
      let awayPossession = 50;

      if (possessionMap.has(time)) {
        // Use exact data if available
        const data = possessionMap.get(time)!;
        homePossession = data.home;
        awayPossession = data.away;
      } else {
        // Interpolate between adjacent data points
        const beforeData = this.getNearestPossessionData(possessionMap, time, true);
        const afterData = this.getNearestPossessionData(possessionMap, time, false);

        if (beforeData && afterData) {
          // Linear interpolation
          const progress = (time - beforeData.time) / (afterData.time - beforeData.time);
          homePossession = Math.round(
            beforeData.home + (afterData.home - beforeData.home) * progress,
          );
          awayPossession = 100 - homePossession;
        } else if (beforeData) {
          // Use previous data
          homePossession = beforeData.home;
          awayPossession = beforeData.away;
        } else if (afterData) {
          // Use next data
          homePossession = afterData.home;
          awayPossession = afterData.away;
        }
      }

      result.push({
        time,
        homePossession,
        awayPossession,
      });
    }

    return result;
  }

  /**
   * Get nearest possession data point (before or after given time)
   */
  private getNearestPossessionData(
    possessionMap: Map<number, { home: number; away: number }>,
    targetTime: number,
    before: boolean,
  ): { time: number; home: number; away: number } | null {
    const sortedTimes = Array.from(possessionMap.keys()).sort((a, b) => a - b);

    if (before) {
      // Find largest time <= targetTime
      const beforeTimes = sortedTimes.filter((time) => time < targetTime);
      if (beforeTimes.length === 0) return null;
      const time = Math.max(...beforeTimes);
      const data = possessionMap.get(time)!;
      return { time, ...data };
    } else {
      // Find smallest time > targetTime
      const afterTimes = sortedTimes.filter((time) => time > targetTime);
      if (afterTimes.length === 0) return null;
      const time = Math.min(...afterTimes);
      const data = possessionMap.get(time)!;
      return { time, ...data };
    }
  }

  /**
   * Generate match highlights information
   * Currently returns default Saudi Sports Company channel
   */
  private generateHighlights(matchVideo: KorastatsMatchVideo) {
    const url =
      matchVideo?.objMatch?.arrHalves?.[0]?.arrStreams?.[0]?.arrQualities?.[0]?.strLink ||
      "";
    return { host: "S3", url };
  }

  private calculateTeamRating(teamStats: KorastatsTeamMatchStats): number {
    // Soccer analytics: Calculate team rating based on performance metrics
    const possessionWeight = 0.2;
    const shotsWeight = 0.3;
    const accuracyWeight = 0.25;
    const disciplineWeight = 0.25;

    const possession = teamStats?.Possession?.TimePercent?.Average || 0.5;
    const shotsRatio = Math.min(
      (teamStats?.Attempts?.Success || 0) /
        Math.max(teamStats?.Attempts?.Success || 1, 1),
      1,
    );
    const accuracy =
      (teamStats?.Pass?.Accuracy || 0) / Math.max(teamStats?.Pass?.Accuracy || 1, 1);
    const discipline = Math.max(
      0,
      1 - ((teamStats?.Cards?.Red || 0) * 0.3 + (teamStats?.Cards?.Yellow || 0) * 0.1),
    );

    const rating =
      (possession * possessionWeight +
        shotsRatio * shotsWeight +
        accuracy * accuracyWeight +
        discipline * disciplineWeight) *
      10;

    return Math.round(rating * 10) / 10; // Round to 1 decimal
  }
  private calculatePlayerRating(playerStats: KorastatsPlayerDetailedStats): number {
    const possessionWeight = 0.2;
    const shotsWeight = 0.3;
    const accuracyWeight = 0.25;
    const disciplineWeight = 0.25;

    const possession = playerStats?.BallReceive?.Success || 0;
    const shotsRatio = Math.min(
      (playerStats?.Attempts?.SuccessAttemptToScore || 0) /
        Math.max(playerStats?.Attempts?.SuccessAttemptToScore || 1, 1),
      1,
    );

    const accuracy =
      (playerStats?.BallReceive?.Accuracy || 0) /
      Math.max(playerStats?.BallReceive?.Accuracy || 1, 1);
    const discipline = Math.max(
      0,
      1 -
        ((playerStats?.Cards?.Red || 0) * 0.3 +
          (playerStats?.Cards?.Yellow || 0) * 0.1 +
          (playerStats?.Cards?.SecondYellow || 0) * 0.1),
    );

    const rating =
      (possession * possessionWeight +
        shotsRatio * shotsWeight +
        accuracy * accuracyWeight +
        discipline * disciplineWeight) *
      10;

    return Math.round(rating * 10) / 100; // Round to 1 decimal
  }

  private normalizeKorastatsInputs(inputs: {
    matchTimeline: KorastatsMatchTimeline;
    matchSquad: KorastatsMatchSquad;
    matchPlayerStats: KorastatsMatchPlayersStats;
    matchFormationHome: KorastatsMatchFormation;
    matchFormationAway: KorastatsMatchFormation;
    matchVideo: KorastatsMatchVideo;
    matchSummary: KorastatsMatchSummary;
    matchPossession: KorastatsMatchPossessionTimeline;
  }) {
    // Ensure arrays/objects exist to avoid null dereferences in mappers
    const normalizedVideo: KorastatsMatchVideo = inputs.matchVideo ?? ({} as any);
    const objMatch = normalizedVideo.objMatch ?? ({} as any);
    const arrHalves = Array.isArray(objMatch.arrHalves) ? objMatch.arrHalves : [];
    if (arrHalves.length === 0) {
      normalizedVideo.objMatch = {
        arrHalves: [{ arrStreams: [{ arrQualities: [{ strLink: "" }] }] }],
      } as any;
    } else {
      // Deep fill streams/qualities
      for (const half of arrHalves) {
        (half as any).arrStreams = Array.isArray((half as any).arrStreams)
          ? (half as any).arrStreams
          : [{ arrQualities: [{ strLink: "" }] }];
        for (const stream of (half as any).arrStreams) {
          stream.arrQualities = Array.isArray(stream.arrQualities)
            ? stream.arrQualities
            : [{ strLink: "" }];
        }
      }
      normalizedVideo.objMatch = { arrHalves } as any;
    }

    const normalizedSummary: KorastatsMatchSummary = inputs.matchSummary ?? ({} as any);
    (normalizedSummary as any).home = normalizedSummary.home ?? ({} as any);
    (normalizedSummary as any).away = normalizedSummary.away ?? ({} as any);
    (normalizedSummary as any).home.stats = normalizedSummary.home.stats ?? ({} as any);
    (normalizedSummary as any).away.stats = normalizedSummary.away.stats ?? ({} as any);
    (normalizedSummary as any).score =
      normalizedSummary.score ??
      ({
        home: 0,
        away: 0,
      } as any);

    const normalizedSquad: KorastatsMatchSquad = inputs.matchSquad ?? ({} as any);
    (normalizedSquad as any).home =
      normalizedSquad.home ??
      ({
        team: { id: 0, name: "Home Team" },
        squad: [],
      } as any);
    (normalizedSquad as any).away =
      normalizedSquad.away ??
      ({
        team: { id: 0, name: "Away Team" },
        squad: [],
      } as any);
    (normalizedSquad as any).home.squad = Array.isArray(normalizedSquad.home.squad)
      ? normalizedSquad.home.squad
      : [];
    (normalizedSquad as any).away.squad = Array.isArray(normalizedSquad.away.squad)
      ? normalizedSquad.away.squad
      : [];

    const normalizedPlayerStats: KorastatsMatchPlayersStats =
      inputs.matchPlayerStats ?? ({ players: [] } as any);
    (normalizedPlayerStats as any).players = Array.isArray(normalizedPlayerStats.players)
      ? normalizedPlayerStats.players
      : [];

    const normalizedFormationHome: KorastatsMatchFormation =
      inputs.matchFormationHome ??
      ({ lineupFormationName: "1-4-4-2", lineupFormation: [] } as any);
    (normalizedFormationHome as any).lineupFormationName =
      normalizedFormationHome.lineupFormationName || "1-4-4-2";
    (normalizedFormationHome as any).lineupFormation = Array.isArray(
      normalizedFormationHome.lineupFormation,
    )
      ? normalizedFormationHome.lineupFormation
      : [];

    const normalizedFormationAway: KorastatsMatchFormation =
      inputs.matchFormationAway ??
      ({ lineupFormationName: "1-4-4-2", lineupFormation: [] } as any);
    (normalizedFormationAway as any).lineupFormationName =
      normalizedFormationAway.lineupFormationName || "1-4-4-2";
    (normalizedFormationAway as any).lineupFormation = Array.isArray(
      normalizedFormationAway.lineupFormation,
    )
      ? normalizedFormationAway.lineupFormation
      : [];

    const normalizedTimeline: KorastatsMatchTimeline =
      inputs.matchTimeline ?? ({} as any);
    (normalizedTimeline as any).timeline = Array.isArray(normalizedTimeline.timeline)
      ? normalizedTimeline.timeline
      : [];
    (normalizedTimeline as any).home =
      normalizedTimeline.home ?? ({ id: 0, name: "Home Team" } as any);
    (normalizedTimeline as any).away =
      normalizedTimeline.away ?? ({ id: 0, name: "Away Team" } as any);
    (normalizedTimeline as any).score =
      normalizedTimeline.score ?? ({ home: 0, away: 0 } as any);

    const normalizedPossession: KorastatsMatchPossessionTimeline =
      inputs.matchPossession ??
      ({ home: { possession: [] }, away: { possession: [] } } as any);
    (normalizedPossession as any).home =
      normalizedPossession.home ?? ({ possession: [] } as any);
    (normalizedPossession as any).away =
      normalizedPossession.away ?? ({ possession: [] } as any);
    (normalizedPossession as any).home.possession = Array.isArray(
      normalizedPossession.home.possession,
    )
      ? normalizedPossession.home.possession
      : [];
    (normalizedPossession as any).away.possession = Array.isArray(
      normalizedPossession.away.possession,
    )
      ? normalizedPossession.away.possession
      : [];

    return {
      matchTimeline: normalizedTimeline,
      matchSquad: normalizedSquad,
      matchPlayerStats: normalizedPlayerStats,
      matchFormationHome: normalizedFormationHome,
      matchFormationAway: normalizedFormationAway,
      matchVideo: normalizedVideo,
      matchSummary: normalizedSummary,
      matchPossession: normalizedPossession,
    };
  }
}

