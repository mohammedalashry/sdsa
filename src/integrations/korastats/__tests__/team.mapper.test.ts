import { TeamMapper } from "../mappers/team.mapper";
import { TestHelpers } from "../../../__tests__/utils/test-helpers";

describe("TeamMapper", () => {
  describe("toTeamData", () => {
    it("should correctly map Korastats team to Django format", () => {
      const korastatsTeam = TestHelpers.createMockKorastatsTeam();
      const result = TeamMapper.toTeamData(korastatsTeam);

      expect(result).toEqual({
        team: {
          id: korastatsTeam.intTeamID,
          name: korastatsTeam.strTeamNameEn,
          code: korastatsTeam.strTeamShortCode,
          country: korastatsTeam.strCountryNameEn,
          founded: korastatsTeam.intFoundedYear,
          national: false,
          logo: korastatsTeam.strTeamLogo,
        },
        venue: {
          id: korastatsTeam.intStadiumID,
          name: korastatsTeam.strStadiumName,
          address: korastatsTeam.strStadiumAddress,
          city: korastatsTeam.strStadiumCity,
          capacity: korastatsTeam.intStadiumCapacity,
          surface: korastatsTeam.strStadiumSurface,
          image: korastatsTeam.strStadiumImage,
        },
      });
    });

    it("should handle missing optional fields", () => {
      const korastatsTeam = {
        intTeamID: 1,
        strTeamName: "Test Team",
        strTeamNameEn: null,
        strTeamShortCode: null,
        strCountryNameEn: null,
        intFoundedYear: null,
        blnNationalTeam: null,
        strTeamLogo: null,
        intStadiumID: null,
        strStadiumName: null,
        strStadiumAddress: null,
        strStadiumCity: null,
        intStadiumCapacity: null,
        strStadiumSurface: null,
        strStadiumImage: null,
      };

      const result = TeamMapper.toTeamData(korastatsTeam);

      expect(result.team.name).toBe("Test Team");
      expect(result.team.code).toBe(null);
      expect(result.team.country).toBe("Unknown");
      expect(result.venue.id).toBe(null);
    });
  });
});
