// src/db/mogodb/schemas/index.ts
// Export all MongoDB schemas for SDSA

// Core entity schemas
export {
  default as TournamentSchema,
  ITournament,
  TournamentInterface,
} from "./tournament.schema";
export { default as MatchSchema, IMatch, MatchInterface } from "./match.schema";
export { default as PlayerSchema, IPlayer } from "./player.schema";
export { default as TeamSchema, ITeam } from "./team.schema";
export { default as CoachSchema, ICoach } from "./coach.schema";
export { default as RefereeSchema, IReferee } from "./referee.schema";
export { default as CountrySchema, ICountry } from "./country.schema";

// Statistics schemas

// Event schemas

// System schemas
export { default as SyncLogSchema, ISyncLog } from "./sync-logs.schema";

// Legacy schema (keeping existing)
export { TournamentData, ITournamentData } from "./tournament-data.schema";

