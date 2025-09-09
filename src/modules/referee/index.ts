// src/modules/referee/index.ts
// Main referee module export file

// Export types
export * from "./referee.service";

// Export services
export { RefereeService } from "./referee.service";
export { RefereeRepository } from "./referee.repository";
export { RefereeController } from "./referee.controller";
export { refereeValidationSchemas } from "./referee.validator";

// Export routes (default export)
export { default as refereeRoutes } from "./routes";
