import Joi from "joi";

// Based on Excel sheet parameters
export const teamsValidationSchemas = {
  // GET /api/team/ - league (query), season (query)
  getTeams: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/team/available-seasons/ - team (query)
  getAvailableSeasons: Joi.object({
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/comparison/stats/ - season (query), team (query)
  getTeamComparisonStats: Joi.object({
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/fixtures/ - league (query), season (query), team (query)
  getTeamFixtures: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // POST /api/team/follow-team/ - team_id (body)
  followTeam: Joi.object({
    team_id: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/is-following/ - team_id (query)
  isFollowingTeam: Joi.object({
    team_id: Joi.number().integer().positive().required(),
  }),

  // POST /api/team/unfollow-team/ - team_id (body)
  unfollowTeam: Joi.object({
    team_id: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/form-over-time/ - league (query), page (query), pageSize (query), season (query), team (query)
  getTeamFormOverTime: Joi.object({
    league: Joi.number().integer().positive().required(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/form-overview/ - league (query), season (query), team (query)
  getTeamFormOverview: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/upcoming-fixture/ - team (query)
  getUpcomingFixture: Joi.object({
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/stats/ - league (query), season (query), team (query)
  getTeamStats: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/squad/ - team (query)
  getTeamSquad: Joi.object({
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/position-overtime/ - league (query), season (query), team (query)
  getTeamPositionOverTime: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/last-fixture/ - team (query)
  getLastFixture: Joi.object({
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/info/ - team (query)
  getTeamInfo: Joi.object({
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/goals-over-time/ - league (query), season (query), team (query)
  getTeamGoalsOverTime: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/team/lineup/ - league (query), season (query), team (query)
  getTeamLineup: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),
};

