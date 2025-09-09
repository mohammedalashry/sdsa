import { Response } from "express";
import { ApiResponse } from "../types/common.types";

export class ResponseUtils {
  static success<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json(data);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number = 1,
    pageSize: number = 20
  ): void {
    const response: ApiResponse<T[]> = {
      results: data,
      count: total,
      next: page * pageSize < total ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
    };
    res.status(200).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors: Record<string, string | string[]> = {}
  ): void {
    res.status(statusCode).json({
      detail: message,
      ...errors,
    });
  }
}
