export interface SearchItem {
  id: number;
  name: string;
  type: string;
  logo?: string;
  country?: string;
  league?: string;
  team?: string;
  date?: string;
  status?: string;
}

export interface SearchResponse {
  results: SearchItem[];
  total: number;
  searchType: string;
  keyword: string;
}

export interface SearchRequest {
  keyword: string;
  searchType: string;
  lang?: "en" | "ar";
}

export const SEARCH_TYPES = [
  "teams",
  "players",
  "leagues",
  "cups",
  "fixtures",
  "referees",
  "coaches",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export const MAX_RESULTS = 5;

