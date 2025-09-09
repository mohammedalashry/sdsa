// src/db/mogodb/schemas/match.schema.ts
// Match MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface IMatch extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;
  tournament_id: number;
  season: string;
  round: number;

  // Match metadata
  date: Date;
  status: {
    id: number;
    name: string;
    short: string;
  };

  // Teams (embedded for performance)
  teams: {
    home: {
      id: number;
      name: string;
      score: number;
      formation?: string;
    };
    away: {
      id: number;
      name: string;
      score: number;
      formation?: string;
    };
  };

  // Venue
  venue: {
    id: number;
    name: string;
    city?: string;
    country?: string;
  };

  // Officials (embedded for quick access)
  officials: {
    referee: {
      id: number;
      name: string;
      nationality: string;
    };
    assistant1?: {
      id: number;
      name: string;
      nationality: string;
    };
    assistant2?: {
      id: number;
      name: string;
      nationality: string;
    };
  };

  // Match phases (for time-series queries)
  phases: {
    first_half: {
      start: Date;
      end: Date;
      score: { home: number; away: number };
    };
    second_half: {
      start: Date;
      end: Date;
      score: { home: number; away: number };
    };
    extra_time?: {
      start: Date;
      end: Date;
      score: { home: number; away: number };
    };
    penalties?: {
      home: number;
      away: number;
    };
  };

  // Quick access stats (denormalized)
  quick_stats: {
    total_goals: number;
    total_cards: number;
    possession: {
      home: number;
      away: number;
    };
  };

  // Additional properties for FixtureData compatibility
  table_position?: {
    home: number | null;
    away: number | null;
  };

  average_team_rating?: {
    home: number;
    away: number;
  };

  // Data availability flags
  data_available: {
    events: boolean;
    stats: boolean;
    formations: boolean;
    player_stats: boolean;
    video: boolean;
  };

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const MatchSchema = new Schema<IMatch>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    tournament_id: {
      type: Number,
      required: true,
      index: true,
    },
    season: {
      type: String,
      required: true,
      index: true,
    },
    round: {
      type: Number,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      short: { type: String, required: true },
    },
    teams: {
      home: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        score: { type: Number, default: 0 },
        formation: { type: String },
      },
      away: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        score: { type: Number, default: 0 },
        formation: { type: String },
      },
    },
    venue: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      city: { type: String },
      country: { type: String },
    },
    officials: {
      referee: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        nationality: { type: String, required: true },
      },
      assistant1: {
        id: { type: Number },
        name: { type: String },
        nationality: { type: String },
      },
      assistant2: {
        id: { type: Number },
        name: { type: String },
        nationality: { type: String },
      },
    },
    phases: {
      first_half: {
        start: { type: Date },
        end: { type: Date },
        score: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
        },
      },
      second_half: {
        start: { type: Date },
        end: { type: Date },
        score: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
        },
      },
      extra_time: {
        start: { type: Date },
        end: { type: Date },
        score: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
        },
      },
      penalties: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
    },
    quick_stats: {
      total_goals: { type: Number, default: 0 },
      total_cards: { type: Number, default: 0 },
      possession: {
        home: { type: Number, default: 50 },
        away: { type: Number, default: 50 },
      },
    },
    table_position: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },
    average_team_rating: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    data_available: {
      events: { type: Boolean, default: false },
      stats: { type: Boolean, default: false },
      formations: { type: Boolean, default: false },
      player_stats: { type: Boolean, default: false },
      video: { type: Boolean, default: false },
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
    collection: "matches",
  },
);

// Indexes for performance
MatchSchema.index({ korastats_id: 1 });
MatchSchema.index({ tournament_id: 1, season: 1, round: 1 });
MatchSchema.index({ date: 1, tournament_id: 1 });
MatchSchema.index({ "teams.home.id": 1, date: 1 });
MatchSchema.index({ "teams.away.id": 1, date: 1 });
MatchSchema.index({ "teams.home.id": 1, "teams.away.id": 1 });
MatchSchema.index({ status: 1, date: 1 });

export default MatchSchema;

