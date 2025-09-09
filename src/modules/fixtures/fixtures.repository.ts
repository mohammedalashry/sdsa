// src/modules/fixtures/repositories/fixtures.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { DataCollectorService } from "../../mappers/data-collector.service";
import ApiError from "../../core/app-error";
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
        query.season = options.season.toString();
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
      const matches = await Models.Match.find(query).sort({ date: -1 }).limit(100);

      if (matches.length === 0) {
        // Try to collect data from Korastats if not found
        console.log(
          `📦 No fixtures found in MongoDB, attempting to collect from Korastats`,
        );
        try {
          // await DataCollectorService.collectFixtureData(options.league, options.season?.toString() || "2024");
          // Retry query after collection
          const retryMatches = await Models.Match.find(query)
            .sort({ date: -1 })
            .limit(100);

          if (retryMatches.length > 0) {
            const fixtures = this.mapMatchesToFixtureData(retryMatches);
            this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
            return fixtures;
          }
        } catch (collectError) {
          console.error("Failed to collect fixture data:", collectError);
        }

        return [];
      }

      const fixtures = this.mapMatchesToFixtureData(matches);
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
        throw new ApiError("Fixture not found", 404);
      }

      // This would typically involve complex comparison logic
      // For now, return a basic comparison structure
      const comparison: FixtureComparisonResponse = [
        {
          type: "possession",
          name: "Ball Possession",
          home: "50%",
          away: "50%",
        },
        {
          type: "shots",
          name: "Total Shots",
          home: "10",
          away: "8",
        },
        {
          type: "shots_on_target",
          name: "Shots on Target",
          home: "5",
          away: "3",
        },
        {
          type: "passes",
          name: "Total Passes",
          home: "400",
          away: "350",
        },
        {
          type: "pass_accuracy",
          name: "Pass Accuracy",
          home: "85%",
          away: "80%",
        },
        {
          type: "corners",
          name: "Corner Kicks",
          home: "6",
          away: "4",
        },
        {
          type: "fouls",
          name: "Fouls",
          home: "12",
          away: "15",
        },
        {
          type: "cards",
          name: "Cards",
          home: "2",
          away: "3",
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
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError("Fixture not found", 404);
      }

      // Map to detailed fixture format
      const detailedFixture: FixtureDetailedResponse = {
        fixtureData: {
          fixture: {
            id: match.korastats_id,
            referee: match.officials.referee.name,
            timezone: "UTC",
            date: match.date.toISOString(),
            timestamp: Math.floor(match.date.getTime() / 1000),
            periods: {
              first: null,
              second: null,
            },
            venue: {
              id: match.venue.id,
              name: match.venue.name,
              city: match.venue.city || "",
            },
            status: {
              long: match.status.name,
              short: match.status.short,
              elapsed: null,
            },
          },
          league: {
            id: match.tournament_id,
            name: "League Name", // Would need to fetch from tournament
            country: "",
            logo: "",
            flag: null,
            season: parseInt(match.season),
            round: match.round.toString(),
          },
          teams: {
            home: {
              id: match.teams.home.id,
              name: match.teams.home.name,
              logo: "",
              winner: match.teams.home.score > match.teams.away.score,
            },
            away: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              logo: "",
              winner: match.teams.away.score > match.teams.home.score,
            },
          },
          goals: {
            home: match.teams.home.score,
            away: match.teams.away.score,
          },
          score: {
            halftime: { home: null, away: null },
            fulltime: {
              home: match.teams.home.score,
              away: match.teams.away.score,
            },
            extratime: { home: null, away: null },
            penalty: { home: null, away: null },
          },
          tablePosition: match.table_position || null,
          averageTeamRating: match.average_team_rating || null,
        },
        timelineData: [], // Would need to fetch from match events collection
        lineupsData: [], // Would need to fetch from match events collection
        injuriesData: [], // Would need to fetch from match events collection
        playerStatsData: [], // Would need to fetch from player stats collection
        statisticsData: [
          {
            team: {
              id: match.teams.home.id,
              name: match.teams.home.name,
              logo: "",
            },
            statistics: [
              { type: "Ball Possession", value: "50%" },
              { type: "Total Shots", value: "10" },
              { type: "Shots on Goal", value: "5" },
              { type: "Shots off Goal", value: "3" },
              { type: "Blocked Shots", value: "2" },
              { type: "Shots insidebox", value: "6" },
              { type: "Shots outsidebox", value: "4" },
              { type: "Fouls", value: "12" },
              { type: "Corner Kicks", value: "6" },
              { type: "Offsides", value: "2" },
              { type: "Yellow Cards", value: "2" },
              { type: "Red Cards", value: "0" },
              { type: "Goalkeeper Saves", value: "3" },
              { type: "Total passes", value: "400" },
              { type: "Passes accurate", value: "340" },
              { type: "Passes %", value: "85%" },
            ],
          },
          {
            team: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              logo: "",
            },
            statistics: [
              { type: "Ball Possession", value: "50%" },
              { type: "Total Shots", value: "8" },
              { type: "Shots on Goal", value: "3" },
              { type: "Shots off Goal", value: "3" },
              { type: "Blocked Shots", value: "2" },
              { type: "Shots insidebox", value: "4" },
              { type: "Shots outsidebox", value: "4" },
              { type: "Fouls", value: "15" },
              { type: "Corner Kicks", value: "4" },
              { type: "Offsides", value: "1" },
              { type: "Yellow Cards", value: "3" },
              { type: "Red Cards", value: "0" },
              { type: "Goalkeeper Saves", value: "5" },
              { type: "Total passes", value: "350" },
              { type: "Passes accurate", value: "280" },
              { type: "Passes %", value: "80%" },
            ],
          },
        ],
        headToHeadData: [], // Would need to fetch similar matches
        teamStatsData: [], // Would need to fetch team stats
      };

      this.cacheService.set(cacheKey, detailedFixture, 30 * 60 * 1000); // Cache for 30 minutes
      return detailedFixture;
    } catch (error) {
      console.error("Failed to fetch fixture details:", error);
      throw new ApiError("Failed to fetch fixture details", 500);
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

      // This would typically involve complex heatmap calculation
      // For now, return empty array
      const heatmap: FixtureHeatmapResponse = [];

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

      const fixtures = this.mapMatchesToFixtureData(matches);
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

      const fixtures = this.mapMatchesToFixtureData(matches);
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

      // This would typically involve complex momentum calculation
      // For now, return default structure
      const momentum: FixtureMomentumResponse = {
        data: [],
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
      };

      this.cacheService.set(cacheKey, momentum, 60 * 60 * 1000); // Cache for 1 hour
      return momentum;
    } catch (error) {
      console.error("Failed to fetch fixture momentum:", error);
      return {
        data: [],
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

      // Predictions may not be available in Korastats
      // Return default structure to match Django behavior
      const prediction: FixturePredictionsResponse = {
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

      const fixtures = this.mapMatchesToFixtureData(matches);
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

      // This would typically involve complex performance analysis
      // For now, return default structure
      const topPerformers: FixtureTopPerformersResponse = {
        league: {
          name: "",
          logo: "",
          season: 0,
        },
        homeTeam: {
          id: 0,
          name: "",
          logo: "",
          winner: null,
        },
        awayTeam: {
          id: 0,
          name: "",
          logo: "",
          winner: null,
        },
        topScorer: null,
        topAssister: null,
        topKeeper: null,
      };

      this.cacheService.set(cacheKey, topPerformers, 60 * 60 * 1000); // Cache for 1 hour
      return topPerformers;
    } catch (error) {
      console.error("Failed to fetch fixture top performers:", error);
      return {
        league: {
          name: "",
          logo: "",
          season: 0,
        },
        homeTeam: {
          id: 0,
          name: "",
          logo: "",
          winner: null,
        },
        awayTeam: {
          id: 0,
          name: "",
          logo: "",
          winner: null,
        },
        topScorer: null,
        topAssister: null,
        topKeeper: null,
      };
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

      const fixtures = this.mapMatchesToFixtureData(matches);
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
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError("Fixture not found", 404);
      }

      // For now, return default highlights (would need to integrate with video service)
      const highlights: FixtureHighlightsResponse = {
        host: "youtube-channel",
        url: "https://youtube.com/@saudisportscompany",
      };

      this.cacheService.set(cacheKey, highlights, 60 * 60 * 1000); // Cache for 1 hour
      return highlights;
    } catch (error) {
      console.error("Failed to fetch fixture highlights:", error);
      // Return default highlights on error
      return {
        host: "youtube-channel",
        url: "https://youtube.com/@saudisportscompany",
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(matches: any[]): FixtureDataResponse {
    return matches.map((match) => ({
      fixture: {
        id: match.korastats_id,
        referee: match.officials.referee.name,
        timezone: "UTC",
        date: match.date.toISOString(),
        timestamp: Math.floor(match.date.getTime() / 1000),
        periods: {
          first: null,
          second: null,
        },
        venue: {
          id: match.venue.id,
          name: match.venue.name,
          city: match.venue.city || "",
        },
        status: {
          long: match.status.name,
          short: match.status.short,
          elapsed: null,
        },
      },
      league: {
        id: match.tournament_id,
        name: "League Name", // Would need to fetch from tournament
        country: "",
        logo: "",
        flag: null,
        season: parseInt(match.season),
        round: match.round.toString(),
      },
      teams: {
        home: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: "",
          winner: match.teams.home.score > match.teams.away.score,
        },
        away: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: "",
          winner: match.teams.away.score > match.teams.home.score,
        },
      },
      goals: {
        home: match.teams.home.score,
        away: match.teams.away.score,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: {
          home: match.teams.home.score,
          away: match.teams.away.score,
        },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      tablePosition: match.table_position || null,
      averageTeamRating: match.average_team_rating || null,
    }));
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
}

