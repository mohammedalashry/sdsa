import Joi from "joi";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/error.middleware";

export const validateRequest = (schema: {
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  body?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params);
        if (error) {
          throw new ApiError(400, "Invalid parameters", {
            params: error.details.map((detail) => detail.message),
          });
        }
        req.params = value;
      }

      if (schema.query) {
        const { error, value } = schema.query.validate(req.query);
        if (error) {
          throw new ApiError(400, "Invalid query parameters", {
            query: error.details.map((detail) => detail.message),
          });
        }
        req.query = value;
      }

      if (schema.body) {
        const { error, value } = schema.body.validate(req.body);
        if (error) {
          throw new ApiError(400, "Invalid request body", {
            body: error.details.map((detail) => detail.message),
          });
        }
        req.body = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
