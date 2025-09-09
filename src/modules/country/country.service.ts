// src/modules/country/country.service.ts
import { CountryRepository } from "./country.repository";

// Simple country interface
export interface CountryData {
  id: number;
  name: string;
  code: string | null;
  flag: string | null;
}

export class CountryService {
  constructor(private readonly countryRepository: CountryRepository) {}

  /**
   * GET /api/country/ - Get countries
   */
  async getCountries(options: { name?: string }): Promise<CountryData[]> {
    return await this.countryRepository.getCountries(options);
  }
}

