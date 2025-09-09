import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../types/common.types";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors: Record<string, string | string[]> = {}
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("API Error:", err);

  if (err instanceof ApiError) {
    const response: ErrorResponse = {
      detail: err.message,
      ...err.errors,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    const errors: Record<string, string> = {};
    err.details.forEach((detail: any) => {
      errors[detail.path.join(".")] = detail.message;
    });
    res.status(400).json(errors);
    return;
  }

  // Default error
  res.status(500).json({
    detail: "Internal server error",
  });
};
