import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { catchAsync } from "../../core/utils/catch-async";

export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/search/
   * Search (keyword, lang, searchType)
   */
  getSearch = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { keyword, lang, searchType } = req.query;

    const searchResults = await this.searchService.getSearch({
      keyword: keyword as string,
      lang: lang as string,
      searchType: searchType as string,
    });

    res.json(searchResults);
  });
}