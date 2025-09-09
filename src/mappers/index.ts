// src/mappers/index.ts
// Export all mapper functionality

// Core mappers
export { KorastatsToMongoMapper } from "./korastats-to-mongo.mapper";
export { MapperService } from "./mapper.service";

// New data collector mappers (based on Excel sheet strategy)
export { KorastatsDataCollectorMapper } from "./korastats-data-collector.mapper";
export { DataCollectorService } from "./data-collector.service";

// Legacy mappers (keeping existing functionality)
export { FixtureMapper } from "./fixture.mapper";
export { TeamMapper } from "./team.mapper";
export { LeagueMapper } from "./league.mapper";
export { StandingsMapper } from "./standings.mapper";
export { HighlightsMapper } from "./highlights.mapper";
export { FixtureDetailMapper } from "./fixture-detail.mapper";
export {
  mapTournamentTeamsList,
  mapTeamInfo,
  mapStatsToTeam,
  mapTeamFixtures,
  mapTeamFormOverview,
  mapTeamLineup,
  mapTeamSquads,
} from "./team-comprehensive.mapper";

// Utilities
export * from "./default-values";
export * from "./team-helpers";

