import Joi from "joi";

// Based on Excel sheet parameters
export const playersValidationSchemas = {
  // GET /api/player/career/ - id (query)
  getPlayerCareer: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/comparison/stats/ - id (query)
  getPlayerComparisonStats: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/fixtures/ - id (query), league (query)
  getPlayerFixtures: Joi.object({
    id: Joi.number().integer().positive().required(),
    league: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/heatmap/ - league (query), player (query), season (query)
  getPlayerHeatmap: Joi.object({
    league: Joi.number().integer().positive().required(),
    player: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/player/info/ - id (query)
  getPlayerInfo: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/shotmap/ - player (query)
  getPlayerShotmap: Joi.object({
    player: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/stats/ - id (query), league (query), season (query)
  getPlayerStats: Joi.object({
    id: Joi.number().integer().positive().required(),
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/player/topassists/ - league (query), season (query)
  getTopAssists: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/player/topscorers/ - league (query), season (query)
  getTopScorers: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/player/traits/ - player (query)
  getPlayerTraits: Joi.object({
    player: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/transfer/ - player (query)
  getPlayerTransfer: Joi.object({
    player: Joi.number().integer().positive().required(),
  }),

  // GET /api/player/trophies/ - id (query)
  getPlayerTrophies: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

