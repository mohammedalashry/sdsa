// ============================================================================
// src/integrations/korastats/database/schemas/tournament-data.schema.ts
import { Schema, model, Document } from "mongoose";

// Main schema for storing complete tournament data
export interface ITournamentData extends Document {
  tournamentId: number;
  tournamentName: string;
  country: string;
  season: string;
  lastUpdated: Date;
  batchId: string;

  // Raw KoraStats responses
  tournamentMatchList: any[];
  matches: {
    matchId: number;
    matchSummary: any;
    matchDetails: any; // MatchTimeline data
    matchLineup: any; // MatchSquad data (NEW)
    matchPlayerStats: any; // MatchPlayerStats data (NEW)
    lastUpdated: Date;
  }[];

  // Search indices for fast lookup
  searchIndex: {
    matchesByDate: Map<string, number[]>;
    teamMatches: Map<number, number[]>;
    upcomingMatches: number[];
    finishedMatches: number[];
  };
}

const TournamentDataSchema = new Schema<ITournamentData>({
  tournamentId: { type: Number, required: true, unique: true, index: true },
  tournamentName: { type: String, required: true },
  country: { type: String, required: true },
  season: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  batchId: { type: String, required: true },

  tournamentMatchList: [{ type: Schema.Types.Mixed }],
  matches: [
    {
      matchId: { type: Number, required: true, index: true },
      matchSummary: { type: Schema.Types.Mixed },
      matchDetails: { type: Schema.Types.Mixed }, // MatchTimeline
      matchLineup: { type: Schema.Types.Mixed }, // MatchSquad (NEW)
      matchPlayerStats: { type: Schema.Types.Mixed }, // MatchPlayerStats (NEW)
      lastUpdated: { type: Date, default: Date.now },
    },
  ],

  searchIndex: {
    matchesByDate: { type: Map, of: [Number] },
    teamMatches: { type: Map, of: [Number] },
    upcomingMatches: [Number],
    finishedMatches: [Number],
  },
});

// Compound indexes for efficient queries
TournamentDataSchema.index({ tournamentId: 1, "matches.matchId": 1 });
TournamentDataSchema.index({ "searchIndex.matchesByDate": 1 });
TournamentDataSchema.index({ batchId: 1, lastUpdated: -1 });

export const TournamentData = model<ITournamentData>(
  "TournamentData",
  TournamentDataSchema,
);

