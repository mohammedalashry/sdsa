import app from "./app";
import prismaService from "@/db/prismadb/prisma.service";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Wait for Prisma connection (your existing setup)
    console.log("🔄 Connecting to database...");
    await prismaService.$connect();
    console.log("✅ Database connected successfully");

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Health check: http://localhost:${PORT}/health`);
      console.log(`🏈 Teams API: http://localhost:${PORT}/teams`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("📴 SIGTERM received, shutting down gracefully");
      server.close(async () => {
        await prismaService.$disconnect();
        console.log("👋 Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("📴 SIGINT received, shutting down gracefully");
      server.close(async () => {
        await prismaService.$disconnect();
        console.log("👋 Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

