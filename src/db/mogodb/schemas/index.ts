// Core entity schemas
export { default as LeagueSchema, LeagueInterface } from "./league.schema";
export { default as MatchSchema, MatchInterface } from "./match.schema";
export { default as PlayerSchema, PlayerInterface } from "./player.schema";
export { default as TeamSchema, TeamInterface } from "./team.schema";
export { default as CoachSchema, CoachInterface } from "./coach.schema";
export { default as RefereeSchema, RefereeInterface } from "./referee.schema";
export { default as CountrySchema, CountryInterface } from "./country.schema";
export { default as StandingsSchema, StandingsInterface } from "./standings.schema";
export {
  default as MatchDetailsSchema,
  MatchDetailsInterface,
} from "./matchDetails.schema";

// System schemas
export { default as SyncLogSchema, ISyncLog } from "./sync-logs.schema";
// Legacy schema (keeping existing)
export { TournamentData, ITournamentData } from "./tournament-data.schema";

