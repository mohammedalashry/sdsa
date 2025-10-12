// src/integrations/korastats/types/index.ts
// Export all Korastats API response types

// Base response wrapper
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}
export interface KorastatsEntityResponse<T> {
  root: {
    result: string; // "Success" or "Error"
    message: string;
    object: T;
  };
}
// Fixture types
export * from "./fixture.types";

// League types
export * from "./league.types";

// Player types
export * from "./player.types";

// Team types
export * from "./team.types";

// Coach types
export * from "./coach.types";

// Referee types
export * from "./referee.types";

// Country types
export * from "./country.types";

