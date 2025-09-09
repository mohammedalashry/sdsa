import { Response } from "express";
import { IRequest } from "@/core/types/auth.types";
import { catchAsync } from "@/core/utils/catch-async";
import {
  loginUser,
  registerUser,
  userForgotPasswordEmail,
} from "@/modules/auth/auth.service";

export const register = catchAsync(async (req: IRequest, res: Response) => {
  const user = await registerUser(
    req.ip,
    { "user-agent": req.headers["user-agent"] },
    req.body,
  );

  res.status(201).json(user);
});

export const login = catchAsync(async (req: IRequest, res: Response) => {
  const user = await loginUser(
    req.ip,
    { "user-agent": req.headers["user-agent"] },
    req.body,
  );

  res.status(201).json(user);
});

export const forgotPasswordEmail = catchAsync(async (req: IRequest, res: Response) => {
  const message = await userForgotPasswordEmail(req.body.email);

  res.status(200).json(message);
});

// export const googleApi = catchAsync(async (req: Request, res: Response) => {
//   const link = googleAuth();

//   return res.redirect(link);
// });
