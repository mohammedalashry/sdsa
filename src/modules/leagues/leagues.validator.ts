import Joi from "joi";

// Based on Excel sheet parameters
export const leaguesValidationSchemas = {
  // GET /api/league/ - (None)
  getLeagues: Joi.object({}),

  // GET /api/league/historical-winners/ - league (query)
  getHistoricalWinners: Joi.object({
    league: Joi.number().integer().positive().required(),
  }),

  // GET /api/league/last-fixture/ - league (query)
  getLastFixture: Joi.object({
    league: Joi.number().integer().positive().required(),
  }),

  // GET /api/league/rounds/ - league (query), season (query)
  getLeagueRounds: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),
};

