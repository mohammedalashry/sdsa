// src/modules/fixtures/fixtures.repository.ts
// Direct mongo schema usage - data is already in correct format

import { Models, TeamInterface } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  FixtureDataResponse,
  FixtureDetailedResponse,
  FixtureComparisonResponse,
  FixturePredictionsResponse,
  FixtureMomentumResponse,
  FixtureHighlightsResponse,
  FixtureHeatmapResponse,
  FixtureShotmapResponse,
  FixtureTopPerformersResponse,
  Shot,
  FixtureStatsData,
  StatType,
} from "../../legacy-types/fixtures.types";
import { MatchInterface } from "@/db/mogodb/schemas/match.schema";

export interface GetFixturesOptions {
  league?: number;
  season?: number;
  round?: number;
  date?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class FixturesRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  // ===================================================================
  // BASIC FIXTURE ENDPOINTS - Return mongo data directly
  // ===================================================================

  /**
   * GET /fixture/ - Main fixture listing
   * Returns: FixtureData[] (mongo schema already matches)
   */
  async getFixtures(options: GetFixturesOptions): Promise<FixtureDataResponse> {
    try {
      console.log("getting fixtures");
      // Build MongoDB query
      const query: any = {};

      if (options.league) {
        query.tournament_id = options.league;
      }
      if (options.season) {
        query["league.season"] = options.season;
      }
      if (options.round) {
        query["league.round"] = options.round.toString();
      }
      console.log("🔍 Options:", options);
      console.log("🔍 Query:", query);

      if (options.date) {
        const startDate = new Date(options.date);
        query["fixture.date"] = {
          $gte: startDate.toISOString(),
        };
      }

      if (options.status) {
        query["fixture.status.short"] = options.status;
      }

      console.log("🔍 Fixtures query:", JSON.stringify(query, null, 2));

      // Get matches - mongo schema already matches FixtureData format
      const matches = await Models.Match.find(query)
        .sort({ "fixture.timestamp": -1 })
        .limit(options.limit || 50)
        .lean();
      console.log("🔍 Matches:", matches.length);
      // Return direct mongo data - schema already matches FixtureData[]
      const fixtures = matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));

      return fixtures;
    } catch (error) {
      console.error("❌ Error fetching fixtures:", error);
      throw new ApiError(500, `Failed to fetch fixtures: ${error.message}`);
    }
  }

  /**
   * GET /fixture/upcoming/
   */
  async getUpcomingFixtures(options: {
    league: number;
    season?: number;
  }): Promise<FixtureDataResponse> {
    try {
      const query: any = {
        tournament_id: options.league,
        "fixture.status.short": { $in: ["NS", "TBD"] },
        "fixture.date": { $gte: new Date().toISOString() },
      };

      if (options.season) {
        query["league.season"] = options.season;
      }

      const matches = await Models.Match.find(query)
        .sort({ "fixture.timestamp": 1 })
        .limit(10)
        .lean();

      return matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));
    } catch (error) {
      console.error("❌ Error fetching upcoming fixtures:", error);
      throw new ApiError(500, `Failed to fetch upcoming fixtures: ${error.message}`);
    }
  }

  /**
   * GET /fixture/results/
   */
  async getResults(options: {
    league: number;
    season?: number;
    round?: string;
  }): Promise<FixtureDataResponse> {
    try {
      const query: any = {
        tournament_id: options.league,
        "fixture.status.short": "FT",
      };

      if (options.round) {
        query["league.round"] = options.round;
      }

      const matches = await Models.Match.find(query)
        .sort({ "fixture.timestamp": -1 })
        .limit(10)
        .lean();

      return matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));
    } catch (error) {
      console.error("❌ Error fetching results:", error);
      throw new ApiError(500, `Failed to fetch results: ${error.message}`);
    }
  }

  /**
   * GET /fixture/live/
   */
  async getLiveFixtures(league: number): Promise<FixtureDataResponse> {
    try {
      const query: any = {
        "fixture.status.short": "LIVE",
      };

      if (league) {
        query.tournament_id = league;
      }

      const matches = await Models.Match.find(query).limit(10).lean();

      return matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));
    } catch (error) {
      console.error("❌ Error fetching live fixtures:", error);
      throw new ApiError(500, `Failed to fetch live fixtures: ${error.message}`);
    }
  }

  /**
   * GET /fixture/landing-live/
   */
  async getLandingLiveFixtures(): Promise<FixtureDataResponse> {
    try {
      const matches = await Models.Match.find({
        "fixture.status.short": { $in: ["LIVE", "HT"] },
      })
        .limit(10)
        .lean();

      return matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));
    } catch (error) {
      console.error("❌ Error fetching landing live fixtures:", error);
      throw new ApiError(500, `Failed to fetch landing live fixtures: ${error.message}`);
    }
  }

  // ===================================================================
  // DETAILED FIXTURE ENDPOINTS - Use mongo schemas directly
  // ===================================================================

  /**
   * GET /fixture/details/
   * Returns: FixtureDetailed (mongo schemas already match)
   */
  async getFixtureDetails(id: number): Promise<FixtureDetailedResponse> {
    try {
      // Get basic match data
      const match = await Models.Match.findOne({ korastats_id: id }).lean();

      if (!match) {
        throw new ApiError(404, `Fixture ${id} not found`);
      }

      // Get detailed match data
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      // Get team stats for both teams from Team schema
      const teamStatsData = await this.getTeamStatsForMatch(match);

      // Get head-to-head matches
      const headToHeadData = await this.getHeadToHeadMatches(
        match.teams?.home?.id,
        match.teams?.away?.id,
      );
      // Return exact FixtureDetailed format - schemas already match
      const response: FixtureDetailedResponse = {
        fixtureData: {
          fixture: match.fixture,
          league: match.league,
          teams: match.teams,
          goals: match.goals,
          score: match.score,
          tablePosition: match.tablePosition,
          averageTeamRating: match.averageTeamRating,
        },

        // From MatchDetails schema - already matches legacy-types
        timelineData: matchDetails?.timelineData || [],
        lineupsData: matchDetails?.lineupsData || [],
        injuriesData: matchDetails?.injuriesData || [],
        playerStatsData: matchDetails?.playerStatsData || [],
        statisticsData: matchDetails?.statisticsData || [],

        // Head-to-head and team stats
        headToHeadData,
        teamStatsData,
      };

      return response;
    } catch (error) {
      console.error(`❌ Error fetching fixture details for ${id}:`, error);
      throw new ApiError(500, `Failed to fetch fixture details: ${error.message}`);
    }
  }

  /**
   * GET /fixture/comparison/
   * Get team data from Team schema
   */
  async getFixtureComparison(id: number): Promise<FixtureComparisonResponse> {
    try {
      const match = await Models.Match.findOne({ korastats_id: id }).lean();

      if (!match) {
        throw new ApiError(404, `Fixture ${id} not found`);
      }

      const homeTeamId = match.teams?.home?.id;
      const awayTeamId = match.teams?.away?.id;

      if (!homeTeamId || !awayTeamId) {
        return [];
      }

      // Get team data from Team schema
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: homeTeamId }).lean(),
        Models.Team.findOne({ korastats_id: awayTeamId }).lean(),
      ]);

      const comparison = [];

      // Transform to ComparisonData format
      if (homeTeam) {
        comparison.push({
          team: {
            id: homeTeam.korastats_id,
            name: homeTeam.name,
            logo: homeTeam.logo,
            code: homeTeam.code || "",
            country: homeTeam.country,
            founded: homeTeam.founded || 0,
            national: homeTeam.national || false,
          },
          clean_sheet: homeTeam.stats_summary?.cleanSheetGames || 0,
          form: this.calculateFormScore(homeTeam.tournament_stats?.[0]?.form || ""),
          win_streak: homeTeam.tournament_stats?.[0]?.biggest?.streak?.wins || 0,
          goals_scored:
            (homeTeam.stats_summary?.goalsScored?.home || 0) +
            (homeTeam.stats_summary?.goalsScored?.away || 0),
          goals_conceded:
            (homeTeam.stats_summary?.goalsConceded?.home || 0) +
            (homeTeam.stats_summary?.goalsConceded?.away || 0),
          consistency: this.calculateConsistencyFromSummary(homeTeam.stats_summary),
        });
      }

      if (awayTeam) {
        comparison.push({
          team: {
            id: awayTeam.korastats_id,
            name: awayTeam.name,
            logo: awayTeam.logo,
            code: awayTeam.code || "",
            country: awayTeam.country,
            founded: awayTeam.founded || 0,
            national: awayTeam.national || false,
          },
          clean_sheet: awayTeam.stats_summary?.cleanSheetGames || 0,
          form: this.calculateFormScore(awayTeam.tournament_stats?.[0]?.form || ""),
          win_streak: awayTeam.tournament_stats?.[0]?.biggest?.streak?.wins || 0,
          goals_scored:
            (awayTeam.stats_summary?.goalsScored?.home || 0) +
            (awayTeam.stats_summary?.goalsScored?.away || 0),
          goals_conceded:
            (awayTeam.stats_summary?.goalsConceded?.home || 0) +
            (awayTeam.stats_summary?.goalsConceded?.away || 0),
          consistency: this.calculateConsistencyFromSummary(awayTeam.stats_summary),
        });
      }

      return comparison;
    } catch (error) {
      console.error(`❌ Error fetching comparison for ${id}:`, error);
      return [];
    }
  }

  // ===================================================================
  // ADVANCED ANALYTICS ENDPOINTS - Direct mongo data
  // ===================================================================

  /**
   * GET /fixture/predictions/
   */
  async getFixturePredictions(id: number): Promise<FixturePredictionsResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      // Return mongo data directly or empty object
      return matchDetails?.predictionsData || ({} as FixturePredictionsResponse);
    } catch (error) {
      console.error(`❌ Error fetching predictions for ${id}:`, error);
      return {} as FixturePredictionsResponse;
    }
  }

  /**
   * GET /fixture/momentum/
   */
  async getFixtureMomentum(id: number): Promise<FixtureMomentumResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      if (!matchDetails?.momentumData) {
        throw new ApiError(404, `Momentum data for fixture ${id} not available`);
      }

      // Return mongo data directly - schema matches
      return matchDetails.momentumData;
    } catch (error) {
      console.error(`❌ Error fetching momentum for ${id}:`, error);
      throw new ApiError(500, `Failed to fetch momentum: ${error.message}`);
    }
  }

  /**
   * GET /fixture/highlights/
   */
  async getFixtureHighlights(id: number): Promise<FixtureHighlightsResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      // Return mongo data or fallback
      return (
        matchDetails?.highlightsData || {
          host: "youtube-channel",
          url: "https://www.youtube.com/channel/default",
        }
      );
    } catch (error) {
      console.error(`❌ Error fetching highlights for ${id}:`, error);
      return {
        host: "youtube-channel",
        url: "https://www.youtube.com/channel/default",
      };
    }
  }

  /**
   * GET /fixture/heatmap/
   */
  async getFixtureHeatmap(id: number): Promise<FixtureHeatmapResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      if (!matchDetails?.heatmapsData) {
        throw new ApiError(404, `Heatmap data for fixture ${id} not available`);
      }

      // Return mongo data directly
      return matchDetails.heatmapsData;
    } catch (error) {
      console.error(`❌ Error fetching heatmap for ${id}:`, error);
      throw new ApiError(500, `Failed to fetch heatmap: ${error.message}`);
    }
  }

  /**
   * GET /fixture/shotmap/ (FOR FRONTEND)
   */
  async getFixtureShotmap(id: number): Promise<FixtureShotmapResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      if (!matchDetails?.shotmapsData) {
        //throw new ApiError(404, `Shotmap data for fixture ${id} not available`);
        return this.generateShotmapData(id);
      } // FOR FRONTEND

      // Return mongo data directly
      return matchDetails.shotmapsData;
    } catch (error) {
      console.error(`❌ Error fetching shotmap for ${id}:`, error);
      throw new ApiError(500, `Failed to fetch shotmap: ${error.message}`);
    }
  }

  /**
   * GET /fixture/top-performers/
   */
  async getFixtureTopPerformers(id: number): Promise<FixtureTopPerformersResponse> {
    try {
      const matchDetails = await Models.MatchDetails.findOne({ korastats_id: id }).lean();

      if (!matchDetails?.topPerformersData) {
        throw new ApiError(404, `Top performers data for fixture ${id} not available`);
      }

      // Return mongo data directly
      return matchDetails.topPerformersData;
    } catch (error) {
      console.error(`❌ Error fetching top performers for ${id}:`, error);
      throw new ApiError(500, `Failed to fetch top performers: ${error.message}`);
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private generateShotmapData(id: number): FixtureShotmapResponse {
    const shotmapsData: FixtureShotmapResponse = [];
    const homeShotmaps = this.createRandomShotmapSimilarToResponse();
    const awayShotmaps = this.createRandomShotmapSimilarToResponse();
    shotmapsData.push({
      team: {
        id: 1,
        name: "Home",
        logo: "https://example.com/logo.png",
        winner: true,
      },
      shots: homeShotmaps,
    });
    shotmapsData.push({
      team: {
        id: 2,
        name: "Away",
        logo: "https://example.com/logo.png",
        winner: false,
      },
      shots: awayShotmaps,
    });
    return shotmapsData;
  }
  private createRandomShotmapSimilarToResponse(): Shot[] {
    const shotmaps: Shot[] = [];
    for (let i = 0; i < 10; i++) {
      shotmaps.push({
        id: i,
        playerId: i,
        time: `Shotmap ${i}`,
        zone: `Shotmap ${i}`,
        outcome: `Shotmap ${i}`,
        x: i,
        y: i,
        isBlocked: i % 2 === 0,
        isOnTarget: i % 2 === 0,
        blockedX: i,
        blockedY: i,
        goalCrossedY: i,
        goalCrossedZ: i,
        shotType: `Shotmap ${i}`,
        situation: `Shotmap ${i}`,
      });
    }
    return shotmaps;
  }
  /**
   * Get team stats from Team schema for both teams in match
   */
  private async getTeamStatsForMatch(match: MatchInterface) {
    try {
      const homeTeamId = match.teams?.home?.id;
      const awayTeamId = match.teams?.away?.id;

      if (!homeTeamId || !awayTeamId) {
        return [];
      }

      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: homeTeamId }).lean(),
        Models.Team.findOne({ korastats_id: awayTeamId }).lean(),
      ]);

      const teamStats = [];

      // Transform team data to TeamStatsData format
      if (homeTeam) {
        teamStats.push(this.transformTeamToStatsData(homeTeam, match));
      }

      if (awayTeam) {
        teamStats.push(this.transformTeamToStatsData(awayTeam, match));
      }

      return teamStats;
    } catch (error) {
      console.error("❌ Error getting team stats:", error);
      return [];
    }
  }

  /**
   * Transform Team schema data to TeamStatsData
   */
  private transformTeamToStatsData(team: TeamInterface, match: MatchInterface) {
    return {
      league: {
        id: match.tournament_id,
        name: match.league?.name || "Unknown",
        country: match.league?.country || "Unknown",
        logo: match.league?.logo || "",
        flag: match.league?.flag || "",
        season: match.league?.season || new Date().getFullYear(),
      },
      team: {
        id: team.korastats_id,
        name: team.name,
        logo: team.logo,
      },
      form: team.tournament_stats?.[0]?.form || "",
      fixtures: team.stats_summary
        ? {
            played: {
              home: team.stats_summary.gamesPlayed.home,
              away: team.stats_summary.gamesPlayed.away,
              total:
                team.stats_summary.gamesPlayed.home + team.stats_summary.gamesPlayed.away,
            },
            wins: {
              home: team.stats_summary.wins.home,
              away: team.stats_summary.wins.away,
              total: team.stats_summary.wins.home + team.stats_summary.wins.away,
            },
            draws: {
              home: team.stats_summary.draws.home,
              away: team.stats_summary.draws.away,
              total: team.stats_summary.draws.home + team.stats_summary.draws.away,
            },
            loses: {
              home: team.stats_summary.loses.home,
              away: team.stats_summary.loses.away,
              total: team.stats_summary.loses.home + team.stats_summary.loses.away,
            },
          }
        : {
            played: { home: 0, away: 0, total: 0 },
            wins: { home: 0, away: 0, total: 0 },
            draws: { home: 0, away: 0, total: 0 },
            loses: { home: 0, away: 0, total: 0 },
          },
      goals: team.stats_summary
        ? {
            for_: {
              total: {
                home: team.stats_summary.goalsScored.home,
                away: team.stats_summary.goalsScored.away,
                total:
                  team.stats_summary.goalsScored.home +
                  team.stats_summary.goalsScored.away,
              },
              average: { home: 0, away: 0, total: 0 },
            },
            against: {
              total: {
                home: team.stats_summary.goalsConceded.home,
                away: team.stats_summary.goalsConceded.away,
                total:
                  team.stats_summary.goalsConceded.home +
                  team.stats_summary.goalsConceded.away,
              },
              average: { home: 0, away: 0, total: 0 },
            },
          }
        : {
            for_: {
              total: { home: 0, away: 0, total: 0 },
              average: { home: 0, away: 0, total: 0 },
            },
            against: {
              total: { home: 0, away: 0, total: 0 },
              average: { home: 0, away: 0, total: 0 },
            },
          },
      biggest: team.tournament_stats?.[0]?.biggest || {
        streak: { wins: 0, draws: 0, loses: 0 },
      },
      clean_sheet: {
        home: 0,
        away: 0,
        total: team.stats_summary?.cleanSheetGames || 0,
      },
      teamAttacking: team.tournament_stats?.[0]?.team_attacking || {},
      teamPasses: team.tournament_stats?.[0]?.team_passing || {},
      teamDefending: team.tournament_stats?.[0]?.team_defending || {},
      teamOther: team.tournament_stats?.[0]?.team_others || {},
      average_team_rating: team.tournament_stats?.[0]?.average_team_rating || 0,
      rank: team.tournament_stats?.[0]?.rank || 0,
    };
  }

  /**
   * Get head-to-head matches between two teams
   */
  private async getHeadToHeadMatches(homeTeamId: number, awayTeamId: number) {
    try {
      if (!homeTeamId || !awayTeamId) {
        return [];
      }

      // Find matches between these teams
      const headToHeadMatches = await Models.Match.find({
        $or: [
          {
            "teams.home.id": homeTeamId,
            "teams.away.id": awayTeamId,
          },
          {
            "teams.home.id": awayTeamId,
            "teams.away.id": homeTeamId,
          },
        ],
      })
        .sort({ "fixture.timestamp": -1 })
        .limit(10)
        .lean();

      // Return as FixtureData format
      return headToHeadMatches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition,
        averageTeamRating: match.averageTeamRating,
      }));
    } catch (error) {
      console.error("❌ Error getting head-to-head:", error);
      return [];
    }
  }

  private calculateFormScore(form: string): number {
    if (!form) return 0;
    let score = 0;
    for (const char of form) {
      if (char === "W") score += 3;
      else if (char === "D") score += 1;
    }
    return score;
  }

  /**
   * Calculate consistency score from team stats summary
   */
  private calculateConsistencyFromSummary(statsSummary: any): number {
    if (!statsSummary) {
      return 0;
    }

    const totalGames =
      (statsSummary.gamesPlayed?.home || 0) + (statsSummary.gamesPlayed?.away || 0);
    if (totalGames === 0) return 0;

    const wins = (statsSummary.wins?.home || 0) + (statsSummary.wins?.away || 0);
    const draws = (statsSummary.draws?.home || 0) + (statsSummary.draws?.away || 0);

    return Math.round(((wins + draws * 0.5) / totalGames) * 100);
  }

  private calculateConsistency(stats: any): number {
    const wins = stats?.fixtures?.wins?.total || 0;
    const draws = stats?.fixtures?.draws?.total || 0;
    const total = stats?.fixtures?.played?.total || 1;
    return Math.round(((wins + draws * 0.5) / total) * 100);
  }
  /// ADD-ON
  /**
   * Get fixture statistics
   */
  async getFixtureStatistics() {
    try {
      const [
        totalMatches,
        finishedMatches,
        liveMatches,
        upcomingMatches,
        matchesWithDetails,
      ] = await Promise.all([
        Models.Match.countDocuments(),
        Models.Match.countDocuments({ "fixture.status.short": "FT" }),
        Models.Match.countDocuments({ "fixture.status.short": "LIVE" }),
        Models.Match.countDocuments({ "fixture.status.short": "NS" }),
        Models.MatchDetails.countDocuments(),
      ]);

      return {
        total: totalMatches,
        finished: finishedMatches,
        live: liveMatches,
        upcoming: upcomingMatches,
        withDetails: matchesWithDetails,
        detailsPercentage:
          totalMatches > 0 ? ((matchesWithDetails / totalMatches) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      console.error("❌ Error getting fixture statistics:", error);
      throw new ApiError(500, "Failed to get fixture statistics");
    }
  }
}

