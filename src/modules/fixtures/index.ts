// src/modules/fixtures/index.ts
// Main fixtures module export file

// Export types
export * from "../../legacy-types/fixtures.types";

// Export services
export { FixturesService } from "./fixtures.service";
export { FixturesRepository } from "./fixtures.repository";
export { FixturesController } from "./fixtures.controller";
export { fixturesValidationSchemas } from "./fixtures.validator";

// Export routes (default export)
export { default as fixturesRoutes } from "./routes";

// Export integration services
// export { FixtureKorastatsService } from "../../integrations/korastats/services/fixture.service";

// Export integration types
export * from "../../integrations/korastats/types/fixture.types";

