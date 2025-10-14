import { Response } from "express";
import { IRequest } from "@/core/types/auth.types";
import { catchAsync } from "@/core/utils/catch-async";
import {
  loginUser,
  registerUser,
  userForgotPasswordEmail,
  changePassword,
  setNewPassword,
  resendOtp,
  validateOtp,
  loginWithGoogle,
  loginWithFacebook,
  loginWithX,
  getXAuthUrl,
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

export const changePasswordController = catchAsync(
  async (req: IRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { current_password, new_password } = req.body;
    const result = await changePassword(userId, current_password, new_password);

    res.status(200).json(result);
  },
);

export const setNewPasswordController = catchAsync(
  async (req: IRequest, res: Response) => {
    const token = req.query.token as string;
    const { new_password } = req.body;

    const result = await setNewPassword(token, new_password);

    res.status(200).json(result);
  },
);

export const resendOtpController = catchAsync(async (req: IRequest, res: Response) => {
  const { otp_token } = req.body;

  const result = await resendOtp(otp_token);

  res.status(200).json(result);
});

export const validateOtpController = catchAsync(async (req: IRequest, res: Response) => {
  const { otp_token, otp } = req.body;

  const result = await validateOtp(otp_token, otp);

  res.status(200).json(result);
});

export const loginWithGoogleController = catchAsync(
  async (req: IRequest, res: Response) => {
    const { access_token } = req.body;

    const result = await loginWithGoogle(access_token);

    res.status(200).json(result);
  },
);

export const loginWithFacebookController = catchAsync(
  async (req: IRequest, res: Response) => {
    const { access_token } = req.body;

    const result = await loginWithFacebook(access_token);

    res.status(200).json(result);
  },
);

export const loginWithXController = catchAsync(async (req: IRequest, res: Response) => {
  const { oauth_token, oauth_verifier } = req.body;

  const result = await loginWithX(oauth_token, oauth_verifier);

  res.status(200).json(result);
});

export const getXAuthUrlController = catchAsync(async (req: IRequest, res: Response) => {
  const { redirect_uri } = req.body;

  const result = await getXAuthUrl(redirect_uri);

  res.status(200).json(result);
});

// export const googleApi = catchAsync(async (req: Request, res: Response) => {
//   const link = googleAuth();

//   return res.redirect(link);
// });
