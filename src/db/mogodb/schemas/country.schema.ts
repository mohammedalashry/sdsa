// src/db/mogodb/schemas/country.schema.ts
// Country MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ICountry extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Country info
  name: string;
  code: string; // ISO country code (e.g., "SA", "EG", "AE")
  flag: string; // URL to flag image

  // Geographic info
  continent?: string;
  region?: string;
  capital?: string;
  population?: number;
  area?: number; // in square kilometers

  // Football info
  football_info: {
    fifa_code?: string;
    confederation?: string;
    national_team_name?: string;
    national_team_logo?: string;
    world_cup_participations?: number;
    continental_championships?: number;
  };

  // Leagues and competitions (embedded for quick access)
  competitions: Array<{
    id: number;
    name: string;
    type: "league" | "cup" | "championship";
    level: number; // 1 = top tier, 2 = second tier, etc.
    season: string;
    teams_count: number;
  }>;

  // Top teams (embedded for quick access)
  top_teams: Array<{
    id: number;
    name: string;
    logo?: string;
    founded_year?: number;
    is_national_team: boolean;
  }>;

  // Status
  status: "active" | "inactive";

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const CountrySchema = new Schema<ICountry>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    flag: {
      type: String,
      required: true,
    },
    continent: {
      type: String,
    },
    region: {
      type: String,
    },
    capital: {
      type: String,
    },
    population: {
      type: Number,
    },
    area: {
      type: Number,
    },
    football_info: {
      fifa_code: { type: String },
      confederation: { type: String },
      national_team_name: { type: String },
      national_team_logo: { type: String },
      world_cup_participations: { type: Number, default: 0 },
      continental_championships: { type: Number, default: 0 },
    },
    competitions: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["league", "cup", "championship"], required: true },
        level: { type: Number, required: true },
        season: { type: String, required: true },
        teams_count: { type: Number, default: 0 },
      },
    ],
    top_teams: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String },
        founded_year: { type: Number },
        is_national_team: { type: Boolean, default: false },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    last_synced: {
      type: Date,
      default: Date.now,
    },
    sync_version: {
      type: Number,
      default: 1,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "countries",
  },
);

// Indexes for performance
CountrySchema.index({ korastats_id: 1 });
CountrySchema.index({ name: 1 });
CountrySchema.index({ code: 1 });
CountrySchema.index({ continent: 1 });
CountrySchema.index({ "football_info.confederation": 1 });
CountrySchema.index({ "competitions.type": 1 });
CountrySchema.index({ "top_teams.id": 1 });
CountrySchema.index({ status: 1 });

export default CountrySchema;

