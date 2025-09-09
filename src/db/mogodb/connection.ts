// src/integrations/korastats/database/connection.ts
import mongoose from "mongoose";

export class KorastatsMongoService {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<mongoose.Connection> {
    try {
      const mongoUri =
        process.env.KORASTATS_MONGODB_URI ||
        "mongodb+srv://moda:PzkB2a4MC25eNWn4@almeria.crdi0cw.mongodb.net/korastats_data";

      // Use default mongoose connection instead of creating a new one
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, {
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
      }

      this.connection = mongoose.connection;
      console.log("✅ KoraStats MongoDB connected successfully");
      console.log(`🔗 Connection state: ${this.connection.readyState}`);
      console.log(`🔗 Database name: ${this.connection.db?.databaseName}`);
      return this.connection;
    } catch (error) {
      console.error("❌ KoraStats MongoDB connection failed:", error);
      throw error;
    }
  }

  async getConnection(): Promise<mongoose.Connection> {
    if (!this.connection) {
      await this.connect();
      return this.connection;
    }
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.connection = null;
      console.log("👋 KoraStats MongoDB disconnected");
    }
  }
}

