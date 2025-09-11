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
          // DataCollectorService removed - using MongoDB only
          // Retry query after collection
          const retryMatches = await Models.Match.find(query)
            .sort({ date: -1 })
            .limit(100);

          if (retryMatches.length > 0) {
            const fixtures = await this.mapMatchesToFixtureData(retryMatches);
            this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
            return fixtures;
          }
        } catch (collectError) {
          console.error("Failed to collect fixture data:", collectError);
        }

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
        throw new ApiError(404, "Fixture not found");
      }

      // Get tournament info for league details
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

      // Map to detailed fixture format using real data from MongoDB
      const detailedFixture: FixtureDetailedResponse = {
        fixtureData: {
          fixture: {
            id: match.korastats_id,
            referee: match.officials.referee.name,
            timezone: "UTC",
            date: match.date.toISOString(),
            timestamp: Math.floor(match.date.getTime() / 1000),
            periods: {
              first: match.phases?.first_half?.start
                ? Math.floor(match.phases.first_half.start.getTime() / 1000)
                : null,
              second: match.phases?.second_half?.start
                ? Math.floor(match.phases.second_half.start.getTime() / 1000)
                : null,
            },
            venue: {
              id: match.venue.id,
              name: match.venue.name,
              city: match.venue.city || "",
            },
            status: {
              long: match.status.name,
              short: match.status.short,
              elapsed: null, // Would need to calculate from current time for live matches
            },
          },
          league: {
            id: match.tournament_id,
            name: tournament?.name || "Unknown League",
            country: tournament?.country?.name || "",
            logo: tournament?.logo || "",
            flag: null, // Tournament logo schema doesn't have flag field
            season: parseInt(match.season),
            round: match.round.toString(),
          },
          teams: {
            home: {
              id: match.teams.home.id,
              name: match.teams.home.name,
              logo: teamLogos.get(match.teams.home.id) || "",
              winner: match.teams.home.score > match.teams.away.score,
            },
            away: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              logo: teamLogos.get(match.teams.away.id) || "",
              winner: match.teams.away.score > match.teams.home.score,
            },
          },
          goals: {
            home: match.teams.home.score,
            away: match.teams.away.score,
          },
          score: {
            halftime: {
              home: match.phases?.first_half?.score?.home || null,
              away: match.phases?.first_half?.score?.away || null,
            },
            fulltime: {
              home: match.teams.home.score,
              away: match.teams.away.score,
            },
            extratime: {
              home: match.phases?.extra_time?.score?.home || null,
              away: match.phases?.extra_time?.score?.away || null,
            },
            penalty: {
              home: match.phases?.penalties?.home || null,
              away: match.phases?.penalties?.away || null,
            },
          },
          tablePosition: match.table_position || null,
          averageTeamRating: match.average_team_rating || null,
        },
        timelineData: await this.enrichEventsWithTeamLogos(match.events || []), // Use real events from MongoDB with team logos
        lineupsData: await this.enrichLineupsWithTeamLogos(match.lineups || []), // Use real lineups from MongoDB with team logos
        injuriesData: [], // Would need separate injuries collection
        playerStatsData: match.player_stats || [], // Use real player stats from MongoDB
        statisticsData: await this.enrichStatisticsWithTeamLogos(match.statistics || []), // Use real statistics from MongoDB with team logos
        headToHeadData: await this.getHeadToHeadData(
          match.teams.home.id,
          match.teams.away.id,
          match.tournament_id,
          match.season,
        ), // Get head-to-head matches
        teamStatsData: await this.getTeamStatsData(
          match.teams.home.id,
          match.teams.away.id,
          match.tournament_id,
          match.season,
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
      const match = await Models.Match.findOne({ korastats_id: fixtureId.toString() });

      if (!match) {
        throw new ApiError(404, "Fixture not found");
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
   * Get team logos for given team IDs
   */
  private async getTeamLogos(teamIds: number[]): Promise<Map<number, string>> {
    if (!teamIds || teamIds.length === 0) return new Map();

    const teams = await Models.Team.find({
      korastats_id: { $in: teamIds },
    }).select("korastats_id club.logo_url");

    const teamLogoMap = new Map<number, string>();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.club?.logo_url || "");
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

    // Get unique team IDs from events
    const teamIds = [...new Set(events.map((event) => event.team?.id).filter(Boolean))];

    if (teamIds.length === 0) return events;

    // Fetch team logos from team collection
    const teams = await Models.Team.find({
      korastats_id: { $in: teamIds },
    }).select("korastats_id club.logo_url");

    // Create a map for quick lookup
    const teamLogoMap = new Map();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.club?.logo_url || "");
    });

    // Enrich events with team logos
    return events.map((event) => ({
      ...event,
      team: {
        ...event.team,
        logo: teamLogoMap.get(event.team?.id) || "",
      },
    }));
  }

  /**
   * Enrich lineups with team logos from team collection
   */
  private async enrichLineupsWithTeamLogos(lineups: any[]): Promise<any[]> {
    if (!lineups || lineups.length === 0) return [];

    // Get unique team IDs from lineups
    const teamIds = [
      ...new Set(lineups.map((lineup) => lineup.team?.id).filter(Boolean)),
    ];

    if (teamIds.length === 0) return lineups;

    // Fetch team logos from team collection
    const teams = await Models.Team.find({
      korastats_id: { $in: teamIds },
    }).select("korastats_id club.logo_url");

    // Create a map for quick lookup
    const teamLogoMap = new Map();
    teams.forEach((team) => {
      teamLogoMap.set(team.korastats_id, team.club?.logo_url || "");
    });

    // Enrich lineups with team logos
    return lineups.map((lineup) => ({
      ...lineup,
      team: {
        ...lineup.team,
        logo: teamLogoMap.get(lineup.team?.id) || "",
      },
    }));
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
        "status.name": "Finished",
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
            referee: match.officials.referee.name,
            timezone: "UTC",
            date: match.date.toISOString(),
            timestamp: Math.floor(match.date.getTime() / 1000),
            periods: {
              first: match.phases?.first_half?.start
                ? Math.floor(match.phases.first_half.start.getTime() / 1000)
                : null,
              second: match.phases?.second_half?.start
                ? Math.floor(match.phases.second_half.start.getTime() / 1000)
                : null,
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
              logo: teamLogos.get(match.teams.home.id) || "",
              winner: match.teams.home.score > match.teams.away.score,
            },
            away: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              logo: teamLogos.get(match.teams.away.id) || "",
              winner: match.teams.away.score > match.teams.home.score,
            },
          },
          goals: {
            home: match.teams.home.score,
            away: match.teams.away.score,
          },
          score: {
            halftime: {
              home: match.phases?.first_half?.score?.home || null,
              away: match.phases?.first_half?.score?.away || null,
            },
            fulltime: {
              home: match.teams.home.score,
              away: match.teams.away.score,
            },
            extratime: {
              home: match.phases?.extra_time?.score?.home || null,
              away: match.phases?.extra_time?.score?.away || null,
            },
            penalty: {
              home: match.phases?.penalties?.home || null,
              away: match.phases?.penalties?.away || null,
            },
          },
          tablePosition: match.table_position || null,
          averageTeamRating: match.average_team_rating || null,
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
      const teamStats = await Models.TeamStats.find({
        team_id: { $in: [homeTeamId, awayTeamId] },
        tournament_id: tournamentId,
        season: season,
      });

      if (teamStats.length === 0) return [];

      // Get team and tournament info
      const teams = await Models.Team.find({
        korastats_id: { $in: [homeTeamId, awayTeamId] },
      }).select("korastats_id name club.logo_url");

      const tournament = await Models.Tournament.findOne({ korastats_id: tournamentId });

      // Create team info map
      const teamInfoMap = new Map();
      teams.forEach((team) => {
        teamInfoMap.set(team.korastats_id, {
          id: team.korastats_id,
          name: team.name,
          logo: team.club?.logo_url || "",
        });
      });

      // Transform to TeamStatsData format
      const teamStatsData = teamStats.map((stats) => {
        const teamInfo = teamInfoMap.get(stats.team_id);

        return {
          league: {
            id: tournamentId,
            name: tournament?.name || "Unknown League",
            country: tournament?.country?.name || "",
            logo: tournament?.logo || "",
            flag: null,
            season: parseInt(season),
          },
          team: teamInfo || {
            id: stats.team_id,
            name: stats.team_name || "Unknown Team",
            logo: "",
          },
          form: stats.form?.form_string || "-----",
          fixtures: {
            played: {
              home: 0, // Would need to calculate from individual match stats
              away: 0,
              total: stats.stats?.matches_played || 0,
            },
            wins: {
              home: 0,
              away: 0,
              total: stats.stats?.wins || 0,
            },
            draws: {
              home: 0,
              away: 0,
              total: stats.stats?.draws || 0,
            },
            loses: {
              home: 0,
              away: 0,
              total: stats.stats?.losses || 0,
            },
          },
          goals: {
            for: {
              total: {
                home: stats.goals?.home_for || 0,
                away: stats.goals?.away_for || 0,
                total: stats.stats?.goals_for || 0,
              },
            },
            against: {
              total: {
                home: stats.goals?.home_against || 0,
                away: stats.goals?.away_against || 0,
                total: stats.stats?.goals_against || 0,
              },
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
          id: match.korastats_id,
          referee: match.officials.referee.name,
          timezone: "UTC",
          date: match.date.toISOString(),
          timestamp: Math.floor(match.date.getTime() / 1000),
          periods: {
            first: match.phases?.first_half?.start
              ? Math.floor(match.phases.first_half.start.getTime() / 1000)
              : null,
            second: match.phases?.second_half?.start
              ? Math.floor(match.phases.second_half.start.getTime() / 1000)
              : null,
          },
          venue: {
            id: match.venue.id,
            name: match.venue.name,
            city: match.venue.city || "",
          },
          status: {
            long: match.status.name,
            short: match.status.short,
            elapsed: null, // Would need to calculate from current time for live matches
          },
        },
        league: {
          id: match.tournament_id,
          name: tournament?.name || "Unknown League",
          country: tournament?.country?.name || "",
          logo: leagueLogo || "",
          flag: null, // Tournament schema doesn't have flag field
          season: parseInt(match.season),
          round: match.round.toString(),
        },
        teams: {
          home: {
            id: match.teams.home.id,
            name: match.teams.home.name,
            logo: teamLogos.get(match.teams.home.id) || "",
            winner: match.teams.home.score > match.teams.away.score,
          },
          away: {
            id: match.teams.away.id,
            name: match.teams.away.name,
            logo: teamLogos.get(match.teams.away.id) || "",
            winner: match.teams.away.score > match.teams.home.score,
          },
        },
        goals: {
          home: match.teams.home.score,
          away: match.teams.away.score,
        },
        score: {
          halftime: {
            home: match.phases?.first_half?.score?.home || null,
            away: match.phases?.first_half?.score?.away || null,
          },
          fulltime: {
            home: match.teams.home.score,
            away: match.teams.away.score,
          },
          extratime: {
            home: match.phases?.extra_time?.score?.home || null,
            away: match.phases?.extra_time?.score?.away || null,
          },
          penalty: {
            home: match.phases?.penalties?.home || null,
            away: match.phases?.penalties?.away || null,
          },
        },
        tablePosition: match.table_position || null,
        averageTeamRating: match.average_team_rating || null,
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
}

