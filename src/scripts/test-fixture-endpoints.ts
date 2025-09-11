// Test script to verify fixture endpoints work correctly
import { FixturesRepository } from "../modules/fixtures/fixtures.repository";
import { Models } from "../db/mogodb/models";

async function testFixtureEndpoints() {
  try {
    console.log("🧪 Testing fixture endpoints...");

    // Initialize repository
    const fixturesRepo = new FixturesRepository();

    // Test fixture comparison
    console.log("\n1. Testing fixture comparison...");
    try {
      const comparison = await fixturesRepo.getFixtureComparison(72999);
      console.log("✅ Fixture comparison:", JSON.stringify(comparison, null, 2));
    } catch (error) {
      console.error("❌ Fixture comparison error:", error.message);
    }

    // Test fixture prediction
    console.log("\n2. Testing fixture prediction...");
    try {
      const prediction = await fixturesRepo.getFixturePrediction(72999);
      console.log("✅ Fixture prediction:", JSON.stringify(prediction, null, 2));
    } catch (error) {
      console.error("❌ Fixture prediction error:", error.message);
    }

    // Test fixture momentum
    console.log("\n3. Testing fixture momentum...");
    try {
      const momentum = await fixturesRepo.getFixtureMomentum(72999);
      console.log("✅ Fixture momentum:", JSON.stringify(momentum, null, 2));
    } catch (error) {
      console.error("❌ Fixture momentum error:", error.message);
    }

    // Test fixture top performers
    console.log("\n4. Testing fixture top performers...");
    try {
      const topPerformers = await fixturesRepo.getFixtureTopPerformers(72999);
      console.log("✅ Fixture top performers:", JSON.stringify(topPerformers, null, 2));
    } catch (error) {
      console.error("❌ Fixture top performers error:", error.message);
    }

    // Test fixture heatmap
    console.log("\n5. Testing fixture heatmap...");
    try {
      const heatmap = await fixturesRepo.getFixtureHeatmap(72999);
      console.log("✅ Fixture heatmap:", JSON.stringify(heatmap, null, 2));
      console.log("Heatmap length:", heatmap.length);
      if (heatmap.length > 0) {
        console.log("First heatmap team:", heatmap[0].team);
        console.log(
          "First heatmap points count:",
          heatmap[0].heatmap?.points?.length || 0,
        );
      }
    } catch (error) {
      console.error("❌ Fixture heatmap error:", error.message);
    }

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testFixtureEndpoints();

