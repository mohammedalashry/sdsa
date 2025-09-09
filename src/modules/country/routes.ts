import { Router } from "express";
import { CountryController } from "./country.controller";
import { CountryService } from "./country.service";
import { CountryRepository } from "./country.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { countryValidationSchemas } from "./country.validator";

const router = Router();

// Dependency injection
const countryRepository = new CountryRepository();
const countryService = new CountryService(countryRepository);
const countryController = new CountryController(countryService);

// Based on Excel sheet endpoints

// GET /api/country/ - Get countries (name filter)
router.get(
  "/",
  validateRequest(countryValidationSchemas.getCountries, "query"),
  countryController.getAllCountries,
);

export default router;

