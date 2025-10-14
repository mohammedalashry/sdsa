import { SearchRepository } from "./search.repository";
import { QCRIArabicTransliterationService } from "./arabic-transliteration.service";
import {
  SearchItem,
  SearchResponse,
  SearchRequest,
  SearchType,
  SEARCH_TYPES,
  MAX_RESULTS,
} from "./search.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class SearchService {
  private readonly transliterationService = new QCRIArabicTransliterationService();

  constructor(private readonly repository: SearchRepository) {}

  /**
   * Perform search across multiple entities
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    try {
      const { keyword, searchType, lang = "en" } = request;

      // Validate keyword
      if (!keyword?.trim()) {
        throw new ApiError(400, "Keyword is required");
      }

      // Validate search type
      if (!searchType?.trim()) {
        throw new ApiError(400, "Search type is required");
      }

      // Parse search types
      const searchTypes = searchType.split(",").map((type) => type.trim());

      // Validate search types
      for (const type of searchTypes) {
        if (type !== "all" && !SEARCH_TYPES.includes(type as SearchType)) {
          throw new ApiError(400, `Invalid search type: ${type}`);
        }
      }

      // Handle "all" search type
      const finalSearchTypes = searchTypes.includes("all")
        ? [...SEARCH_TYPES]
        : (searchTypes as SearchType[]);

      // Process keywords based on language
      let keywords: string[];
      if (lang === "ar" && this.transliterationService.isArabic(keyword)) {
        keywords =
          await this.transliterationService.transliterateNbestArabicToEnglish(keyword);
      } else {
        keywords = [keyword];
      }

      // Perform searches
      const allResults: SearchItem[] = [];

      for (const type of finalSearchTypes) {
        try {
          let results: SearchItem[] = [];

          switch (type) {
            case "teams":
              results = await this.repository.searchTeams(keywords);
              break;
            case "players":
              results = await this.repository.searchPlayers(keywords);
              break;
            case "leagues":
              results = await this.repository.searchLeagues(keywords);
              break;
            case "cups":
              results = await this.repository.searchCups(keywords);
              break;
            case "fixtures":
              results = await this.repository.searchFixtures(keywords);
              break;
            case "referees":
              results = await this.repository.searchReferees(keywords);
              break;
            case "coaches":
              results = await this.repository.searchCoaches(keywords);
              break;
          }

          allResults.push(...results);
        } catch (error) {
          console.error(`Error searching ${type}:`, error);
          // Continue with other search types even if one fails
        }
      }

      // Limit total results
      const limitedResults = allResults.slice(0, MAX_RESULTS * finalSearchTypes.length);

      return {
        results: limitedResults,
        total: limitedResults.length,
        searchType: searchType,
        keyword: keyword,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Search service error:", error);
      throw new ApiError(500, "Failed to perform search");
    }
  }

  /**
   * Get available search types
   */
  getSearchTypes(): string[] {
    return [...SEARCH_TYPES];
  }

  /**
   * Get search suggestions (for future enhancement)
   */
  async getSearchSuggestions(keyword: string): Promise<string[]> {
    try {
      // This could be enhanced to provide search suggestions
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Get search suggestions error:", error);
      return [];
    }
  }
}

