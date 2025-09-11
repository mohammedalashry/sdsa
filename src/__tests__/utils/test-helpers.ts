// import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";

export class TestHelpers {
  static generateAuthToken(
    payload = { id: 1, email: "test@example.com", role: "client" },
  ): string {
    const secret = process.env.JWT_SECRET || "test-secret";
    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  static async makeAuthenticatedRequest(
    method: "get" | "post" | "put" | "delete",
    url: string,
    body?: any,
  ) {
    const token = this.generateAuthToken();
    const requestBuilder = (app as any)
      [method](url)
      .set("Authorization", `Bearer ${token}`);

    if (body && (method === "post" || method === "put")) {
      requestBuilder.send(body);
    }

    return requestBuilder;
  }

  static createMockTeamData(overrides: Partial<any> = {}) {
    return {
      team: {
        id: 1,
        name: "Test Team",
        code: "TEST",
        country: "England",
        founded: 2000,
        national: false,
        logo: "https://example.com/logo.png",
      },
      venue: {
        id: 1,
        name: "Test Stadium",
        address: "123 Test Street",
        city: "Test City",
        capacity: 50000,
        surface: "grass",
        image: "https://example.com/stadium.png",
      },
      ...overrides,
    };
  }

  static createMockKorastatsTeam(overrides: Partial<any> = {}) {
    return {
      intTeamID: 1,
      strTeamName: "Test Team",
      strTeamNameEn: "Test Team",
      strTeamShortCode: "TEST",
      strCountryNameEn: "England",
      intFoundedYear: 2000,
      blnNationalTeam: 0,
      strTeamLogo: "https://example.com/logo.png",
      intStadiumID: 1,
      strStadiumName: "Test Stadium",
      strStadiumAddress: "123 Test Street",
      strStadiumCity: "Test City",
      intStadiumCapacity: 50000,
      strStadiumSurface: "grass",
      strStadiumImage: "https://example.com/stadium.png",
      ...overrides,
    };
  }
}

