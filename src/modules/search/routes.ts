import { Router } from "express";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { SearchRepository } from "./search.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";
import { searchValidationSchemas } from "./search.validator";

const router = Router();

// Dependency injection setup
const searchRepository = new SearchRepository();
const searchService = new SearchService(searchRepository);
const searchController = new SearchController(searchService);

// GET /api/search/ - Search across multiple entities (authenticated)
router.get(
  "/",
  authenticate,
  validateRequest(searchValidationSchemas.search, "query"),
  searchController.search,
);

// GET /api/search/types - Get available search types
router.get("/types", authenticate, searchController.getSearchTypes);

// GET /api/search/suggestions - Get search suggestions
router.get("/suggestions", authenticate, searchController.getSearchSuggestions);

export default router;

