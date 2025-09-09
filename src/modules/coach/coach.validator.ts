import Joi from "joi";

// Based on Excel sheet parameters
export const coachValidationSchemas = {
  // GET /api/coach/ - league (query), season (query)
  getCoaches: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/coach/available-leagues/ - coach (query)
  getAvailableLeagues: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/career/ - coach (query)
  getCoachCareer: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/career_stats/ - coach (query)
  getCoachCareerStats: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/fixtures/ - coach (query)
  getCoachFixtures: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/info/ - coach (query)
  getCoachInfo: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/last-match/ - coach (query)
  getCoachLastMatch: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/match-stats/ - coach (query), league (query)
  getCoachMatchStats: Joi.object({
    coach: Joi.number().integer().positive().required(),
    league: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/performance/ - coach (query)
  getCoachPerformance: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/team-form/ - fixture (query)
  getCoachTeamForm: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/coach/trophies/ - coach (query)
  getCoachTrophies: Joi.object({
    coach: Joi.number().integer().positive().required(),
  }),
};

