import axios from "axios";
import { KorastatsClient } from "../client";
import { ApiError } from "../../../core/middleware/error.middleware";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("KorastatsClient", () => {
  let client: KorastatsClient;

  beforeEach(() => {
    process.env.KORASTATS_API_KEY = "test-api-key";
    process.env.KORASTATS_API_ENDPOINT = "https://test-api.com";

    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    } as any);

    client = new KorastatsClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.KORASTATS_API_KEY;
    delete process.env.KORASTATS_API_ENDPOINT;
  });

  it("should throw error when API key is missing", () => {
    delete process.env.KORASTATS_API_KEY;

    expect(() => new KorastatsClient()).toThrow(
      "KORASTATS_API_KEY environment variable is required"
    );
  });

  it("should make successful API request", async () => {
    const mockResponse = { data: { result: "Success", data: [] } };
    (client.http.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await client.makeRequest("TournamentTeamList", {
      tournament_id: 1,
    });

    expect(client.http.get).toHaveBeenCalledWith("", {
      params: {
        api: "TournamentTeamList",
        tournament_id: 1,
      },
    });
    expect(result).toEqual(mockResponse.data);
  });

  it("should handle API errors", async () => {
    const mockError = {
      response: {
        status: 400,
        data: { message: "Bad Request" },
      },
    };
    (client.http.get as jest.Mock).mockRejectedValue(mockError);

    await expect(client.makeRequest("TournamentTeamList")).rejects.toThrow(
      ApiError
    );
  });
});
