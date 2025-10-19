import Joi from "joi";

export const exportValidationSchemas = {
  leaguesTeams: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
  }),

  homepage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    league: Joi.number().integer().required(),
    season: Joi.number().integer().required(),
  }),

  matchesPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    league: Joi.number().integer().required(),
    season: Joi.number().integer().required(),
    round: Joi.string().optional(),
  }),

  matchDetailPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    fixture: Joi.number().integer().required(),
  }),

  leaguesCups: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
  }),

  leaguesCupsDetail: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    league: Joi.number().integer().required(),
    season: Joi.number().integer().required(),
    round: Joi.number().integer().optional(),
  }),

  playerDetailPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    player: Joi.number().integer().required(),
    league: Joi.number().integer().required(),
    season: Joi.number().integer().required(),
  }),

  teamDetailPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    team: Joi.number().integer().required(),
    league: Joi.number().integer().required(),
    season: Joi.number().integer().required(),
  }),

  playerComparisonPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    player1: Joi.number().integer().required(),
    player2: Joi.number().integer().required(),
  }),

  teamComparisonPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    team1: Joi.number().integer().required(),
    team2: Joi.number().integer().required(),
    season1: Joi.number().integer().required(),
    season2: Joi.number().integer().required(),
  }),

  coachComparisonPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    coach1: Joi.number().integer().required(),
    coach2: Joi.number().integer().required(),
  }),

  refereeComparisonPage: Joi.object({
    fileType: Joi.string().valid("xlsx", "csv").default("xlsx"),
    referee1: Joi.number().integer().required(),
    referee2: Joi.number().integer().required(),
  }),
};

