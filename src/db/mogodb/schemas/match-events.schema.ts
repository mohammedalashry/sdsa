// src/db/mogodb/schemas/match-events.schema.ts
// Match Events MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface IMatchEvent extends Document {
  _id: Types.ObjectId;

  // Identifiers
  match_id: number;
  tournament_id: number;

  // Event details
  event_type: string;
  event_subtype?: string;
  minute: number;
  second?: number;
  half: number;

  // Participants
  team: {
    id: number;
    name: string;
  };
  player?: {
    id: number;
    name: string;
    jersey_number: number;
  };
  assist_player?: {
    id: number;
    name: string;
  };

  // Event context
  description?: string;
  location?: {
    x: number;
    y: number;
  };

  // Media
  video_url?: string;
  image_url?: string;

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const MatchEventSchema = new Schema<IMatchEvent>(
  {
    match_id: {
      type: Number,
      required: true,
      index: true,
    },
    tournament_id: {
      type: Number,
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      required: true,
      index: true,
    },
    event_subtype: {
      type: String,
      index: true,
    },
    minute: {
      type: Number,
      required: true,
      index: true,
    },
    second: {
      type: Number,
    },
    half: {
      type: Number,
      required: true,
      index: true,
    },
    team: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
    },
    player: {
      id: { type: Number },
      name: { type: String },
      jersey_number: { type: Number },
    },
    assist_player: {
      id: { type: Number },
      name: { type: String },
    },
    description: {
      type: String,
    },
    location: {
      x: { type: Number },
      y: { type: Number },
    },
    video_url: {
      type: String,
    },
    image_url: {
      type: String,
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
    collection: "match_events",
  },
);

// Indexes for performance
MatchEventSchema.index({ match_id: 1, minute: 1 });
MatchEventSchema.index({ match_id: 1, half: 1, minute: 1 });
MatchEventSchema.index({ player_id: 1, match_date: -1 });
MatchEventSchema.index({ event_type: 1, match_id: 1 });
MatchEventSchema.index({ tournament_id: 1, match_id: 1 });

export default MatchEventSchema;

