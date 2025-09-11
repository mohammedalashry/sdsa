// src/db/mogodb/models.ts
// MongoDB models for SDSA

import mongoose from "mongoose";
import {
  TournamentSchema,
  MatchSchema,
  PlayerSchema,
  TeamSchema,
  CoachSchema,
  RefereeSchema,
  CountrySchema,
  SyncLogSchema,
  ITournament,
  IPlayer,
  ITeam,
  ICoach,
  IReferee,
  ICountry,
  ISyncLog,
  IMatch,
} from "./schemas";

// Create models
export const Tournament = mongoose.model<ITournament>("Tournament", TournamentSchema);
export const Match = mongoose.model<IMatch>("Match", MatchSchema);
export const Player = mongoose.model<IPlayer>("Player", PlayerSchema);
export const Team = mongoose.model<ITeam>("Team", TeamSchema);
export const Coach = mongoose.model<ICoach>("Coach", CoachSchema);
export const Referee = mongoose.model<IReferee>("Referee", RefereeSchema);
export const Country = mongoose.model<ICountry>("Country", CountrySchema);
export const SyncLog = mongoose.model<ISyncLog>("SyncLog", SyncLogSchema);

// Export all models as a single object for easy importing
export const Models = {
  Tournament,
  Match,
  Player,
  Team,
  Coach,
  Referee,
  Country,
  SyncLog,
};

// Export types
export type { ITournament, IMatch, IPlayer, ITeam, ICoach, IReferee, ICountry, ISyncLog };

