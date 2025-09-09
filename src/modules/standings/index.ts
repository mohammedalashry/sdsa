// src/modules/standings/index.ts
// Main standings module export file

// Export types
export * from "../../legacy-types/standings.types";

// Export services
export { StandingsService } from "./standings.service";
export { StandingsRepository } from "./standings.repository";
export { StandingsController } from "./standings.controller";
export { standingsValidationSchemas } from "./standings.validator";

// Export routes (default export)
export { default as standingsRoutes } from "./routes";

