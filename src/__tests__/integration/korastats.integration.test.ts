import { KorastatsClient } from "../../integrations/korastats/client";
import { TeamKorastatsService } from "../../integrations/korastats/services/team.service";

describe("Korastats Integration Tests", () => {
  let client: KorastatsClient;
  let teamService: TeamKorastatsService;

  beforeAll(() => {
    // These tests require real API credentials
    if (!process.env.KORASTATS_API_KEY) {
      console.warn(
        "Skipping integration tests - KORASTATS_API_KEY not provided"
      );
      return;
    }

    client = new KorastatsClient();
    teamService = new TeamKorastatsService(client);
  });

  it("should fetch real team data from Korastats", async () => {
    if (!process.env.KORASTATS_API_KEY) return;

    const teams = await teamService.getTeamsList(39, "2024"); // Premier League 2024

    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);

    const firstTeam = teams[0];
    expect(firstTeam).toHaveProperty("intTeamID");
    expect(firstTeam).toHaveProperty("strTeamName");
  });

  it("should handle API rate limits gracefully", async () => {
    if (!process.env.KORASTATS_API_KEY) return;

    // Make multiple requests in quick succession
    const promises = Array(5)
      .fill(null)
      .map(() => teamService.getTeamsList(39, "2024"));

    // Should not throw rate limit errors
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
}, 30000);
