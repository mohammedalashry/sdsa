// src/modules/fixtures/repositories/fixtures.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
// import { DataCollectorService } from "../../syncer/data-collector.service"; // Removed - using MongoDB only
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
} from "../../legacy-types/fixtures.types";

export class FixturesRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /fixture/ - Main fixture listing
   */
  async getFixtures(options: {
    league: number;
    season?: number;
    round?: string;
    date?: string;
    status?: string;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `fixtures_${options.league}_${options.season || "all"}_${options.round || "all"}_${options.date || "all"}_${options.status || "all"}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Build MongoDB query
      const query: any = {
        tournament_id: options.league,
      };

      if (options.season) {
        // Convert season number to string format (e.g., 2024 -> "2024/2025")
        const seasonString = `${options.season}/${options.season + 1}`;
        query.season = seasonString;
      }

      if (options.round) {
        query.round = parseInt(options.round);
      }

      if (options.date) {
        const date = new Date(options.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }

      if (options.status) {
        if (options.status === "live" || options.status === "LIVE") {
          query["status.name"] = { $in: ["Live", "In Play"] };
        } else if (options.status === "finished" || options.status === "FT") {
          query["status.name"] = "Finished";
        } else if (options.status === "upcoming" || options.status === "NS") {
          query["status.name"] = { $in: ["Scheduled", "Not Started"] };
        }
      }

      // Get matches from MongoDB
      const matches = await Models.Match.find(query).sort({ date: -1 }).limit(30);

      if (matches.length === 0) {
        console.log(`📦 No fixtures found in MongoDB for league ${options.league}`);
        return [];
      }

      const fixtures = await this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch fixtures:", error);
      return [];
    }
  }

  /**
   * GET /fixture/comparison/ - Compare two fixtures
   */
  async getFixtureComparison(fixtureId: number): Promise<FixtureComparisonResponse> {
    try {
      const cacheKey = `fixture_comparison_${fixtureId}`;

      const cached = this.cacheService.get<FixtureComparisonResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get fixture from MongoDB
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Extract statistics from match data if available
      const statistics = match.statistics || [];
      const homeStats = statistics.find(
        (stat) => stat.team?.id === match.teams?.home?.id,
      );
      const awayStats = statistics.find(
        (stat) => stat.team?.id === match.teams?.away?.id,
      );

      // Helper function to get statistic value by type
      const getStatValue = (stats: any, type: string): string => {
        if (!stats?.statistics) return "0";
        const stat = stats.statistics.find((s: any) => s.type === type);
        return stat?.value?.toString() || "0";
      };

      // Build comparison from actual match data
      const comparison: FixtureComparisonResponse = [
        {
          type: "possession",
          name: "Ball Possession",
          home: getStatValue(homeStats, "possession") || "0%",
          away: getStatValue(awayStats, "possession") || "0%",
        },
        {
          type: "shots",
          name: "Total Shots",
          home: getStatValue(homeStats, "shots") || "0",
          away: getStatValue(awayStats, "shots") || "0",
        },
        {
          type: "shots_on_target",
          name: "Shots on Target",
          home: getStatValue(homeStats, "shots_on_target") || "0",
          away: getStatValue(awayStats, "shots_on_target") || "0",
        },
        {
          type: "passes",
          name: "Total Passes",
          home: getStatValue(homeStats, "passes") || "0",
          away: getStatValue(awayStats, "passes") || "0",
        },
        {
          type: "pass_accuracy",
          name: "Pass Accuracy",
          home: getStatValue(homeStats, "pass_accuracy") || "0%",
          away: getStatValue(awayStats, "pass_accuracy") || "0%",
        },

        {
          type: "corners",
          name: "Corner Kicks",
          home: getStatValue(homeStats, "corners") || "0",
          away: getStatValue(awayStats, "corners") || "0",
        },
        {
          type: "fouls",
          name: "Fouls",
          home: getStatValue(homeStats, "fouls") || "0",
          away: getStatValue(awayStats, "fouls") || "0",
        },
        {
          type: "cards",
          name: "Cards",
          home: getStatValue(homeStats, "cards") || "0",
          away: getStatValue(awayStats, "cards") || "0",
        },
      ];

      this.cacheService.set(cacheKey, comparison, 30 * 60 * 1000); // Cache for 30 minutes
      return comparison;
    } catch (error) {
      console.error("Failed to fetch fixture comparison:", error);
      return [];
    }
  }

  /**
   * GET /fixture/details/ - Get detailed fixture information
   */
  async getFixtureDetails(fixtureId: number): Promise<FixtureDetailedResponse> {
    try {
      const cacheKey = `fixture_details_${fixtureId}`;

      const cached = this.cacheService.get<FixtureDetailedResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get match from MongoDB
      const match = await Models.Match.findOne({ korastats_id: fixtureId });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Convert Mongoose document to plain object to avoid internal properties
      const matchData = match.toObject();

      // Get tournament info for league details
      const tournament = await Models.Tournament.findOne({
        korastats_id: matchData.tournament_id,
      });

      // Get league logo from tournament schema
      const leagueLogo = tournament?.logo || "";

      // Get team data for logos and ranks
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: matchData.teams.home.id }),
        Models.Team.findOne({ korastats_id: matchData.teams.away.id }),
      ]);

      const teamLogos = new Map();
      if (homeTeam) teamLogos.set(matchData.teams.home.id, homeTeam.logo || "");
      if (awayTeam) teamLogos.set(matchData.teams.away.id, awayTeam.logo || "");

      // Map to detailed fixture format using real data from MongoDB
      const detailedFixture: FixtureDetailedResponse = {
        fixtureData: {
          fixture: {
            id: matchData.korastats_id,
            referee: await this.enrichRefereeData(matchData.referee),
            timezone: "UTC",
            date: matchData.date,
            timestamp: matchData.timestamp,
            periods: {
              first: matchData.periods?.first || null,
              second: matchData.periods?.second || null,
            },
            venue: {
              id: matchData.venue?.id || null,
              name: matchData.venue?.name || null,
              city: matchData.venue?.city || null,
            },
            status: {
              long: matchData.status?.long || "Finished",
              short: matchData.status?.short || "FT",
              elapsed: matchData.status?.elapsed || null,
            },
          },
          league: {
            id: matchData.league?.id || matchData.tournament_id,
            name: matchData.league?.name || tournament?.name || "Unknown League",
            country:
              matchData.league?.country || tournament?.country?.name || "Saudi Arabia",
            logo: tournament?.logo || "",
            flag: null,
            season: matchData.league?.season || parseInt(matchData.season),
            round: matchData.league?.round || matchData.round.toString(),
          },
          teams: {
            home: {
              id: matchData.teams.home.id,
              name: matchData.teams.home.name,
              winner: matchData.teams.home.winner,
              logo: teamLogos.get(matchData.teams.home.id) || "",
            },
            away: {
              id: matchData.teams.away.id,
              name: matchData.teams.away.name,
              winner: matchData.teams.away.winner,
              logo: teamLogos.get(matchData.teams.away.id) || "",
            },
          },
          goals: {
            home: matchData.goals?.home || null,
            away: matchData.goals?.away || null,
          },
          score: {
            halftime: {
              home: matchData.score?.halftime?.home ?? matchData.goals?.home ?? null,
              away: matchData.score?.halftime?.away ?? matchData.goals?.away ?? null,
            },
            fulltime: {
              home: matchData.score?.fulltime?.home ?? matchData.goals?.home ?? null,
              away: matchData.score?.fulltime?.away ?? matchData.goals?.away ?? null,
            },
            extratime: {
              home: matchData.score?.extratime?.home || null,
              away: matchData.score?.extratime?.away || null,
            },
            penalty: {
              home: matchData.score?.penalty?.home || null,
              away: matchData.score?.penalty?.away || null,
            },
          },
          tablePosition: {
            home: homeTeam?.rank || null,
            away: awayTeam?.rank || null,
          },
          averageTeamRating: matchData.averageTeamRating || null,
        },
        timelineData: await this.enrichEventsWithTeamLogos(matchData.events || []),
        lineupsData: await this.enrichLineupsWithTeamLogos(matchData.lineups || []),
        injuriesData: [],
        playerStatsData: await this.enrichPlayerStatsWithPhotos(
          matchData.playersStats || [],
        ),

        statisticsData: await this.enrichStatisticsWithTeamLogos(
          matchData.statistics || [],
        ),
        headToHeadData: await this.getHeadToHeadData(
          matchData.teams.home.id,
          matchData.teams.away.id,
          matchData.tournament_id,
          matchData.season,
        ), // Get head-to-head matches
        teamStatsData: await this.getTeamStatsData(
          matchData.teams.home.id,
          matchData.teams.away.id,
          matchData.tournament_id,
          matchData.season,
        ), // Get team stats data
      };

      this.cacheService.set(cacheKey, detailedFixture, 30 * 60 * 1000); // Cache for 30 minutes
      return detailedFixture;
    } catch (error) {
      console.error("Failed to fetch fixture details:", error);
      throw new ApiError(500, "Failed to fetch fixture details");
    }
  }

  /**
   * GET /fixture/heatmap/ - Get fixture heatmap data
   */
  async getFixtureHeatmap(fixtureId: number): Promise<FixtureHeatmapResponse> {
    try {
      const cacheKey = `fixture_heatmap_${fixtureId}`;

      const cached = this.cacheService.get<FixtureHeatmapResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get match from MongoDB to retrieve actual heatmap data
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get team data for logos and winner status
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: match.teams?.home?.id }),
        Models.Team.findOne({ korastats_id: match.teams?.away?.id }),
      ]);

      // Map heatmap data to the correct format with enriched team information
      const heatmap: FixtureHeatmapResponse = (match.heatmaps || []).map(
        (heatmapData) => {
          const isHomeTeam = heatmapData.team.id === match.teams?.home?.id;
          const teamData = isHomeTeam ? homeTeam : awayTeam;
          const matchTeamData = isHomeTeam ? match.teams?.home : match.teams?.away;

          return {
            team: {
              id: heatmapData.team.id,
              name: heatmapData.team.name,
              logo: teamData?.logo || "",
              winner: matchTeamData?.winner || false,
            },
            heatmap: heatmapData.heatmap,
          };
        },
      );

      this.cacheService.set(cacheKey, heatmap, 60 * 60 * 1000); // Cache for 1 hour
      return heatmap;
    } catch (error) {
      console.error("Failed to fetch fixture heatmap:", error);
      return [];
    }
  }

  /**
   * GET /fixture/landing-live/ - Get live fixtures for landing page
   */
  async getLandingLiveFixtures(): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `landing_live_fixtures`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get live matches from MongoDB
      const matches = await Models.Match.find({
        "status.name": { $in: ["Live", "In Play"] },
        date: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Last 2 hours
      })
        .sort({ date: -1 })
        .limit(20);

      const fixtures = await this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 1 * 60 * 1000); // Cache for 1 minute (live data)
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch landing live fixtures:", error);
      return [];
    }
  }

  /**
   * GET /fixture/live/ - Get live fixtures
   */
  async getLiveFixtures(league: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `live_fixtures_${league}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get live matches for specific league
      const matches = await Models.Match.find({
        tournament_id: league,
        "status.name": { $in: ["Live", "In Play"] },
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = await this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 1 * 60 * 1000); // Cache for 1 minute (live data)
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch live fixtures:", error);
      return [];
    }
  }

  /**
   * GET /fixture/momentum/ - Get fixture momentum data
   */
  async getFixtureMomentum(fixtureId: number): Promise<FixtureMomentumResponse> {
    try {
      const cacheKey = `fixture_momentum_${fixtureId}`;

      const cached = this.cacheService.get<FixtureMomentumResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get fixture from MongoDB to provide actual data
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get team data for logos and names
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: match.teams?.home?.id }),
        Models.Team.findOne({ korastats_id: match.teams?.away?.id }),
      ]);

      // Use actual momentum data from match if available, otherwise provide default structure
      const momentum: FixtureMomentumResponse = {
        data: match.momentum?.data || [],
        home: {
          id: match.teams?.home?.id || 0,
          name: match.teams?.home?.name || "Unknown Team",
          logo: homeTeam?.logo || "",
          winner: match.teams?.home?.winner || false,
        },
        away: {
          id: match.teams?.away?.id || 0,
          name: match.teams?.away?.name || "Unknown Team",
          logo: awayTeam?.logo || "",
          winner: match.teams?.away?.winner || false,
        },
      };

      this.cacheService.set(cacheKey, momentum, 60 * 60 * 1000); // Cache for 1 hour
      return momentum;
    } catch (error) {
      console.error("Failed to fetch fixture momentum:", error);
      return {
        data: [],
        home: {
          id: 0,
          name: "Unknown Team",
          logo: "",
          winner: false,
        },
        away: {
          id: 0,
          name: "Unknown Team",
          logo: "",
          winner: false,
        },
      };
    }
  }

  /**
   * GET /fixture/prediction/ - Get fixture prediction
   */
  async getFixturePrediction(fixtureId: number): Promise<FixturePredictionsResponse> {
    try {
      const cacheKey = `fixture_prediction_${fixtureId}`;

      const cached = this.cacheService.get<FixturePredictionsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get fixture from MongoDB to provide actual data
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get tournament data for league info
      const tournament = await Models.Tournament.findOne({
        korastats_id: match.tournament_id,
      });

      // Get team data for logos and names
      const [homeTeam, awayTeam] = await Promise.all([
        Models.Team.findOne({ korastats_id: match.teams?.home?.id }),
        Models.Team.findOne({ korastats_id: match.teams?.away?.id }),
      ]);

      // Return structured prediction data with actual match information
      const prediction: FixturePredictionsResponse = {
        predictions: {
          winner: {
            id: match.teams?.home?.winner
              ? match.teams.home.id
              : match.teams?.away?.winner
                ? match.teams.away.id
                : 0,
            name: match.teams?.home?.winner
              ? match.teams.home.name
              : match.teams?.away?.winner
                ? match.teams.away.name
                : "Draw",
            comment: "Based on match result",
          },
          win_or_draw: false,
          under_over: "2.5",
          goals: {
            home: match.goals?.home?.toString() || "0",
            away: match.goals?.away?.toString() || "0",
          },
          advice: "Match completed",
          percent: {
            home: "50",
            draw: "25",
            away: "25",
          },
        },
        league: {
          id: match.tournament_id || 0,
          name: tournament?.name || "Unknown League",
          country: tournament?.country?.name || "Saudi Arabia",
          logo: tournament?.logo || "",
          flag: "",
          season: parseInt(match.season) || 2024,
        },
        teams: {
          home: {
            id: match.teams?.home?.id || 0,
            name: match.teams?.home?.name || "Unknown Team",
            logo: homeTeam?.logo || "",
            winner: match.teams?.home?.winner || false,
          },
          away: {
            id: match.teams?.away?.id || 0,
            name: match.teams?.away?.name || "Unknown Team",
            logo: awayTeam?.logo || "",
            winner: match.teams?.away?.winner || false,
          },
        },
        comparison: [],
      };

      this.cacheService.set(cacheKey, prediction, 60 * 60 * 1000); // Cache for 1 hour
      return prediction;
    } catch (error) {
      console.error("Failed to fetch fixture prediction:", error);
      return {
        predictions: {
          winner: {
            id: null,
            name: "",
            comment: "",
          },
          win_or_draw: false,
          under_over: null,
          goals: {
            home: "",
            away: "",
          },
          advice: "",
          percent: {
            home: "",
            draw: "",
            away: "",
          },
        },
        league: {
          id: 0,
          name: "",
          country: "",
          logo: "",
          flag: "",
          season: 0,
        },
        teams: {
          home: {
            id: 0,
            name: "",
            logo: "",
            winner: null,
          },
          away: {
            id: 0,
            name: "",
            logo: "",
            winner: null,
          },
        },
        comparison: [],
      };
    }
  }

  /**
   * GET /fixture/results/ - Get fixture results
   */
  async getFixtureResults(options: {
    league: number;
    round: string;
    season: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `fixture_results_${options.league}_${options.season}_${options.round}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get finished matches for specific round
      const matches = await Models.Match.find({
        tournament_id: options.league,
        season: options.season.toString(),
        round: parseInt(options.round),
        "status.name": "Finished",
      })
        .sort({ date: -1 })
        .limit(50);

      const fixtures = await this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 30 * 60 * 1000); // Cache for 30 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch fixture results:", error);
      return [];
    }
  }

  /**
   * GET /fixture/shotmap/ - Get fixture shotmap
   */
  async getFixtureShotmap(fixtureId: number): Promise<FixtureShotmapResponse> {
    try {
      const cacheKey = `fixture_shotmap_${fixtureId}`;

      const cached = this.cacheService.get<FixtureShotmapResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex shotmap calculation
      // For now, return empty array
      const shotmap: FixtureShotmapResponse = [];

      this.cacheService.set(cacheKey, shotmap, 60 * 60 * 1000); // Cache for 1 hour
      return shotmap;
    } catch (error) {
      console.error("Failed to fetch fixture shotmap:", error);
      return [];
    }
  }

  /**
   * GET /fixture/top-performers/ - Get top performers for fixture
   */
  async getFixtureTopPerformers(
    fixtureId: number,
  ): Promise<FixtureTopPerformersResponse> {
    try {
      const cacheKey = `fixture_top_performers_${fixtureId}`;

      const cached = this.cacheService.get<FixtureTopPerformersResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get match from MongoDB
      const match = await Models.Match.findOne({ korastats_id: fixtureId });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get tournament info for league details
      const tournament = await Models.Tournament.findOne({
        korastats_id: match.tournament_id,
      });

      // Get team logos
      const teamLogos = await this.getTeamLogos([
        match.teams.home.id,
        match.teams.away.id,
      ]);

      // Return actual top performers data from the match
      const topPerformers: FixtureTopPerformersResponse = {
        league: {
          name: tournament?.name || "Unknown League",
          logo: tournament?.logo || "",
          season: parseInt(match.season) || 0,
        },
        homeTeam: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: teamLogos.get(match.teams.home.id) || "",
          winner: match.teams.home.winner,
        },
        awayTeam: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: teamLogos.get(match.teams.away.id) || "",
          winner: match.teams.away.winner,
        },
        topScorer: match.topPerformers?.topScorer
          ? {
              homePlayer: {
                id: match.topPerformers.topScorer.homePlayer.id,
                name: match.topPerformers.topScorer.homePlayer.name,
                photo: "", // Photo not available in schema
              },
              awayPlayer: {
                id: match.topPerformers.topScorer.awayPlayer.id,
                name: match.topPerformers.topScorer.awayPlayer.name,
                photo: "", // Photo not available in schema
              },
              stats: match.topPerformers.topScorer.stats,
            }
          : {
              homePlayer: { id: 0, name: "No Data", photo: "" },
              awayPlayer: { id: 0, name: "No Data", photo: "" },
              stats: [],
            },
        topAssister: match.topPerformers?.topAssister
          ? {
              homePlayer: {
                id: match.topPerformers.topAssister.homePlayer.id,
                name: match.topPerformers.topAssister.homePlayer.name,
                photo: "", // Photo not available in schema
              },
              awayPlayer: {
                id: match.topPerformers.topAssister.awayPlayer.id,
                name: match.topPerformers.topAssister.awayPlayer.name,
                photo: "", // Photo not available in schema
              },
              stats: match.topPerformers.topAssister.stats,
            }
          : {
              homePlayer: { id: 0, name: "No Data", photo: "" },
              awayPlayer: { id: 0, name: "No Data", photo: "" },
              stats: [],
            },
        topKeeper: match.topPerformers?.topKeeper
          ? {
              homePlayer: {
                id: match.topPerformers.topKeeper.homePlayer.id,
                name: match.topPerformers.topKeeper.homePlayer.name,
                photo: "", // Photo not available in schema
              },
              awayPlayer: {
                id: match.topPerformers.topKeeper.awayPlayer.id,
                name: match.topPerformers.topKeeper.awayPlayer.name,
                photo: "", // Photo not available in schema
              },
              stats: match.topPerformers.topKeeper.stats,
            }
          : {
              homePlayer: { id: 0, name: "No Data", photo: "" },
              awayPlayer: { id: 0, name: "No Data", photo: "" },
              stats: [],
            },
      };

      this.cacheService.set(cacheKey, topPerformers, 60 * 60 * 1000); // Cache for 1 hour
      return topPerformers;
    } catch (error) {
      console.error("Failed to fetch fixture top performers:", error);
      throw new ApiError(500, "Failed to fetch fixture top performers");
    }
  }

  /**
   * GET /fixture/upcoming/ - Get upcoming fixtures
   */
  async getUpcomingFixtures(options: {
    league: number;
    season: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `upcoming_fixtures_${options.league}_${options.season}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get upcoming matches
      const matches = await Models.Match.find({
        tournament_id: options.league,
        season: options.season.toString(),
        date: { $gte: new Date() },
        "status.name": { $in: ["Scheduled", "Not Started"] },
      })
        .sort({ date: 1 })
        .limit(50);

      const fixtures = await this.mapMatchesToFixtureData(matches);
      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch upcoming fixtures:", error);
      return [];
    }
  }

  /**
   * GET /fixture/:id - Get fixture by ID (legacy route)
   */
  async getFixtureById(fixtureId: number): Promise<FixtureDetailedResponse> {
    return await this.getFixtureDetails(fixtureId);
  }

  /**
   * GET /fixture/highlights/ - Get fixture highlights
   */
  async getFixtureHighlights(fixtureId: number): Promise<FixtureHighlightsResponse> {
    try {
      const cacheKey = `fixture_highlights_${fixtureId}`;

      const cached = this.cacheService.get<FixtureHighlightsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get match from MongoDB to check if it exists
      const match = await Models.Match.findOne({ korastats_id: fixtureId });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
      }

      // Return actual highlights data from the match
      const highlights: FixtureHighlightsResponse = {
        host: match.highlights?.host || "youtube-channel",
        url: match.highlights?.url || "https://youtube.com/@saudisportscompany",
      };

      this.cacheService.set(cacheKey, highlights, 60 * 60 * 1000); // Cache for 1 hour
      return highlights;
    } catch (error) {
      console.error("Failed to fetch fixture highlights:", error);
      throw new ApiError(500, "Failed to fetch fixture highlights");
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Get team logos for given team IDs
   */
  private async getTeamLogos(teamIds: number[]): Promise<Map<number, string>> {
    if (!teamIds || teamIds.length === 0) return new Map();

    const teams = await Models.Team.find({
      korastats_id: { $in: teamIds },
    }).select("korastats_id logo");

    const teamLogoMap = new Map<number, string>();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.logo || "");
    });

    return teamLogoMap;
  }

  /**
   * Enrich statistics with team logos from team collection
   */
  private async enrichStatisticsWithTeamLogos(statistics: any[]): Promise<any[]> {
    if (!statistics || statistics.length === 0) return [];

    // Get unique team IDs from statistics
    const teamIds = [...new Set(statistics.map((stat) => stat.team?.id).filter(Boolean))];

    if (teamIds.length === 0) return statistics;

    // Get team logos
    const teamLogos = await this.getTeamLogos(teamIds);

    // Enrich statistics with team logos
    return statistics.map((stat) => ({
      ...stat,
      team: {
        ...stat.team,
        logo: teamLogos.get(stat.team?.id) || "",
      },
    }));
  }

  /**
   * Enrich events with team logos from team collection
   */
  private async enrichEventsWithTeamLogos(events: any[]): Promise<any[]> {
    if (!events || events.length === 0) return [];

    // Clean and deduplicate events
    const cleanedEvents = this.cleanAndDeduplicateEvents(events);

    // Get unique team IDs from events
    const teamIds = [
      ...new Set(cleanedEvents.map((event) => event.team?.id).filter(Boolean)),
    ];

    if (teamIds.length === 0) return cleanedEvents;

    // Fetch team logos from team collection
    const teams = await Models.Team.find({
      korastats_id: { $in: teamIds },
    }).select("korastats_id logo");

    // Create a map for quick lookup
    const teamLogoMap = new Map();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.logo || "");
    });

    // Enrich events with team logos and clean structure
    return cleanedEvents.map((event) => ({
      time: {
        elapsed: Math.round(event.time?.elapsed || 0),
        extra: event.time?.extra || null,
      },
      team: {
        id: event.team?.id || 0,
        name: event.team?.name || "Unknown Team",
        logo: teamLogoMap.get(event.team?.id) || "",
      },
      player: {
        id: event.player?.id || 0,
        name: event.player?.name || "Unknown Player",
      },
      assist: event.assist
        ? {
            id: event.assist.id || 0,
            name: event.assist.name || "Unknown Player",
          }
        : {
            id: null,
            name: null,
          },
      type: event.type || "Unknown",
      detail: event.detail || "Unknown",
      comments: event.comments || null,
    }));
  }

  /**
   * Clean and deduplicate events, sort by time
   */
  private cleanAndDeduplicateEvents(events: any[]): any[] {
    // Convert Mongoose documents to plain objects and remove internal data
    const cleanEvents = events.map((event) => {
      // Convert to plain object if it's a Mongoose document
      const plainEvent = event.toObject ? event.toObject() : event;

      // Remove Mongoose internal properties
      const { __parentArray, __index, $__parent, _id, __v, ...cleanEvent } = plainEvent;
      return cleanEvent;
    });

    // Remove duplicates based on time, team, player, and type
    const seen = new Set();
    const uniqueEvents = cleanEvents.filter((event) => {
      const key = `${event.time?.elapsed}-${event.team?.id}-${event.player?.id}-${event.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by elapsed time
    return uniqueEvents.sort((a, b) => {
      const timeA = a.time?.elapsed || 0;
      const timeB = b.time?.elapsed || 0;
      return timeA - timeB;
    });
  }

  /**
   * Enrich lineups with team logos from team collection
   */
  private async enrichLineupsWithTeamLogos(lineups: any[]): Promise<any[]> {
    if (!lineups || lineups.length === 0) return [];

    // Get unique team IDs and coach IDs from lineups
    const teamIds = [
      ...new Set(lineups.map((lineup) => lineup.team?.id).filter(Boolean)),
    ];
    const coachIds = [
      ...new Set(lineups.map((lineup) => lineup.coach?.id).filter(Boolean)),
    ];

    if (teamIds.length === 0) return lineups;

    // Fetch team logos and coach data
    const [teams, coaches] = await Promise.all([
      Models.Team.find({
        korastats_id: { $in: teamIds },
      }).select("korastats_id logo"),
      Models.Coach.find({
        korastats_id: { $in: coachIds },
      }).select("korastats_id name photo firstname lastname"),
    ]);

    // Create maps for quick lookup
    const teamLogoMap = new Map();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.logo || "");
    });

    const coachDataMap = new Map();
    coaches.forEach((coach) => {
      coachDataMap.set(coach.korastats_id, {
        name: coach.name || "Unknown Coach",
        photo: coach.photo || "",
        firstname: coach.firstname || "",
        lastname: coach.lastname || "",
      });
    });

    // Enrich lineups with team logos and coach data
    return lineups.map((lineup) => {
      const coachInfo = lineup.coach?.id ? coachDataMap.get(lineup.coach.id) : null;

      return {
        ...lineup,
        team: {
          ...lineup.team,
          logo: teamLogoMap.get(lineup.team?.id) || "",
        },
        coach: coachInfo
          ? {
              id: lineup.coach.id,
              name: coachInfo.name,
              firstname: coachInfo.firstname,
              lastname: coachInfo.lastname,
              photo: coachInfo.photo,
            }
          : lineup.coach,
      };
    });
  }

  /**
   * Get head-to-head data between two teams
   */
  private async getHeadToHeadData(
    homeTeamId: number,
    awayTeamId: number,
    tournamentId: number,
    season: string,
  ): Promise<any[]> {
    try {
      // Find matches between these two teams in the same tournament and season
      const headToHeadMatches = await Models.Match.find({
        tournament_id: tournamentId,
        season: season,
        $or: [
          { "teams.home.id": homeTeamId, "teams.away.id": awayTeamId },
          { "teams.home.id": awayTeamId, "teams.away.id": homeTeamId },
        ],
        "status.short": "FT", // Match Finished
      })
        .sort({ date: -1 })
        .limit(10); // Last 10 matches between these teams

      if (headToHeadMatches.length === 0) return [];

      // Get team logos
      const teamLogos = await this.getTeamLogos([homeTeamId, awayTeamId]);

      // Transform to FixtureData format
      const headToHeadData = [];
      for (const match of headToHeadMatches) {
        const tournament = await Models.Tournament.findOne({
          korastats_id: match.tournament_id,
        });

        headToHeadData.push({
          fixture: {
            id: match.korastats_id,
            referee: match.referee.name,
            timezone: "UTC",
            date: match.date,
            timestamp: match.timestamp,
            periods: {
              first: match.periods.first,
              second: match.periods.second,
            },
            venue: {
              id: match.venue.id,
              name: match.venue.name,
              city: "",
            },
            status: {
              long: match.status.long,
              short: match.status.short,
              elapsed: null,
            },
          },
          league: {
            id: match.tournament_id,
            name: tournament?.name || "Unknown League",
            country: tournament?.country?.name || "",
            logo: tournament?.logo || "",
            flag: null,
            season: parseInt(match.season),
            round: match.round.toString(),
          },
          teams: {
            home: {
              id: match.teams.home.id,
              name: match.teams.home.name,
              winner: match.teams.home.winner,
              logo: teamLogos.get(match.teams.home.id) || "",
            },
            away: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              winner: match.teams.away.winner,
              logo: teamLogos.get(match.teams.away.id) || "",
            },
          },
          goals: match.goals,
          score: match.score,
          tablePosition: null,
          averageTeamRating: match.averageTeamRating || null,
        });
      }

      return headToHeadData;
    } catch (error) {
      console.error("Failed to fetch head-to-head data:", error);
      return [];
    }
  }

  /**
   * Get team stats data for both teams
   */
  private async getTeamStatsData(
    homeTeamId: number,
    awayTeamId: number,
    tournamentId: number,
    season: string,
  ): Promise<any[]> {
    try {
      // Get team stats for both teams
      const teamStats = await Models.Team.find({
        korastats_id: { $in: [homeTeamId, awayTeamId] },
      });

      if (teamStats.length === 0) return [];

      // Get team and tournament info
      const teams = await Models.Team.find({
        korastats_id: { $in: [homeTeamId, awayTeamId] },
      }).select("korastats_id name logo");

      const tournament = await Models.Tournament.findOne({ korastats_id: tournamentId });

      // Create team info map
      const teamInfoMap = new Map();
      teams.forEach((team) => {
        teamInfoMap.set(team.korastats_id, {
          id: team.korastats_id,
          name: team.name,
          logo: team.logo || "",
        });
      });

      // Transform to TeamStatsData format
      const teamStatsData = teamStats.map((stats) => {
        const teamInfo = teamInfoMap.get(stats.korastats_id);

        return {
          league: tournament
            ? {
                id: tournament.korastats_id,
                name: tournament.name,
                country: tournament.country,
                logo: tournament.logo || "",
                flag: null, // Will be populated from country schema
                season: parseInt(season),
              }
            : {
                id: tournamentId,
                name: "Unknown League",
                country: "",
                logo: "",
                flag: null,
                season: parseInt(season),
              },
          team: teamInfo || {
            id: stats.korastats_id,
            name: stats.name || "Unknown Team",
            logo: "",
          },
          form: "-----", // Will be calculated from recent matches
          fixtures: {
            played: {
              home: stats.stats_summary?.gamesPlayed?.home || 0,
              away: stats.stats_summary?.gamesPlayed?.away || 0,
              total:
                (stats.stats_summary?.gamesPlayed?.home || 0) +
                (stats.stats_summary?.gamesPlayed?.away || 0),
            },
            wins: {
              home: stats.stats_summary?.wins?.home || 0,
              away: stats.stats_summary?.wins?.away || 0,
              total:
                (stats.stats_summary?.wins?.home || 0) +
                (stats.stats_summary?.wins?.away || 0),
            },
            draws: {
              home: stats.stats_summary?.draws?.home || 0,
              away: stats.stats_summary?.draws?.away || 0,
              total:
                (stats.stats_summary?.draws?.home || 0) +
                (stats.stats_summary?.draws?.away || 0),
            },
            loses: {
              home: stats.stats_summary?.loses?.home || 0,
              away: stats.stats_summary?.loses?.away || 0,
              total:
                (stats.stats_summary?.loses?.home || 0) +
                (stats.stats_summary?.loses?.away || 0),
            },
          },
          goals: {
            for: {
              home: stats.stats_summary?.goalsScored?.home || 0,
              away: stats.stats_summary?.goalsScored?.away || 0,
              total:
                (stats.stats_summary?.goalsScored?.home || 0) +
                (stats.stats_summary?.goalsScored?.away || 0),
            },
            against: {
              home: stats.stats_summary?.goalsConceded?.home || 0,
              away: stats.stats_summary?.goalsConceded?.away || 0,
              total:
                (stats.stats_summary?.goalsConceded?.home || 0) +
                (stats.stats_summary?.goalsConceded?.away || 0),
            },
          },
          biggest: {
            streak: {
              wins: 0, // Would need to calculate
              draws: 0,
              loses: 0,
            },
            wins: { home: "0-0", away: "0-0" },
            loses: { home: "0-0", away: "0-0" },
            goals: {
              for: { home: 0, away: 0 },
              against: { home: 0, away: 0 },
            },
          },
          clean_sheet: { home: 0, away: 0, total: 0 },
          failed_to_score: { home: 0, away: 0, total: 0 },
          penalty: {
            scored: { total: 0, percentage: "0%" },
            missed: { total: 0, percentage: "0%" },
            total: 0,
          },
          lineups: [],
          cards: {
            yellow: {},
            red: {},
          },
        };
      });

      return teamStatsData;
    } catch (error) {
      console.error("Failed to fetch team stats data:", error);
      return [];
    }
  }

  /**
   * Map MongoDB matches to FixtureData format
   */
  private async mapMatchesToFixtureData(matches: any[]): Promise<FixtureDataResponse> {
    const fixtures = [];

    for (const match of matches) {
      // Get tournament info for each match
      const tournament = await Models.Tournament.findOne({
        korastats_id: match.tournament_id,
      });

      // Get league logo from tournament schema
      const leagueLogo = tournament?.logo || "";

      // Get team logos for home and away teams
      const teamLogos = await this.getTeamLogos([
        match.teams.home.id,
        match.teams.away.id,
      ]);

      fixtures.push({
        fixture: {
          id: match.id,
          referee: match.referee.name,
          timezone: "UTC",
          date: match.date,
          timestamp: match.timestamp,
          periods: match.periods,
          venue: match.venue,
          status: match.status,
        },
        league: match.league,
        teams: {
          home: {
            id: match.teams.home.id,
            name: match.teams.home.name,
            logo: teamLogos.get(match.teams.home.id) || "",
            winner: match.goals.home > match.goals.away,
          },
          away: {
            id: match.teams.away.id,
            name: match.teams.away.name,
            logo: teamLogos.get(match.teams.away.id) || "",
            winner: match.goals.away > match.goals.home,
          },
        },
        goals: match.goals,
        score: {
          halftime: {
            home: match.score.halftime.home,
            away: match.score.halftime.away,
          },
          fulltime: match.score.fulltime,
          extratime: {
            home: match.score.extratime.home,
            away: match.score.extratime.away,
          },
          penalty: {
            home: match.score.penalty.home,
            away: match.score.penalty.away,
          },
        },
        tablePosition: null,
        averageTeamRating: match.averageTeamRating || null,
      });
    }

    return fixtures;
  }

  //   /**
  //    * Get upcoming fixtures
  //    */
  //   async getUpcomingFixturesFromMongoDB(params: {
  //     league: number;
  //     season: number;
  //   }): Promise<FixtureData[]> {
  //     return this.getFixturesFromMongoDB({
  //       ...params,
  //       status: "upcoming",
  //     });
  //   }

  //   /**
  //    * Get finished fixtures
  //    */
  //   async getFinishedFixturesFromMongoDB(params: {
  //     league: number;
  //     season: number;
  //     last?: number;
  //   }): Promise<FixtureData[]> {
  //     const fixtures = await this.getFixturesFromMongoDB({
  //       league: params.league,
  //       season: params.season,
  //       status: "finished",
  //     });

  //     // Apply 'last' limit if specified
  //     if (params.last && params.last > 0) {
  //       return fixtures.slice(0, params.last);
  //     }

  //     return fixtures;
  //   }

  //   /**
  //    * Get detailed fixture information
  //    */
  //   async getFixtureDetailsFromMongoDB(fixtureId: number): Promise<FixtureDetailed | null> {
  //     console.log(`🔍 Getting detailed info for fixture ${fixtureId} from MongoDB`);

  //     try {
  //       // Get match data from MongoDB
  //       const rawMatch = await this.mongoStorage.getMatchById(fixtureId);

  //       if (!rawMatch) {
  //         console.warn(`⚠️ Match ${fixtureId} not found in MongoDB`);
  //         return null;
  //       }

  //       // Map to detailed fixture format
  //       const detailedFixture = await this.fixtureMapper.mapToFixtureDetailed(rawMatch);

  //       console.log(`✅ Successfully mapped detailed fixture ${fixtureId}`);
  //       return detailedFixture;
  //     } catch (error) {
  //       console.error(`❌ Failed to get fixture details for ${fixtureId}:`, error);
  //       return null;
  //     }
  //   }
  // }

  /**
   * Enrich player stats with photos from player collection
   */
  private async enrichPlayerStatsWithPhotos(playerStats: any[]): Promise<any[]> {
    if (!playerStats || playerStats.length === 0) return [];

    // Get all unique player IDs
    const playerIds = [...new Set(playerStats.map((stat) => stat.player.id))];

    // Fetch player data from Player model (including photos and clean names)
    const players = await Models.Player.find({
      korastats_id: { $in: playerIds },
    }).select("korastats_id name photo firstname lastname");

    const playerData = new Map();
    players.forEach((player) => {
      playerData.set(player.korastats_id, {
        name: player.name || "Unknown Player",
        photo: player.photo || "",
        firstname: player.firstname || "",
        lastname: player.lastname || "",
      });
    });

    // Return player stats with enriched data
    return playerStats.map((stat) => {
      const playerInfo = playerData.get(stat.player.id) || {
        name: stat.player.name || "Unknown Player",
        photo: "",
        firstname: "",
        lastname: "",
      };

      return {
        player: {
          id: stat.player.id,
          name: playerInfo.name,
          firstname: playerInfo.firstname,
          lastname: playerInfo.lastname,
          number: stat.player.number,
          photo: playerInfo.photo,
        },
        statistics: stat.player.statistics,
      };
    });
  }

  /**
   * Enrich referee data with photo and clean name
   */
  private async enrichRefereeData(referee: any): Promise<string> {
    if (!referee?.id) return "Unknown Referee";

    try {
      // Get referee data from Referee model
      const refereeData = await Models.Referee.findOne({
        korastats_id: referee.id,
      }).select("name photo firstname lastname");

      if (refereeData) {
        return refereeData.name || referee.name || "Unknown Referee";
      }

      return referee.name || "Unknown Referee";
    } catch (error) {
      console.warn(`Failed to enrich referee data for ID ${referee.id}:`, error.message);
      return referee.name || "Unknown Referee";
    }
  }
}

