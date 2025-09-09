// src/modules/players/index.ts
// Main players module export file

// Export types
export * from "../../legacy-types/players.types";

// Export services
export { PlayersService } from "./players.service";
export { PlayersRepository } from "./players.repository";
export { PlayersController } from "./players.controller";
export { playersValidationSchemas } from "./players.validator";

// Export routes (default export)
export { default as playersRoutes } from "./routes";

// Export integration services

// Export integration types
export * from "../../integrations/korastats/types/player.types";

