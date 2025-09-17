// Export types
export * from "../../legacy-types/fixtures.types";

// Export services
export { FixturesService } from "./fixtures.service";
export { FixturesRepository } from "./fixtures.repository";
export { FixturesController } from "./fixtures.controller";
export { fixturesValidationSchemas } from "./fixtures.validator";

// Export routes (default export)
export { default as fixturesRoutes } from "./routes";

