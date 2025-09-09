import { PrismaClient } from "@prisma/client";

const prismaService = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
});

prismaService.$on("query", (e) => {
  console.log("Query: " + e.query);
  console.log("Params: " + e.params);
  console.log("Duration: " + e.duration + "ms");
});

async function connectPrisma() {
  let attempt = 0;
  let delay = 1000; // start with 1 second
  const maxDelay = 30000; // cap at 30 seconds

  while (true) {
    try {
      await prismaService.$connect();
      console.log("✅ Prisma connected to the database.");
      break;
    } catch (error) {
      attempt++;
      console.error(`❌ Failed to connect (attempt ${attempt}):`, error);
      console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay); // exponential backoff
    }
  }
}

function setupAutoReconnect() {
  prismaService.$on("error", async (e) => {
    console.error("⚠️ Prisma error detected:", e);
    console.log("🔄 Attempting to reconnect...");
    await connectPrisma();
  });

  process.on("beforeExit", async () => {
    console.warn("⚠️ Process is about to exit. Closing Prisma connection...");
    try {
      await prismaService.$disconnect();
    } catch (err) {
      console.error("❌ Error during disconnect:", err);
    }
  });
}

connectPrisma().then(setupAutoReconnect);

export default prismaService;
