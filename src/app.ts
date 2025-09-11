import "dotenv/config"; // THIS WAS MISSING - Add this first line

import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Core middleware
import { errorHandler } from "./core/middleware/error.middleware";

// Database connections
import { KorastatsMongoService } from "./db/mogodb/connection";

// Route imports
import teamsRoutes from "./modules/teams/routes";
import leaguesRoutes from "./modules/leagues/routes";
import playersRoutes from "./modules/players/routes"; // Future modules
import fixturesRoutes from "./modules/fixtures/routes";
import profileRoutes from "./modules/profile/routes";
import standingsRoutes from "./modules/standings/routes";
import countriesRoutes from "./modules/country/routes";
import coachRoutes from "./modules/coach/routes";
import refereeRoutes from "./modules/referee/routes";
// Existing routes (keep your current auth)
import authRoutes from "./modules/auth/auth.router";

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    detail: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Initialize MongoDB connection
const mongoService = new KorastatsMongoService();
mongoService.connect().catch(console.error);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
const router = Router();
app.use("/api", router);
router.use("/auth", authRoutes); // Keep existing auth routes
router.use("/team", teamsRoutes); // New teams module
router.use("/league", leaguesRoutes);
router.use("/players", playersRoutes); // Future modules
router.use("/fixture", fixturesRoutes);
router.use("/profile", profileRoutes); // Profile module
router.use("/standings", standingsRoutes); // Standings module
router.use("/countries", countriesRoutes); // Countries module
router.use("/coach", coachRoutes); // Coach module
router.use("/referee", refereeRoutes); // Referee module
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    detail: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

