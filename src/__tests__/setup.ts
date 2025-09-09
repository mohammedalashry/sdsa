import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Mock console.warn and console.error for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.mockKorastatsResponse = (data: any, result = "Success") => ({
  result,
  message:
    result === "Success"
      ? "Data retrieved successfully"
      : "Failed to retrieve data",
  data,
});
