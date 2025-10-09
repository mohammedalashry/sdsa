import { StandingsEntry } from "@/legacy-types/standings.types";
import { Schema, Document } from "mongoose";
import { TeamSchema } from ".";

export interface StandingsInterface {
  // League identifiers
  korastats_id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;

  seasons: {
    year: number;
    standings: StandingsEntry[];
  }[];

  // Standings data

  // Metadata
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

const StandingsEntrySchema = new Schema<StandingsEntry>({
  rank: { type: Number, required: true },
  team: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    logo: { type: String, required: true },
  },
  points: { type: Number, required: true },
  goalsDiff: { type: Number, required: true },
  group: { type: String, required: true },
  form: { type: String, required: true },
  status: { type: String, required: true },
  description: { type: String, required: true },
  all: {
    played: { type: Number, required: true },
    win: { type: Number, required: true },
    draw: { type: Number, required: true },
    lose: { type: Number, required: true },
    goals: {
      for_: { type: Number, required: true },
      against: { type: Number, required: true },
    },
  },
  home: {
    played: { type: Number, required: true },
    win: { type: Number, required: true },
    draw: { type: Number, required: true },
    lose: { type: Number, required: true },
    goals: {
      for_: { type: Number, required: true },
      against: { type: Number, required: true },
    },
  },
  away: {
    played: { type: Number, required: true },
    win: { type: Number, required: true },
    draw: { type: Number, required: true },
    lose: { type: Number, required: true },
    goals: {
      for_: { type: Number, required: true },
      against: { type: Number, required: true },
    },
  },
  update: { type: String, required: true },
});

// MongoDB Schema
const StandingsSchema = new Schema<StandingsInterface>(
  {
    // League identifiers
    korastats_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    country: { type: String, required: true },
    logo: { type: String, required: true },
    flag: { type: String, required: true },
    seasons: {
      type: [
        {
          year: { type: Number, required: true },
          standings: { type: [StandingsEntrySchema], required: true },
        },
      ],
      required: true,
    },

    // Metadata
    last_synced: { type: Date, default: Date.now },
    sync_version: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "standings",
  },
);

// Indexes for performance
StandingsSchema.index({ season: 1, korastats_id: 1 });
StandingsSchema.index({ country: 1, season: 1 });
StandingsSchema.index({ "standings.team.id": 1 });
StandingsSchema.index({ "standings.rank": 1 });
StandingsSchema.index({ "standings.points": -1 });

export default StandingsSchema;

