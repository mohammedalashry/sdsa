// src/db/mogodb/schemas/index.ts
// Export all MongoDB schemas for SDSA

// Core entity schemas
export { default as TournamentSchema, ITournament } from "./tournament.schema";
export { default as MatchSchema, IMatch } from "./match.schema";
export { default as PlayerSchema, IPlayer } from "./player.schema";
export { default as TeamSchema, ITeam } from "./team.schema";
export { default as CoachSchema, ICoach } from "./coach.schema";
export { default as RefereeSchema, IReferee } from "./referee.schema";
export { default as CountrySchema, ICountry } from "./country.schema";

// Statistics schemas
export { default as PlayerStatsSchema, IPlayerStats } from "./player-stats.schema";
export { default as TeamStatsSchema, ITeamStats } from "./team-stats.schema";

// Event schemas
export { default as MatchEventSchema, IMatchEvent } from "./match-events.schema";

// System schemas
export { default as SyncLogSchema, ISyncLog } from "./sync-logs.schema";

// Legacy schema (keeping existing)
export { TournamentData, ITournamentData } from "./tournament-data.schema";

