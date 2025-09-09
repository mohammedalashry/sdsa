import { Schema, model, Document } from "mongoose";

export interface IContact extends Document {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "PENDING" | "READ" | "REPLIED" | "RESOLVED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: "GENERAL" | "BUG_REPORT" | "FEATURE_REQUEST" | "SUPPORT" | "FEEDBACK";
  reply?: string;
  repliedAt?: Date;
  repliedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "READ", "REPLIED", "RESOLVED"],
      default: "PENDING",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    category: {
      type: String,
      enum: ["GENERAL", "BUG_REPORT", "FEATURE_REQUEST", "SUPPORT", "FEEDBACK"],
      default: "GENERAL",
    },
    reply: { type: String },
    repliedAt: { type: Date },
    repliedBy: { type: String },
  },
  {
    timestamps: true,
    collection: "contacts",
  },
);

// Indexes for better performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ category: 1 });
contactSchema.index({ createdAt: -1 });

export const Contact = model<IContact>("Contact", contactSchema);

