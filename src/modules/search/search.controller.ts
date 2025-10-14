import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { catchAsync } from "../../core/utils/catch-async";
import { SearchResponse } from "./search.types";

export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/search/
   * Search across multiple entities
   */
  search = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { keyword, searchType, lang } = req.query;

    const result: SearchResponse = await this.searchService.search({
      keyword: keyword as string,
      searchType: searchType as string,
      lang: lang as "en" | "ar",
    });

    res.json(result);
  });

  /**
   * GET /api/search/types
   * Get available search types
   */
  getSearchTypes = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const searchTypes = this.searchService.getSearchTypes();

    res.json({
      searchTypes,
      message: "Available search types",
    });
  });

  /**
   * GET /api/search/suggestions
   * Get search suggestions (for future enhancement)
   */
  getSearchSuggestions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { keyword } = req.query;

      if (!keyword) {
        res.status(400).json({ message: "Keyword is required" });
        return;
      }

      const suggestions = await this.searchService.getSearchSuggestions(
        keyword as string,
      );

      res.json({
        suggestions,
        keyword,
      });
    },
  );
}

