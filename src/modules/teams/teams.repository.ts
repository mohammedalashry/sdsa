import { TeamKorastatsService } from "@/integrations/korastats/services/team.service";
import { TeamMapper } from "@/mappers/team.mapper";
import { CacheService } from "@/integrations/korastats/services/cache.service";
import { TeamDataResponse, TeamInfo } from "@/legacy-types/teams.types";
import { FixtureDataResponse } from "@/legacy-types/fixtures.types";
import { ApiError } from "@/core/middleware/error.middleware";
import { IntegrationFactory } from "@/integrations/korastats/integration.factory";
import { Models } from "@/db/mogodb/models";
import { DataCollectorService } from "@/mappers/data-collector.service";

export class TeamsRepository {
  private readonly integrationService = IntegrationFactory.getIntegrationService();
  private readonly dataCollectorService = new DataCollectorService();

  constructor(
    private readonly korastatsTeamService: TeamKorastatsService,
    private readonly cacheService: CacheService,
  ) {}

  async getTeamsList(league: number, season: string): Promise<TeamDataResponse> {
    const cacheKey = this.cacheService.createKey("teams", "list", league, season);

    // Try cache first
    let cachedData = this.cacheService.get<TeamDataResponse>(cacheKey);
    if (cachedData) {
      console.log("Teams list served from cache");
      return cachedData;
    }

    try {
      // Try to get teams from MongoDB first
      const mongoTeams = await Models.Team.find({
        // Add any filters based on league/season if needed
        status: "active",
      }).limit(50); // Limit for performance

      if (mongoTeams.length > 0) {
        console.log(`📦 Found ${mongoTeams.length} teams in MongoDB`);

        // Transform MongoDB teams to legacy format
        const teams = mongoTeams.map((team) => ({
          team: {
            id: team.korastats_id,
            name: team.name,
            code: team.short_name || "",
            country: team.country.name,
            founded: team.club?.founded_year || null,
            national: team.club?.is_national_team || false,
            logo: team.club?.logo_url || "",
          },
          venue: team.stadium
            ? {
                id: team.stadium.id,
                name: team.stadium.name,
                address: null,
                city: team.stadium.city || "",
                capacity: team.stadium.capacity || null,
                surface: team.stadium.surface || null,
                image: null,
              }
            : {
                id: null,
                name: null,
                address: null,
                city: null,
                capacity: null,
                surface: null,
                image: null,
              },
        }));

        const response: TeamDataResponse = teams;

        // Cache the result
        this.cacheService.set(cacheKey, response);
        return response;
      }

      // If no data in MongoDB, fallback to Korastats API
      console.log("No teams found in MongoDB, fetching from Korastats API");
      const korastatsTeams = await this.korastatsTeamService.getTeamsList(league, season);

      // Transform to legacy format
      const teams = korastatsTeams.map((team) => TeamMapper.toTeamData(team));

      const response: TeamDataResponse = teams;

      // Cache the result
      this.cacheService.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error("Failed to fetch teams list:", error);
      throw new ApiError(500, "Failed to fetch teams from data source");
    }
  }

  async getTeamInfo(teamId: number): Promise<TeamInfo> {
    const cacheKey = this.cacheService.createKey("teams", "info", teamId);

    // Try cache first
    let cachedData = this.cacheService.get<TeamInfo>(cacheKey);
    if (cachedData) {
      console.log("Team info served from cache");
      return cachedData;
    }

    try {
      // Try to get team from MongoDB first
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (mongoTeam) {
        console.log(`📦 Found team ${teamId} in MongoDB`);

        // Transform MongoDB team to legacy format
        const teamInfo: TeamInfo = {
          team: {
            id: mongoTeam.korastats_id,
            name: mongoTeam.name,
            code: mongoTeam.short_name || "",
            country: mongoTeam.country.name,
            founded: mongoTeam.club?.founded_year || null,
            national: mongoTeam.club?.is_national_team || false,
            logo: mongoTeam.club?.logo_url || "",
          },
          venue: mongoTeam.stadium
            ? {
                id: mongoTeam.stadium.id,
                name: mongoTeam.stadium.name,
                address: null,
                city: mongoTeam.stadium.city || "",
                capacity: mongoTeam.stadium.capacity || null,
                surface: mongoTeam.stadium.surface || null,
                image: null,
              }
            : {
                id: null,
                name: null,
                address: null,
                city: null,
                capacity: null,
                surface: null,
                image: null,
              },
          coach: mongoTeam.current_coach
            ? [
                {
                  id: mongoTeam.current_coach.id,
                  name: mongoTeam.current_coach.name,
                  firstname: null,
                  lastname: null,
                  age: null,
                  birth: {
                    date: null,
                    place: null,
                    country: mongoTeam.current_coach.nationality || "",
                  },
                  nationality: mongoTeam.current_coach.nationality || "",
                  height: null,
                  weight: null,
                  photo: "",
                  team: {
                    id: mongoTeam.korastats_id,
                    name: mongoTeam.name,
                    code: mongoTeam.short_name || "",
                    country: mongoTeam.country.name,
                    founded: mongoTeam.club?.founded_year || null,
                    national: mongoTeam.club?.is_national_team || false,
                    logo: mongoTeam.club?.logo_url || "",
                  },
                  career: [],
                },
              ]
            : [],
          transfers: [], // Would need separate collection
          totalPlayers: mongoTeam.current_squad?.length || 0,
          foreignPlayers: 0, // Would need to calculate
          averagePlayerAge: 0, // Would need to calculate
          clubMarketValue: null,
          currentLeagues: [], // Would need separate collection
          trophies: [], // Would need separate collection
        };

        this.cacheService.set(cacheKey, teamInfo);
        return teamInfo;
      }

      // If not in MongoDB, fallback to Korastats API
      console.log("Team not found in MongoDB, fetching from Korastats API");
      const [basicInfo, squad, transfers, trophies] = await Promise.allSettled([
        this.korastatsTeamService.getTeamInfo(teamId),
        this.korastatsTeamService.getTeamSquad(0, teamId),
        this.korastatsTeamService.getTeamTransfers(teamId),
        this.korastatsTeamService.getTeamTrophies(teamId),
      ]);

      if (basicInfo.status === "rejected") {
        throw new ApiError(404, "Team not found");
      }

      const squadData = squad.status === "fulfilled" ? squad.value : {};
      const transfersData = transfers.status === "fulfilled" ? transfers.value : [];
      const trophiesData = trophies.status === "fulfilled" ? trophies.value : [];

      const teamInfo = TeamMapper.toTeamInfo(
        basicInfo.value,
        squadData,
        transfersData,
        trophiesData,
      );

      this.cacheService.set(cacheKey, teamInfo);
      return teamInfo;
    } catch (error) {
      console.error("Failed to fetch team info:", error);
      throw new ApiError(500, "Failed to fetch team info");
    }
  }

  async getTeamStats(teamId: number, league: number, season: string): Promise<any> {
    const cacheKey = this.cacheService.createKey(
      "teams",
      "stats",
      teamId,
      league,
      season,
    );

    // Try cache first
    let cachedData = this.cacheService.get<any>(cacheKey);
    if (cachedData) {
      console.log("Team stats served from cache");
      return cachedData;
    }

    try {
      const korastatsStats = await this.korastatsTeamService.getTeamStats(
        league,
        teamId,
        season,
      );
      const stats = TeamMapper.toTeamStats(korastatsStats);

      // Cache the result
      this.cacheService.set(cacheKey, stats);

      return stats;
    } catch (error) {
      console.error("Failed to fetch team stats:", error);
      throw new ApiError(500, "Failed to fetch team statistics");
    }
  }

  // ========== NEW REPOSITORY METHODS FOR ALL ENDPOINTS ==========

  async getAvailableSeasons(teamId: number): Promise<number[]> {
    try {
      const cacheKey = `available_seasons_${teamId}`;

      const cached = this.cacheService.get<number[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get available seasons from MongoDB matches
      const seasons = await Models.Match.distinct("season", {
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
      });

      const seasonNumbers = seasons
        .map((season) => parseInt(season))
        .filter((year) => year >= 2000);
      seasonNumbers.sort((a, b) => b - a); // Most recent first

      this.cacheService.set(cacheKey, seasonNumbers, 60 * 60 * 1000); // Cache for 1 hour
      return seasonNumbers;
    } catch (error) {
      console.error("Failed to fetch available seasons:", error);
      throw new ApiError(500, "Failed to fetch available seasons");
    }
  }

  async getTeamComparisonStats(
    season: number,
    teamId: number,
  ): Promise<{
    team: { id: number; name: string };
    season: number;
    stats: any;
    form: any;
    goals: any;
    cards: any;
  }> {
    try {
      const cacheKey = `team_comparison_stats_${season}_${teamId}`;

      const cached = this.cacheService.get<{
        team: { id: number; name: string };
        season: number;
        stats: any;
        form: any;
        goals: any;
        cards: any;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team stats from MongoDB
      const teamStats = await Models.TeamStats.findOne({
        team_id: teamId,
        season: season.toString(),
      });

      if (!teamStats) {
        // Return default stats if not found
        return {
          team: {
            id: teamId,
            name: "Unknown Team",
          },
          season: season,
          stats: {
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            goal_difference: 0,
            points: 0,
            position: 0,
          },
          form: {
            recent_results: [],
            form_string: "",
            points_from_last_5: 0,
          },
          goals: {
            total_for: 0,
            total_against: 0,
            home_for: 0,
            home_against: 0,
            away_for: 0,
            away_against: 0,
          },
          cards: {
            total_yellow: 0,
            total_red: 0,
            home_yellow: 0,
            home_red: 0,
            away_yellow: 0,
            away_red: 0,
          },
        };
      }

      const result = {
        team: {
          id: teamId,
          name: teamStats.team_name || "Unknown Team",
        },
        season: season,
        stats: teamStats.stats || {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          position: 0,
        },
        form: teamStats.form || {
          recent_results: [],
          form_string: "",
          points_from_last_5: 0,
        },
        goals: teamStats.goals || {
          total_for: 0,
          total_against: 0,
          home_for: 0,
          home_against: 0,
          away_for: 0,
          away_against: 0,
        },
        cards: teamStats.cards || {
          total_yellow: 0,
          total_red: 0,
          home_yellow: 0,
          home_red: 0,
          away_yellow: 0,
          away_red: 0,
        },
      };

      this.cacheService.set(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error("Failed to fetch team comparison stats:", error);
      // Return default stats if error occurs
      return {
        team: {
          id: teamId,
          name: "Unknown Team",
        },
        season: season,
        stats: {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          position: 0,
        },
        form: {
          recent_results: [],
          form_string: "",
          points_from_last_5: 0,
        },
        goals: {
          total_for: 0,
          total_against: 0,
          home_for: 0,
          home_against: 0,
          away_for: 0,
          away_against: 0,
        },
        cards: {
          total_yellow: 0,
          total_red: 0,
          home_yellow: 0,
          home_red: 0,
          away_yellow: 0,
          away_red: 0,
        },
      };
    }
  }

  async getTeamFixtures(
    teamId: number,
    league: number,
    season: string,
  ): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `team_fixtures_${teamId}_${league}_${season}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team fixtures from MongoDB
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        tournament_id: league,
        season: season,
      }).sort({ date: -1 });

      const fixtures = matches.map((match) => ({
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

      const response: FixtureDataResponse = fixtures;

      this.cacheService.set(cacheKey, response, 15 * 60 * 1000); // Cache for 15 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch team fixtures:", error);
      throw new ApiError(500, "Failed to fetch team fixtures");
    }
  }

  async followTeam(teamId: number): Promise<any> {
    // This would typically interact with a user preferences database
    // For now, return a success response
    return {
      success: true,
      message: "Team followed successfully",
      team_id: teamId,
    };
  }

  async isFollowingTeam(teamId: number): Promise<boolean> {
    // This would typically check a user preferences database
    // For now, return false
    return false;
  }

  async unfollowTeam(teamId: number): Promise<any> {
    // This would typically interact with a user preferences database
    // For now, return a success response
    return {
      success: true,
      message: "Team unfollowed successfully",
      team_id: teamId,
    };
  }

  async getTeamFormOverTime(
    league: number,
    season: number,
    teamId: number,
    page: number,
    pageSize: number,
  ): Promise<{
    team_id: number;
    season: number;
    form: Array<{
      match_id: number;
      date: Date;
      opponent: string;
      result: string;
      score: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }> {
    try {
      const cacheKey = `team_form_over_time_${league}_${season}_${teamId}_${page}_${pageSize}`;

      const cached = this.cacheService.get<{
        team_id: number;
        season: number;
        form: {
          match_id: number;
          date: Date;
          opponent: string;
          result: string;
          score: string;
        }[];
        pagination: { page: number; pageSize: number; total: number };
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team matches and calculate form over time
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        tournament_id: league,
        season: season.toString(),
      })
        .sort({ date: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const formData = matches.map((match) => {
        const isHome = match.teams.home.id === teamId;
        const teamScore = isHome ? match.teams.home.score : match.teams.away.score;
        const opponentScore = isHome ? match.teams.away.score : match.teams.home.score;

        let result = "D"; // Draw
        if (teamScore > opponentScore)
          result = "W"; // Win
        else if (teamScore < opponentScore) result = "L"; // Loss

        return {
          match_id: match.korastats_id,
          date: match.date,
          opponent: isHome ? match.teams.away.name : match.teams.home.name,
          result: result,
          score: `${teamScore}-${opponentScore}`,
        };
      });

      const result = {
        team_id: teamId,
        season: season,
        form: formData,
        pagination: {
          page: page,
          pageSize: pageSize,
          total: matches.length,
        },
      };

      this.cacheService.set(cacheKey, result, 15 * 60 * 1000); // Cache for 15 minutes
      return result;
    } catch (error) {
      console.error("Failed to fetch team form over time:", error);
      // Return default form over time if error occurs
      return {
        team_id: teamId,
        season: season,
        form: [],
        pagination: {
          page: page,
          pageSize: pageSize,
          total: 0,
        },
      };
    }
  }

  async getTeamFormOverview(
    league: number,
    season: number,
    teamId: number,
  ): Promise<{
    team_id: number;
    season: number;
    form: any;
    stats: any;
    recent_matches: any[];
  }> {
    try {
      const cacheKey = `team_form_overview_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<{
        team_id: number;
        season: number;
        form: any;
        stats: any;
        recent_matches: any[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team stats from MongoDB
      const teamStats = await Models.TeamStats.findOne({
        team_id: teamId,
        season: season.toString(),
      });

      if (!teamStats) {
        // Return default form overview if not found
        return {
          team_id: teamId,
          season: season,
          form: {
            recent_results: [],
            form_string: "",
            points_from_last_5: 0,
          },
          stats: {
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            goal_difference: 0,
            points: 0,
            position: 0,
          },
          recent_matches: [],
        };
      }

      const result = {
        team_id: teamId,
        season: season,
        form: teamStats.form || {
          recent_results: [],
          form_string: "",
          points_from_last_5: 0,
        },
        stats: teamStats.stats || {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          position: 0,
        },
        recent_matches: teamStats.recent_matches || [],
      };

      this.cacheService.set(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error("Failed to fetch team form overview:", error);
      // Return default form overview if error occurs
      return {
        team_id: teamId,
        season: season,
        form: {
          recent_results: [],
          form_string: "",
          points_from_last_5: 0,
        },
        stats: {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          position: 0,
        },
        recent_matches: [],
      };
    }
  }

  async getUpcomingFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `upcoming_fixture_${teamId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get next upcoming match for the team
      const upcomingMatch = await Models.Match.findOne({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        date: { $gt: new Date() },
        "status.name": { $in: ["Scheduled", "Not Started"] },
      }).sort({ date: 1 });

      if (!upcomingMatch) {
        return [];
      }

      const fixture = {
        fixture: {
          id: upcomingMatch.korastats_id,
          referee: upcomingMatch.officials.referee.name,
          timezone: "UTC",
          date: upcomingMatch.date.toISOString(),
          timestamp: Math.floor(upcomingMatch.date.getTime() / 1000),
          periods: { first: null, second: null },
          venue: {
            id: upcomingMatch.venue.id,
            name: upcomingMatch.venue.name,
            city: upcomingMatch.venue.city || "",
          },
          status: {
            long: upcomingMatch.status.name,
            short: upcomingMatch.status.short,
            elapsed: null,
          },
        },
        league: {
          id: upcomingMatch.tournament_id,
          name: "League Name",
          country: "",
          logo: "",
          flag: null,
          season: parseInt(upcomingMatch.season),
          round: upcomingMatch.round.toString(),
        },
        teams: {
          home: {
            id: upcomingMatch.teams.home.id,
            name: upcomingMatch.teams.home.name,
            logo: "",
            winner: null,
          },
          away: {
            id: upcomingMatch.teams.away.id,
            name: upcomingMatch.teams.away.name,
            logo: "",
            winner: null,
          },
        },
        goals: { home: null, away: null },
        score: {
          halftime: { home: null, away: null },
          fulltime: { home: null, away: null },
          extratime: { home: null, away: null },
          penalty: { home: null, away: null },
        },
        tablePosition: null,
        averageTeamRating: null,
      };

      const response: FixtureDataResponse = [fixture];

      this.cacheService.set(cacheKey, response, 5 * 60 * 1000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch upcoming fixture:", error);
      // Return empty array if error occurs
      return [];
    }
  }

  async getTeamPositionOverTime(
    league: number,
    season: number,
    teamId: number,
  ): Promise<{
    team_id: number;
    season: number;
    positions: Array<{
      matchday: number;
      position: number;
    }>;
  }> {
    try {
      const cacheKey = `team_position_over_time_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<{
        team_id: number;
        season: number;
        positions: { matchday: number; position: number }[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically calculate position changes over time
      // For now, return a mock response
      const result = {
        team_id: teamId,
        season: season,
        positions: [
          { matchday: 1, position: 5 },
          { matchday: 2, position: 3 },
          { matchday: 3, position: 2 },
          { matchday: 4, position: 1 },
        ],
      };

      this.cacheService.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error("Failed to fetch team position over time:", error);
      // Return default position over time if error occurs
      return {
        team_id: teamId,
        season: season,
        positions: [],
      };
    }
  }

  async getLastFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `last_fixture_${teamId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get last completed match for the team
      const lastMatch = await Models.Match.findOne({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        date: { $lt: new Date() },
        "status.name": "Finished",
      }).sort({ date: -1 });

      if (!lastMatch) {
        return [];
      }

      const fixture = {
        fixture: {
          id: lastMatch.korastats_id,
          referee: lastMatch.officials.referee.name,
          timezone: "UTC",
          date: lastMatch.date.toISOString(),
          timestamp: Math.floor(lastMatch.date.getTime() / 1000),
          periods: {
            first: null,
            second: null,
          },
          venue: {
            id: lastMatch.venue.id,
            name: lastMatch.venue.name,
            city: lastMatch.venue.city || "",
          },
          status: {
            long: lastMatch.status.name,
            short: lastMatch.status.short,
            elapsed: null,
          },
        },
        league: {
          id: lastMatch.tournament_id,
          name: "League Name",
          country: "",
          logo: "",
          flag: null,
          season: parseInt(lastMatch.season),
          round: lastMatch.round.toString(),
        },
        teams: {
          home: {
            id: lastMatch.teams.home.id,
            name: lastMatch.teams.home.name,
            logo: "",
            winner: lastMatch.teams.home.score > lastMatch.teams.away.score,
          },
          away: {
            id: lastMatch.teams.away.id,
            name: lastMatch.teams.away.name,
            logo: "",
            winner: lastMatch.teams.away.score > lastMatch.teams.home.score,
          },
        },
        goals: {
          home: lastMatch.teams.home.score,
          away: lastMatch.teams.away.score,
        },
        score: {
          halftime: { home: null, away: null },
          fulltime: {
            home: lastMatch.teams.home.score,
            away: lastMatch.teams.away.score,
          },
          extratime: { home: null, away: null },
          penalty: { home: null, away: null },
        },
        tablePosition: lastMatch.table_position || null,
        averageTeamRating: lastMatch.average_team_rating || null,
      };

      const response: FixtureDataResponse = [fixture];

      this.cacheService.set(cacheKey, response, 5 * 60 * 1000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch last fixture:", error);
      // Return empty array if error occurs
      return [];
    }
  }

  async getTeamGoalsOverTime(
    league: number,
    season: number,
    teamId: number,
  ): Promise<{
    team_id: number;
    season: number;
    goals_over_time: Array<{
      matchday: number;
      date: Date;
      goals_for: number;
      goals_against: number;
      goal_difference: number;
    }>;
  }> {
    try {
      const cacheKey = `team_goals_over_time_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<{
        team_id: number;
        season: number;
        goals_over_time: {
          matchday: number;
          date: Date;
          goals_for: number;
          goals_against: number;
          goal_difference: number;
        }[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team matches and calculate goals over time
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        tournament_id: league,
        season: season.toString(),
      }).sort({ date: 1 });

      const goalsData = matches.map((match, index) => {
        const isHome = match.teams.home.id === teamId;
        const teamGoals = isHome ? match.teams.home.score : match.teams.away.score;
        const opponentGoals = isHome ? match.teams.away.score : match.teams.home.score;

        return {
          matchday: index + 1,
          date: match.date,
          goals_for: teamGoals,
          goals_against: opponentGoals,
          goal_difference: teamGoals - opponentGoals,
        };
      });

      const result = {
        team_id: teamId,
        season: season,
        goals_over_time: goalsData,
      };

      this.cacheService.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error("Failed to fetch team goals over time:", error);
      // Return default goals over time if error occurs
      return {
        team_id: teamId,
        season: season,
        goals_over_time: [],
      };
    }
  }

  async getTeamSquad(teamId: number): Promise<{
    team_id: number;
    squad: Array<{
      player_id: number;
      player_name: string;
      jersey_number: number;
      position: string;
      joined_date: Date | null;
    }>;
  }> {
    try {
      const cacheKey = `team_squad_${teamId}`;

      const cached = this.cacheService.get<{
        team_id: number;
        squad: {
          player_id: number;
          player_name: string;
          jersey_number: number;
          position: string;
          joined_date: Date;
        }[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from MongoDB
      const team = await Models.Team.findOne({ korastats_id: teamId });

      if (!team || !team.current_squad) {
        return {
          team_id: teamId,
          squad: [],
        };
      }

      const result = {
        team_id: teamId,
        squad: team.current_squad.map((player) => ({
          player_id: player.player_id,
          player_name: player.player_name,
          jersey_number: player.jersey_number,
          position: player.position,
          joined_date: player.joined_date,
        })),
      };

      this.cacheService.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error("Failed to fetch team squad:", error);
      // Return default squad if error occurs
      return {
        team_id: teamId,
        squad: [],
      };
    }
  }

  async getTeamLineup(
    league: number,
    season: number,
    teamId: number,
  ): Promise<{
    team_id: number;
    season: number;
    lineup: any;
  }> {
    try {
      const cacheKey = `team_lineup_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<{
        team_id: number;
        season: number;
        lineup: any;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically fetch lineup data from MongoDB or Korastats
      // For now, return a mock response
      const result = {
        team_id: teamId,
        season: season,
        lineup: {
          formation: "4-3-3",
          players: [],
        },
      };

      this.cacheService.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
      return result;
    } catch (error) {
      console.error("Failed to fetch team lineup:", error);
      // Return default lineup if error occurs
      return {
        team_id: teamId,
        season: season,
        lineup: null,
      };
    }
  }
}

