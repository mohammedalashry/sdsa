import { MatchDataService } from "../syncer/match-data.service";
import { KorastatsMongoService } from "../db/mogodb/connection";

async function main() {
  const matchDataService = new MatchDataService();
  const mongo = new KorastatsMongoService();

  console.log("🔍 Starting match data availability check...");

  try {
    await mongo.connect();
    const cutoffDate = new Date("2025-10-04T14:25:00Z");
    const result = await matchDataService.getMatchesWithInsufficientData(cutoffDate);

    console.log("\n📊 RESULTS:");
    console.log(`Total matches checked: ${result.totalChecked}`);
    console.log(
      `Matches with insufficient data: ${result.insufficientDataMatches.length}`,
    );
    console.log(
      `Matches with sufficient data: ${result.totalChecked - result.insufficientDataMatches.length}`,
    );

    if (result.insufficientDataMatches.length > 0) {
      console.log("\n❌ MATCHES WITH INSUFFICIENT DATA:");
      console.log("=".repeat(80));

      result.insufficientDataMatches.forEach((match, index) => {
        console.log(`\n${index + 1}. Match ID: ${match.matchId}`);
        console.log(`   Tournament: ${match.tournamentName} (ID: ${match.tournamentId})`);
        console.log(`   Data Status:`);
        console.log(`     Timeline: ${match.dataStatus.timeline ? "✅" : "❌"}`);
        console.log(`     Squad: ${match.dataStatus.squad ? "✅" : "❌"}`);
        console.log(`     Player Stats: ${match.dataStatus.playerStats ? "✅" : "❌"}`);
        console.log(
          `     Formation Home: ${match.dataStatus.formationHome ? "✅" : "❌"}`,
        );
        console.log(
          `     Formation Away: ${match.dataStatus.formationAway ? "✅" : "❌"}`,
        );
        console.log(`     Video: ${match.dataStatus.video ? "✅" : "❌"}`);
        console.log(`     Summary: ${match.dataStatus.summary ? "✅" : "❌"}`);
        console.log(`     Possession: ${match.dataStatus.possession ? "✅" : "❌"}`);
        console.log(
          `   Errors: ${match.errors.slice(0, 3).join(", ")}${match.errors.length > 3 ? "..." : ""}`,
        );
      });

      console.log("\n📋 SUMMARY BY TOURNAMENT:");
      const tournamentSummary = result.insufficientDataMatches.reduce(
        (acc, match) => {
          const key = `${match.tournamentName} (${match.tournamentId})`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(tournamentSummary).forEach(([tournament, count]) => {
        console.log(`   ${tournament}: ${count} matches`);
      });
    }

    console.log("\n✅ Match data availability check completed!");
  } catch (error) {
    console.error("❌ Match data availability check failed:", error);
    process.exit(1);
  } finally {
    await mongo.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

