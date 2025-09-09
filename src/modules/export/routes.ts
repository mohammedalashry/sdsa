import { Router } from "express";
import { ExportController } from "./export.controller";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { exportValidationSchemas } from "./export.validator";

const router = Router();
const exportController = new ExportController();

// Based on Excel sheet endpoints

// GET /api/export/coach-comparison-page/ - Export coach comparison page
router.get(
  "/coach-comparison-page/",
  validateRequest(exportValidationSchemas.getCoachComparisonExport, "query"),
  exportController.getCoachComparisonExport,
);

// GET /api/export/homepage/ - Export homepage data
router.get(
  "/homepage/",
  validateRequest(exportValidationSchemas.getHomepageExport, "query"),
  exportController.getHomepageExport,
);

// GET /api/export/leagues-cups/ - Export leagues and cups
router.get(
  "/leagues-cups/",
  validateRequest(exportValidationSchemas.getLeaguesCupsExport, "query"),
  exportController.getLeaguesCupsExport,
);

// GET /api/export/leagues-cups-detail/ - Export leagues and cups detail
router.get(
  "/leagues-cups-detail/",
  validateRequest(exportValidationSchemas.getLeaguesCupsDetailExport, "query"),
  exportController.getLeaguesCupsDetailExport,
);

// GET /api/export/leagues-teams/ - Export leagues and teams
router.get(
  "/leagues-teams/",
  validateRequest(exportValidationSchemas.getLeaguesTeamsExport, "query"),
  exportController.getLeaguesTeamsExport,
);

// GET /api/export/match-detail-page/ - Export match detail page
router.get(
  "/match-detail-page/",
  validateRequest(exportValidationSchemas.getMatchDetailExport, "query"),
  exportController.getMatchDetailExport,
);

// GET /api/export/matches-page/ - Export matches page
router.get(
  "/matches-page/",
  validateRequest(exportValidationSchemas.getMatchesPageExport, "query"),
  exportController.getMatchesPageExport,
);

// GET /api/export/player-comparison-page/ - Export player comparison page
router.get(
  "/player-comparison-page/",
  validateRequest(exportValidationSchemas.getPlayerComparisonExport, "query"),
  exportController.getPlayerComparisonExport,
);

// GET /api/export/player-detail-page/ - Export player detail page
router.get(
  "/player-detail-page/",
  validateRequest(exportValidationSchemas.getPlayerDetailExport, "query"),
  exportController.getPlayerDetailExport,
);

// GET /api/export/referee-comparison-page/ - Export referee comparison page
router.get(
  "/referee-comparison-page/",
  validateRequest(exportValidationSchemas.getRefereeComparisonExport, "query"),
  exportController.getRefereeComparisonExport,
);

// GET /api/export/team-comparison-page/ - Export team comparison page
router.get(
  "/team-comparison-page/",
  validateRequest(exportValidationSchemas.getTeamComparisonExport, "query"),
  exportController.getTeamComparisonExport,
);

// GET /api/export/team-detail-page/ - Export team detail page
router.get(
  "/team-detail-page/",
  validateRequest(exportValidationSchemas.getTeamDetailExport, "query"),
  exportController.getTeamDetailExport,
);

// GET /api/export/upcoming-match-detail-page/ - Export upcoming match detail page
router.get(
  "/upcoming-match-detail-page/",
  validateRequest(exportValidationSchemas.getUpcomingMatchDetailExport, "query"),
  exportController.getUpcomingMatchDetailExport,
);

export default router;

