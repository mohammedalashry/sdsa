import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "./error.middleware";
import { IRequest } from "../types/auth.types";
import prismaService from "../../db/prismadb/prisma.service";

export const authenticate = async (
  req: IRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_ACCESS_SECRET;

    if (!jwtSecret) {
      throw new ApiError(500, "JWT access secret not configured");
    }

    console.log(`🔐 Authenticating token: ${token.substring(0, 20)}...`);

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as any;
    console.log(`🔐 Decoded JWT payload:`, {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    });

    // Fetch the full user data from database
    const user = await prismaService.user.findUnique({
      where: {
        id: parseInt(decoded.sub), // JWT payload uses 'sub' field for user ID
        is_deleted: false,
      },
    });

    if (!user) {
      console.log(`❌ User not found for ID: ${decoded.sub}`);
      throw new ApiError(401, "User not found or inactive");
    }

    console.log(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
    req.user = user as any; // Cast to IUser to handle type differences
    next();
  } catch (error) {
    console.error(`❌ Authentication error:`, error);
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, "Invalid access token"));
    } else {
      next(error);
    }
  }
};

