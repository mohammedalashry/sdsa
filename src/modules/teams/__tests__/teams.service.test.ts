import { TeamsService } from "../services/teams.service";
import { TeamsRepository } from "../repositories/teams.repository";
import { ApiError } from "../../../core/middleware/error.middleware";
import { TestHelpers } from "../../../__tests__/utils/test-helpers";

jest.mock("../repositories/teams.repository");
const mockTeamsRepository = TeamsRepository as jest.MockedClass<
  typeof TeamsRepository
>;

describe("TeamsService", () => {
  let teamsService: TeamsService;
  let mockRepository: jest.Mocked<TeamsRepository>;

  beforeEach(() => {
    mockRepository = new mockTeamsRepository() as jest.Mocked<TeamsRepository>;
    teamsService = new TeamsService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTeams", () => {
    it("should return filtered and paginated teams", async () => {
      const mockTeams = [
        TestHelpers.createMockTeamData({
          team: { ...TestHelpers.createMockTeamData().team, name: "Arsenal" },
        }),
        TestHelpers.createMockTeamData({
          team: { ...TestHelpers.createMockTeamData().team, name: "Chelsea" },
        }),
      ];
      mockRepository.getTeamsList.mockResolvedValue(mockTeams);

      const result = await teamsService.getTeams(39, "2024", {
        search: "Arsenal",
        page: 1,
        page_size: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].team.name).toBe("Arsenal");
      expect(result.total).toBe(1);
    });

    it("should throw error for missing league", async () => {
      await expect(
        teamsService.getTeams(0, "2024", { page: 1, page_size: 20 })
      ).rejects.toThrow(ApiError);
    });

    it("should throw error for invalid season format", async () => {
      await expect(
        teamsService.getTeams(39, "invalid", { page: 1, page_size: 20 })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getTeamDetail", () => {
    it("should return team details", async () => {
      const mockTeam = TestHelpers.createMockTeamData();
      mockRepository.getTeamInfo.mockResolvedValue(mockTeam as any);

      const result = await teamsService.getTeamDetail(1);

      expect(result).toEqual(mockTeam);
      expect(mockRepository.getTeamInfo).toHaveBeenCalledWith(1);
    });

    it("should throw error for invalid team ID", async () => {
      await expect(teamsService.getTeamDetail(0)).rejects.toThrow(ApiError);
      await expect(teamsService.getTeamDetail(-1)).rejects.toThrow(ApiError);
    });
  });
});
