import { TestHelpers } from "../../../__tests__/utils/test-helpers";
import { TeamsService } from "../services/teams.service";
import { ApiError } from "../../../core/middleware/error.middleware";

// Mock the teams service
jest.mock("../services/teams.service");
const mockTeamsService = TeamsService as jest.MockedClass<typeof TeamsService>;

describe("TeamsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /teams", () => {
    it("should return paginated teams list", async () => {
      const mockTeams = [TestHelpers.createMockTeamData()];
      const mockResult = { data: mockTeams, total: 1 };

      mockTeamsService.prototype.getTeams = jest.fn().mockResolvedValue(mockResult);

      const response = await TestHelpers.makeAuthenticatedRequest("get", "/teams").query({
        league: 39,
        season: "2024",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeams);
    });

    it("should return 400 for missing league parameter", async () => {
      const response = await TestHelpers.makeAuthenticatedRequest("get", "/teams").query({
        season: "2024",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("detail");
    });

    it("should return 400 for invalid season format", async () => {
      const response = await TestHelpers.makeAuthenticatedRequest("get", "/teams").query({
        league: 39,
        season: "invalid",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("query");
    });

    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app)
        .get("/teams")
        .query({ league: 39, season: "2024" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("detail", "Access token required");
    });
  });

  describe("GET /teams/:id", () => {
    it("should return team details", async () => {
      const mockTeam = TestHelpers.createMockTeamData();
      mockTeamsService.prototype.getTeamDetail = jest.fn().mockResolvedValue(mockTeam);

      const response = await TestHelpers.makeAuthenticatedRequest("get", "/teams/1/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeam);
    });

    it("should return 404 for non-existent team", async () => {
      mockTeamsService.prototype.getTeamDetail = jest.fn().mockResolvedValue(null);

      const response = await TestHelpers.makeAuthenticatedRequest("get", "/teams/999/");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("detail", "Team not found");
    });

    it("should return 400 for invalid team ID", async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        "get",
        "/teams/invalid/",
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("detail", "Invalid team ID");
    });
  });
});

