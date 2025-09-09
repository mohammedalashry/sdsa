import Joi from "joi";

// Based on Excel sheet parameters
export const standingsValidationSchemas = {
  // GET /api/standings/ - league (query), season (query)
  getStandings: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),
};

