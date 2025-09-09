import Joi from "joi";

// Based on Excel sheet parameters
export const refereeValidationSchemas = {
  // GET /api/referee/ - league (query), season (query)
  getReferees: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/referee/available-seasons/ - referee (query)
  getAvailableSeasons: Joi.object({
    referee: Joi.number().integer().positive().required(),
  }),

  // GET /api/referee/career-stats/ - referee (query), season (query)
  getCareerStats: Joi.object({
    referee: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/referee/fixtures/ - league (query), referee (query), season (query)
  getRefereeFixtures: Joi.object({
    league: Joi.number().integer().positive().required(),
    referee: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/referee/info/ - referee (query)
  getRefereeInfo: Joi.object({
    referee: Joi.number().integer().positive().required(),
  }),

  // GET /api/referee/last-match/ - referee (query)
  getRefereeLastMatch: Joi.object({
    referee: Joi.number().integer().positive().required(),
  }),
};

