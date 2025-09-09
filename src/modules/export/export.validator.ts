import Joi from "joi";

// Based on Excel sheet parameters
export const exportValidationSchemas = {
  // GET /api/export/coach-comparison-page/ - coach1 (query), coach2 (query), fileType (query)
  getCoachComparisonExport: Joi.object({
    coach1: Joi.number().integer().positive().required(),
    coach2: Joi.number().integer().positive().required(),
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
  }),

  // GET /api/export/homepage/ - fileType (query), league (query), season (query)
  getHomepageExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/export/leagues-cups/ - fileType (query)
  getLeaguesCupsExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
  }),

  // GET /api/export/leagues-cups-detail/ - fileType (query), league (query), round (query), season (query)
  getLeaguesCupsDetailExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    league: Joi.number().integer().positive().required(),
    round: Joi.string().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/export/leagues-teams/ - fileType (query)
  getLeaguesTeamsExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
  }),

  // GET /api/export/match-detail-page/ - fileType (query), fixture (query)
  getMatchDetailExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    fixture: Joi.number().integer().positive().required(),
  }),

  // GET /api/export/matches-page/ - fileType (query), league (query), round (query), season (query)
  getMatchesPageExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    league: Joi.number().integer().positive().required(),
    round: Joi.string().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/export/player-comparison-page/ - fileType (query), player1 (query), player2 (query)
  getPlayerComparisonExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    player1: Joi.number().integer().positive().required(),
    player2: Joi.number().integer().positive().required(),
  }),

  // GET /api/export/player-detail-page/ - fileType (query), league (query), player (query), season (query)
  getPlayerDetailExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    league: Joi.number().integer().positive().required(),
    player: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
  }),

  // GET /api/export/referee-comparison-page/ - fileType (query), referee1 (query), referee2 (query)
  getRefereeComparisonExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    referee1: Joi.number().integer().positive().required(),
    referee2: Joi.number().integer().positive().required(),
  }),

  // GET /api/export/team-comparison-page/ - fileType (query), season1 (query), season2 (query), team1 (query), team2 (query)
  getTeamComparisonExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    season1: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    season2: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team1: Joi.number().integer().positive().required(),
    team2: Joi.number().integer().positive().required(),
  }),

  // GET /api/export/team-detail-page/ - fileType (query), league (query), season (query), team (query)
  getTeamDetailExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    league: Joi.number().integer().positive().required(),
    season: Joi.number()
      .integer()
      .min(2000)
      .max(new Date().getFullYear() + 2)
      .required(),
    team: Joi.number().integer().positive().required(),
  }),

  // GET /api/export/upcoming-match-detail-page/ - fileType (query), fixture (query)
  getUpcomingMatchDetailExport: Joi.object({
    fileType: Joi.string().valid("pdf", "excel", "csv").required(),
    fixture: Joi.number().integer().positive().required(),
  }),
};

