export interface ApiResponse<T> {
  results?: T;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

export interface BaseFilterParams extends PaginationParams {
  search?: string;
  ordering?: string;
}

export interface ErrorResponse {
  detail?: string;
  error?: string;
  [field: string]: string | string[] | undefined;
}

export interface IdParam {
  id: string | number;
}
