import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export default function validate(
  schema: Joi.ObjectSchema,
  target?: "body" | "query" | "params",
) {
  if (!target) target = "body";

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.validateAsync(req[target], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (target === "query") {
        Object.assign(req.query, validated);
      } else {
        req[target] = validated;
      }

      return next();
    } catch (err: unknown) {
      if (err instanceof Joi.ValidationError) {
        const details = err.details.reduce(
          (acc, detail) => {
            const key = detail.path.join(".") || detail.context?.key || "unknown";

            // If it's a "required" error, make it generic
            if (detail.type === "any.required") {
              acc[key] = ["This field is required."];
            } else {
              acc[key] = [detail.message];
            }

            return acc;
          },
          {} as Record<string, string[]>,
        );

        res.status(400).json(details);
        return;
      }

      res.status(500).json({ error: "Server error during schema validation" });
    }
  };
}

// Export validateRequest function for consistency with routes
export const validateRequest = (
  schema: Joi.ObjectSchema,
  target: "body" | "query" | "params" = "body",
) => {
  return validate(schema, target);
};

