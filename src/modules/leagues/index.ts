// src/modules/leagues/index.ts
// Main leagues module export file

// Export types
export * from "../../legacy-types/leagues.types";

// Export services
export { LeaguesService } from "./leagues.service";
export { LeaguesRepository } from "./leagues.repository";
export { LeaguesController } from "./leagues.controller";
export { leaguesValidationSchemas } from "./leagues.validator";

// Export routes (default export)
export { default as leaguesRoutes } from "./routes";

// Export integration services
export { LeagueKorastatsService } from "../../integrations/korastats/services/league.service";

// Export integration types
export * from "../../integrations/korastats/types/league.types";

