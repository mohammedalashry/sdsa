import { TestHelpers } from "../utils/test-helpers";

describe("Performance Tests", () => {
  jest.setTimeout(60000); // 1 minute timeout for load tests

  it("should handle concurrent team requests", async () => {
    const concurrency = 10;
    const requests = Array(concurrency)
      .fill(null)
      .map(() =>
        TestHelpers.makeAuthenticatedRequest("get", "/teams").query({
          league: 39,
          season: "2024",
        })
      );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // Should complete within reasonable time (adjust based on your requirements)
    expect(duration).toBeLessThan(10000); // 10 seconds

    console.log(
      `${concurrency} concurrent requests completed in ${duration}ms`
    );
  });

  it("should maintain performance under sequential load", async () => {
    const iterations = 50;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const response = await TestHelpers.makeAuthenticatedRequest(
        "get",
        "/teams/1/"
      );
      const duration = Date.now() - startTime;

      durations.push(duration);
      expect(response.status).toBe(200);
    }

    const averageDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);

    console.log(
      `Average response time: ${averageDuration}ms, Max: ${maxDuration}ms`
    );

    // Performance assertions (adjust based on your requirements)
    expect(averageDuration).toBeLessThan(1000); // Average under 1 second
    expect(maxDuration).toBeLessThan(5000); // Max under 5 seconds
  });
});
