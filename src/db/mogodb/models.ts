// src/db/mogodb/models.ts
// MongoDB models for SDSA

import mongoose from "mongoose";
import {
  LeagueSchema,
  MatchSchema,
  PlayerSchema,
  TeamSchema,
  CoachSchema,
  RefereeSchema,
  CountrySchema,
  SyncLogSchema,
  MatchDetailsSchema,
  StandingsSchema,
  LeagueInterface,
  PlayerInterface,
  TeamInterface,
  CoachInterface,
  RefereeInterface,
  CountryInterface,
  ISyncLog,
  MatchInterface,
  MatchDetailsInterface,
  StandingsInterface,
} from "./schemas";

// Create models
export const League = mongoose.model<LeagueInterface>("League", LeagueSchema);
export const Match = mongoose.model<MatchInterface>("Match", MatchSchema);
export const MatchDetails = mongoose.model<MatchDetailsInterface>(
  "MatchDetails",
  MatchDetailsSchema,
);
export const Standings = mongoose.model<StandingsInterface>("Standings", StandingsSchema);
export const Player = mongoose.model<PlayerInterface>("Player", PlayerSchema);
export const Team = mongoose.model<TeamInterface>("Team", TeamSchema);
export const Coach = mongoose.model<CoachInterface>("Coach", CoachSchema);
export const Referee = mongoose.model<RefereeInterface>("Referee", RefereeSchema);
export const Country = mongoose.model<CountryInterface>("Country", CountrySchema);
export const SyncLog = mongoose.model<ISyncLog>("SyncLog", SyncLogSchema);

// Export all models as a single object for easy importing
export const Models = {
  League,
  Match,
  MatchDetails,
  Standings,
  Player,
  Team,
  Coach,
  Referee,
  Country,
  SyncLog,
};

// Export types
export type {
  LeagueInterface,
  MatchInterface,
  MatchDetailsInterface,
  StandingsInterface,
  PlayerInterface,
  TeamInterface,
  CoachInterface,
  RefereeInterface,
  CountryInterface,
  ISyncLog,
};

