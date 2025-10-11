// src/integrations/korastats/types/country.types.ts
// Korastats API response types for country-related endpoints

// Base response wrapper for Korastats API
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}

// ===== ENTITY COUNTRIES =====
// Response from EntityCountries endpoint
export interface KorastatsEntityCountries {
  _type: "COUNTRY";
  id: number;
  name: string;
  flag: string;
}

// ===== RESPONSE TYPE WRAPPERS =====
export type KorastatsEntityCountriesResponse = {
  root: {
    result: boolean;
    title: string;
    message: string;
    object: KorastatsEntityCountries[];
  };
};

