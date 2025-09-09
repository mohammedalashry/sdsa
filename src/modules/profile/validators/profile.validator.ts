// src/modules/profile/validators/profile.validator.ts
import { Request, Response, NextFunction } from "express";

export const validateProfileUpdate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const allowedFields = [
    "first_name",
    "last_name",
    "phonenumber",
    "image",
    "twitter_link",
    "dob",
    "address",
    "change_password",
  ];

  // Check if any invalid fields are present
  const invalidFields = Object.keys(req.body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "Invalid fields",
      message: `The following fields are not allowed: ${invalidFields.join(", ")}`,
      allowedFields,
    });
  }

  // Validate email format if provided (though email updates should be separate)
  if (req.body.email) {
    return res.status(400).json({
      error: "Email update not allowed",
      message: "Email updates must be done through a separate endpoint",
    });
  }

  // Validate date format if provided
  if (req.body.dob) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.dob)) {
      return res.status(400).json({
        error: "Invalid date format",
        message: "Date of birth must be in YYYY-MM-DD format",
      });
    }
  }

  next();
};

