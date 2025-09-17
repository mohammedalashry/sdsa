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
  round?: string;
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
      //mongodb stored round as string and it does not retrieve it amatches
      // if (options.round) {
      //   query["league.round"] = options.round;
      // }
      console.log("🔍 Options:", options);
      console.log("🔍 Query:", query);

      /*FOR FRONTEND
      if (options.date) {
        const startDate = new Date(options.date);
        const endDate = new Date(Date.now());
        endDate.setDate(endDate.getDate() + 10);
        query["fixture.date"] = {
          $gte: startDate.toISOString(),
          $lt: endDate.toISOString(),
        };
      }
      */
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
        //"fixture.status.short": { $in: ["NS", "TBD"] },//FOR FRONTEND
        //"fixture.timestamp": { $gte: Math.floor(Date.now() / 1000) }, //FOR FRONTEND
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
        .limit(50)
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
        // "fixture.status.short": "LIVE", //FOR FRONTEND
      };

      if (league) {
        query.tournament_id = league;
      }

      const matches = await Models.Match.find(query)
        .sort({ "averageTeamRating.away": -1 }) //FOR FRONTEND changed from timestamp to averageTeamRating
        .limit(5)
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
        //"fixture.status.short": { $in: ["LIVE", "HT"] }, //FOR FRONTEND
      })
        .sort({ "tablePosition.home": -1 }) //FOR FRONTEND changed from timestamp
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
      const mappedStatsData = await this.mapStatsData(matchDetails.statisticsData);

      // Get team stats for both teams from Team schema
      const teamStatsData = await this.getTeamStatsForMatch(match);

      // Get head-to-head matches
      const headToHeadData = await this.getHeadToHeadMatches(
        match.teams?.home?.id,
        match.teams?.away?.id,
        match.korastats_id,
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
        statisticsData: mappedStatsData || [],

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
          clean_sheet: homeTeam.stats?.clean_sheet?.total || 0,
          form: this.calculateFormScore(homeTeam.stats?.form || ""),
          win_streak: homeTeam.stats?.biggest?.streak?.wins || 0,
          goals_scored: homeTeam.stats?.goals?.for_?.total?.total || 0,
          goals_conceded: homeTeam.stats?.goals?.against?.total?.total || 0,
          consistency: this.calculateConsistency(homeTeam.stats),
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
          clean_sheet: awayTeam.stats?.clean_sheet?.total || 0,
          form: this.calculateFormScore(awayTeam.stats?.form || ""),
          win_streak: awayTeam.stats?.biggest?.streak?.wins || 0,
          goals_scored: awayTeam.stats?.goals?.for_?.total?.total || 0,
          goals_conceded: awayTeam.stats?.goals?.against?.total?.total || 0,
          consistency: this.calculateConsistency(awayTeam.stats),
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
  private mapStatsData(statsData: any[]): FixtureStatsData[] {
    if (!statsData || !Array.isArray(statsData)) {
      return [];
    }

    return statsData.map((teamStats) => {
      // Keep the team property unchanged
      const mappedStats = {
        team: teamStats.team,
        statistics: [],
      };

      // Create a mapping from database stat types to StatType
      const statTypeMapping: Record<string, string> = {
        // Goals and Shots
        Goals: "Shots on Goal",
        Shots: "Total Shots",
        "Shots on Target": "Shots on Goal",

        // Passes
        Passes: "Total passes",
        "Pass Success": "Passes accurate",
        "Pass Accuracy": "Passes %",

        // Direct matches
        "Yellow Cards": "Yellow Cards",
        "Red Cards": "Red Cards",
        Fouls: "Fouls",
        Offsides: "Offsides",

        // Other mappings
        Corners: "Corner Kicks",
        Saves: "Goalkeeper Saves",
        "Possession %": "Ball Possession",

        // Additional possible mappings based on your data
        "Goals Conceded": "Shots off Goal", // Approximate mapping
        Blocks: "Blocked Shots",
      };

      // Map each statistic
      if (teamStats.statistics && Array.isArray(teamStats.statistics)) {
        mappedStats.statistics = teamStats.statistics
          .map((stat) => {
            const mappedType = statTypeMapping[stat.type];

            // Only include statistics that have a valid mapping to StatType
            if (mappedType) {
              return {
                type: mappedType as StatType,
                value: stat.value,
              };
            }

            return null;
          })
          .filter((stat) => stat !== null); // Remove null entries
      }

      return mappedStats;
    });
  }
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
      form: team.stats?.form || "",
      fixtures: team.stats?.fixtures || {
        played: { home: 0, away: 0, total: 0 },
        wins: { home: 0, away: 0, total: 0 },
        draws: { home: 0, away: 0, total: 0 },
        loses: { home: 0, away: 0, total: 0 },
      },
      goals: team.stats?.goals || {
        for_: {
          total: { home: 0, away: 0, total: 0 },
          average: { home: 0, away: 0, total: 0 },
        },
        against: {
          total: { home: 0, away: 0, total: 0 },
          average: { home: 0, away: 0, total: 0 },
        },
      },
      biggest: team.stats?.biggest || {
        streak: { wins: 0, draws: 0, loses: 0 },
      },
      clean_sheet: team.stats?.clean_sheet || { home: 0, away: 0, total: 0 },
      teamAttacking: team.stats?.team_attacking || {},
      teamPasses: team.stats?.team_passing || {},
      teamDefending: team.stats?.team_defending || {},
      teamOther: team.stats?.team_others || {},
      average_team_rating: team.stats?.average_team_rating || 0,
      rank: team.stats?.rank || 0,
    };
  }

  /**
   * Get head-to-head matches between two teams
   */
  private async getHeadToHeadMatches(
    homeTeamId: number,
    awayTeamId: number,
    currentMatchId: number,
  ) {
    try {
      if (!homeTeamId || !awayTeamId) {
        return [];
      }

      // Find matches between these teams
      const headToHeadMatches = await Models.Match.find({
        $and: [
          { korastats_id: { $ne: currentMatchId } },
          {
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

