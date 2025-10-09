import { FixtureData } from "@/legacy-types";

import { Schema } from "mongoose";

export interface MatchInterface {
  // Korastats identifiers
  korastats_id: number;
  tournament_id: number;

  // Basic fixture data
  fixture: FixtureData["fixture"];
  league: FixtureData["league"];
  teams: FixtureData["teams"];
  goals: FixtureData["goals"];
  score: FixtureData["score"];
  tablePosition: FixtureData["tablePosition"];
  averageTeamRating: FixtureData["averageTeamRating"];

  // Data availability
  dataAvailable: {
    events: boolean;
    stats: boolean;
    formations: boolean;
    playerStats: boolean;
    video: boolean;
  };

  // Metadata
  lastSynced: Date;
  syncVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Schema
const MatchSchema = new Schema<MatchInterface>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
    },
    tournament_id: {
      type: Number,
      required: true,
    },

    // ==================== FIXTURE DATA ====================
    // Basic fixture data
    fixture: {
      id: { type: Number, required: true },
      referee: { type: String, default: null },
      timezone: { type: String, required: true },
      date: { type: String, required: true },
      timestamp: { type: Number, required: true },
      periods: {
        first: { type: Number, default: null },
        second: { type: Number, default: null },
      },
      venue: {
        id: { type: Number, default: null },
        name: { type: String, default: null },
        city: { type: String, default: null },
      },
      status: {
        long: { type: String, required: true },
        short: { type: String, required: true },
        elapsed: { type: Number, default: null },
      },
    },

    // League information
    league: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      country: { type: String, required: true },
      logo: { type: String, required: true },
      flag: { type: String, default: null },
      season: { type: Number, required: true },
      round: { type: String, required: true },
    },

    // Teams information
    teams: {
      home: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      away: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
    },

    // Goals
    goals: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },

    // Score
    score: {
      halftime: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      fulltime: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      extratime: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      penalty: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
    },

    // Table position
    tablePosition: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },

    // Average team rating
    averageTeamRating: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },

    // ==================== ADDITIONAL DATA ====================

    dataAvailable: {
      events: { type: Boolean, default: false },
      stats: { type: Boolean, default: false },
      formations: { type: Boolean, default: false },
      playerStats: { type: Boolean, default: false },
      video: { type: Boolean, default: false },
    },

    lastSynced: {
      type: Date,
      default: Date.now,
    },
    syncVersion: {
      type: Number,
      default: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    collection: "matches",
  },
);

// Indexes for performance
MatchSchema.index({ tournament_id: 1, "fixture.season": 1, "fixture.round": 1 });
MatchSchema.index({ date: 1, tournament_id: 1 });
MatchSchema.index({ "fixture.teams.home.id": 1, date: 1 });
MatchSchema.index({ "fixture.teams.away.id": 1, date: 1 });
MatchSchema.index({ "fixture.teams.home.id": 1, "fixture.teams.away.id": 1 });
MatchSchema.index({ "fixture.status.short": 1, date: 1 });

export default MatchSchema;

