export interface SearchItem {
  item: {
    id: number;
    name: string;
    image?: string;
    photo?: string;
    logo?: string;
    homeTeam?: string;
    awayTeam?: string;
  };
  metaData?: {
    seasons?: any[];
  } | null;
  type: string;
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

