// src/db/mogodb/schemas/sync-logs.schema.ts
// Sync Logs MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ISyncLog extends Document {
  _id: Types.ObjectId;

  // Sync metadata
  sync_type: "full" | "incremental" | "manual";
  sync_status: "running" | "completed" | "failed";

  // Scope
  tournament_id?: number;
  match_id?: number;
  player_id?: number;
  team_id?: number;

  // Timing
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;

  // Results
  records_processed: number;
  records_updated: number;
  records_created: number;
  records_failed: number;

  // Error tracking
  errors_logs?: Array<{
    endpoint: string;
    error_message: string;
    timestamp: Date;
    error_code?: string;
  }>;

  // Metadata
  created_at: Date;
}

// MongoDB Schema
const SyncLogSchema = new Schema<ISyncLog>(
  {
    sync_type: {
      type: String,
      required: true,
      enum: ["full", "incremental", "manual"],
      index: true,
    },
    sync_status: {
      type: String,
      required: true,
      enum: ["running", "completed", "failed"],
      default: "running",
      index: true,
    },
    tournament_id: {
      type: Number,
      index: true,
    },
    match_id: {
      type: Number,
      index: true,
    },
    player_id: {
      type: Number,
      index: true,
    },
    team_id: {
      type: Number,
      index: true,
    },
    started_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    completed_at: {
      type: Date,
    },
    duration_ms: {
      type: Number,
    },
    records_processed: {
      type: Number,
      default: 0,
    },
    records_updated: {
      type: Number,
      default: 0,
    },
    records_created: {
      type: Number,
      default: 0,
    },
    records_failed: {
      type: Number,
      default: 0,
    },
    errors_logs: [
      {
        endpoint: { type: String, required: true },
        error_message: { type: String, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at" },
    collection: "sync_logs",
  },
);

// Indexes for performance
SyncLogSchema.index({ sync_type: 1, started_at: -1 });
SyncLogSchema.index({ sync_status: 1, started_at: -1 });
SyncLogSchema.index({ tournament_id: 1, started_at: -1 });
SyncLogSchema.index({ started_at: -1 });

export default SyncLogSchema;

