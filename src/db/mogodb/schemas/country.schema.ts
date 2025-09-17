import { Schema, Types } from "mongoose";

// Interface for TypeScript
export interface CountryInterface {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Country info
  name: string;
  code: string; // ISO country code (e.g., "SA", "EG", "AE")
  flag: string; // URL to flag image

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const CountrySchema = new Schema<CountryInterface>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    flag: {
      type: String,
      required: true,
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

export default CountrySchema;

