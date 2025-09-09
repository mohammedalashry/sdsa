// src/modules/fixtures/validators/fixtures.validator.ts
import Joi from "joi";

// Based on Excel sheet parameters
export const fixturesValidationSchemas = {
  // GET /api/fixture/ - date (query), league (query), round (query), season (query)
  getFixtures: Joi.object({
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    league: Joi.number().integer().positive().required(),
    round: Joi.string().optional(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/fixture/comparison/ - fixture (query)
  getFixtureComparison: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/details/ - id (query)
  getFixtureDetails: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/heatmap/ - fixture (query)
  getFixtureHeatmap: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/highlights/ - fixture (query)
  getFixtureHighlights: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/live/ - league (query)
  getLiveFixtures: Joi.object({
    league: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/momentum/ - fixture (query)
  getFixtureMomentum: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/prediction/ - fixture (query)
  getFixturePrediction: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/results/ - league (query), round (query), season (query)
  getFixtureResults: Joi.object({
    league: Joi.number().integer().positive().required(),
    round: Joi.string().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/fixture/shotmap/ - fixture (query)
  getFixtureShotmap: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/top-performers/ - fixture (query)
  getFixtureTopPerformers: Joi.object({
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/fixture/upcoming/ - league (query), season (query)
  getUpcomingFixtures: Joi.object({
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/fixture/:id - id (params)
  getFixtureById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

