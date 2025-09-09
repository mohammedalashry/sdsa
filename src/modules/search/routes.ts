import { Router } from "express";
import { SearchController } from "./search.controller";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { searchValidationSchemas } from "./search.validator";

const router = Router();
const searchController = new SearchController();

// Based on Excel sheet endpoints

// GET /api/search/ - Search (keyword, lang, searchType)
router.get(
  "/",
  validateRequest(searchValidationSchemas.getSearch, "query"),
  searchController.getSearch,
);

export default router;

