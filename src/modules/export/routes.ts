import { Router } from "express";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { exportValidationSchemas } from "./export.validator";

const router = Router();

// Dependency injection setup
const exportService = new ExportService();
const exportController = new ExportController(exportService);

// ===== EXPORT ENDPOINTS =====

// GET /api/export/leagues-teams - Export leagues and teams
router.get(
  "/leagues-teams",
  validateRequest(exportValidationSchemas.leaguesTeams, "query"),
  exportController.exportLeaguesTeams,
);

// GET /api/export/homepage - Export homepage data
router.get(
  "/homepage",
  validateRequest(exportValidationSchemas.homepage, "query"),
  exportController.exportHomepage,
);

// GET /api/export/matches-page - Export matches page data
router.get(
  "/matches-page",
  validateRequest(exportValidationSchemas.matchesPage, "query"),
  exportController.exportMatchesPage,
);

// GET /api/export/match-detail-page - Export match detail page
router.get(
  "/match-detail-page",
  validateRequest(exportValidationSchemas.matchDetailPage, "query"),
  exportController.exportMatchDetailPage,
);

// GET /api/export/upcoming-match-detail-page - Export upcoming match detail page
router.get(
  "/upcoming-match-detail-page",
  validateRequest(exportValidationSchemas.matchDetailPage, "query"),
  exportController.exportUpcomingMatchDetailPage,
);

// GET /api/export/leagues-cups - Export leagues and cups
router.get(
  "/leagues-cups",
  validateRequest(exportValidationSchemas.leaguesCups, "query"),
  exportController.exportLeaguesCups,
);

// GET /api/export/leagues-cups-detail - Export league/cup detail
router.get(
  "/leagues-cups-detail",
  validateRequest(exportValidationSchemas.leaguesCupsDetail, "query"),
  exportController.exportLeaguesCupsDetail,
);

// GET /api/export/player-detail-page - Export player detail page
router.get(
  "/player-detail-page",
  validateRequest(exportValidationSchemas.playerDetailPage, "query"),
  exportController.exportPlayerDetailPage,
);

// GET /api/export/team-detail-page - Export team detail page
router.get(
  "/team-detail-page",
  validateRequest(exportValidationSchemas.teamDetailPage, "query"),
  exportController.exportTeamDetailPage,
);

// GET /api/export/player-comparison-page - Export player comparison page
router.get(
  "/player-comparison-page",
  validateRequest(exportValidationSchemas.playerComparisonPage, "query"),
  exportController.exportPlayerComparisonPage,
);

// GET /api/export/team-comparison-page - Export team comparison page
router.get(
  "/team-comparison-page",
  validateRequest(exportValidationSchemas.teamComparisonPage, "query"),
  exportController.exportTeamComparisonPage,
);

// GET /api/export/coach-comparison-page - Export coach comparison page
router.get(
  "/coach-comparison-page",
  validateRequest(exportValidationSchemas.coachComparisonPage, "query"),
  exportController.exportCoachComparisonPage,
);

// GET /api/export/referee-comparison-page - Export referee comparison page
router.get(
  "/referee-comparison-page",
  validateRequest(exportValidationSchemas.refereeComparisonPage, "query"),
  exportController.exportRefereeComparisonPage,
);

// GET /api/export/download/:filename - Download exported file
router.get("/download/:filename", exportController.downloadFile);

export default router;

