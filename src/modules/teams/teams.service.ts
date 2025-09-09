import { TeamsRepository } from "@/modules/teams/teams.repository";
import { TeamDataResponse, TeamInfo } from "@/legacy-types/teams.types";
import { FixtureDataResponse } from "@/legacy-types/fixtures.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class TeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  async getTeams(options: { league: number; season: number }): Promise<TeamDataResponse> {
    try {
      // Business logic: validate league and season
      if (!options.league || !options.season) {
        throw new ApiError(400, "League and season are required");
      }

      // Validate season format (should be 4-digit year)
      if (options.season < 2000 || options.season > new Date().getFullYear() + 2) {
        throw new ApiError(400, "Season must be a valid year");
      }

      // Fetch teams from repository using MongoDB
      const teams = await this.repository.getTeamsList(
        options.league,
        options.season.toString(),
      );

      return teams;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Teams service error:", error);
      throw new ApiError(500, "Failed to fetch teams");
    }
  }

  async getAvailableSeasons(teamId: number): Promise<number[]> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.getAvailableSeasons(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Available seasons service error:", error);
      throw new ApiError(500, "Failed to fetch available seasons");
    }
  }

  async getTeamComparisonStats(options: { season: number; team: number }): Promise<{
    team: { id: number; name: string };
    season: number;
    stats: any;
    form: any;
    goals: any;
    cards: any;
  }> {
    try {
      if (!options.season || !options.team) {
        throw new ApiError(400, "Season and team are required");
      }

      return await this.repository.getTeamComparisonStats(options.season, options.team);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team comparison stats service error:", error);
      throw new ApiError(500, "Failed to fetch team comparison stats");
    }
  }

  async getTeamFixtures(options: {
    league: number;
    season: number;
    team: number;
  }): Promise<FixtureDataResponse> {
    try {
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamFixtures(
        options.team,
        options.league,
        options.season.toString(),
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team fixtures service error:", error);
      throw new ApiError(500, "Failed to fetch team fixtures");
    }
  }

  async followTeam(teamId: number): Promise<any> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.followTeam(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Follow team service error:", error);
      throw new ApiError(500, "Failed to follow team");
    }
  }

  async isFollowingTeam(teamId: number): Promise<boolean> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.isFollowingTeam(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Is following team service error:", error);
      throw new ApiError(500, "Failed to check if following team");
    }
  }

  async unfollowTeam(teamId: number): Promise<any> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.unfollowTeam(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Unfollow team service error:", error);
      throw new ApiError(500, "Failed to unfollow team");
    }
  }

  async getTeamFormOverTime(options: {
    league: number;
    page: number;
    pageSize: number;
    season: number;
    team: number;
  }): Promise<{
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
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamFormOverTime(
        options.league,
        options.season,
        options.team,
        options.page,
        options.pageSize,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team form over time service error:", error);
      throw new ApiError(500, "Failed to fetch team form over time");
    }
  }

  async getTeamFormOverview(options: {
    league: number;
    season: number;
    team: number;
  }): Promise<{
    team_id: number;
    season: number;
    form: any;
    stats: any;
    recent_matches: any[];
  }> {
    try {
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamFormOverview(
        options.league,
        options.season,
        options.team,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team form overview service error:", error);
      throw new ApiError(500, "Failed to fetch team form overview");
    }
  }

  async getUpcomingFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.getUpcomingFixture(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Upcoming fixture service error:", error);
      throw new ApiError(500, "Failed to fetch upcoming fixture");
    }
  }

  async getTeamStats(options: { league: number; season: number; team: number }): Promise<{
    team_id: number;
    season: number;
    stats: any;
    form: any;
    goals: any;
    cards: any;
  }> {
    try {
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamStats(
        options.team,
        options.league,
        options.season.toString(),
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team stats service error:", error);
      throw new ApiError(500, "Failed to fetch team stats");
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
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.getTeamSquad(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team squad service error:", error);
      throw new ApiError(500, "Failed to fetch team squad");
    }
  }

  async getTeamPositionOverTime(options: {
    league: number;
    season: number;
    team: number;
  }): Promise<{
    team_id: number;
    season: number;
    positions: Array<{
      matchday: number;
      position: number;
    }>;
  }> {
    try {
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamPositionOverTime(
        options.league,
        options.season,
        options.team,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team position over time service error:", error);
      throw new ApiError(500, "Failed to fetch team position over time");
    }
  }

  async getLastFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.getLastFixture(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Last fixture service error:", error);
      throw new ApiError(500, "Failed to fetch last fixture");
    }
  }

  async getTeamInfo(teamId: number): Promise<TeamInfo> {
    try {
      if (!teamId || teamId <= 0) {
        throw new ApiError(400, "Valid team ID is required");
      }

      return await this.repository.getTeamInfo(teamId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team info service error:", error);
      throw new ApiError(500, "Failed to fetch team info");
    }
  }

  async getTeamGoalsOverTime(options: {
    league: number;
    season: number;
    team: number;
  }): Promise<{
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
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamGoalsOverTime(
        options.league,
        options.season,
        options.team,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team goals over time service error:", error);
      throw new ApiError(500, "Failed to fetch team goals over time");
    }
  }

  async getTeamLineup(options: {
    league: number;
    season: number;
    team: number;
  }): Promise<{
    team_id: number;
    season: number;
    lineup: any; // This would need proper typing based on lineup structure
  }> {
    try {
      if (!options.league || !options.season || !options.team) {
        throw new ApiError(400, "League, season, and team are required");
      }

      return await this.repository.getTeamLineup(
        options.league,
        options.season,
        options.team,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Team lineup service error:", error);
      throw new ApiError(500, "Failed to fetch team lineup");
    }
  }
}

