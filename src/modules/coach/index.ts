// src/modules/coach/index.ts
// Main coach module export file

// Export types
export * from "../../legacy-types/players.types";

// Export services
export { CoachService } from "./coach.service";
export { CoachRepository } from "./coach.repository";
export { CoachController } from "./coach.controller";
export { coachValidationSchemas } from "./coach.validator";

// Export routes (default export)
export { default as coachRoutes } from "./routes";

