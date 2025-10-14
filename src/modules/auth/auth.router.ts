import { Router } from "express";
import {
  login,
  register,
  forgotPasswordEmail,
  changePasswordController,
  setNewPasswordController,
  resendOtpController,
  validateOtpController,
  loginWithGoogleController,
  loginWithFacebookController,
  loginWithXController,
  getXAuthUrlController,
} from "@/modules/auth/auth.controller";
import validate from "@/core/middleware/validation.middleware";
import {
  registerValidation,
  changePasswordValidation,
  setNewPasswordValidation,
  resendOtpValidation,
  validateOtpValidation,
  googleLoginValidation,
  facebookLoginValidation,
  xLoginValidation,
  getAuthUrlValidation,
} from "@/modules/auth/auth-validation";
import { authenticate } from "@/core/middleware/auth.middleware";

const authRouter = Router();

// Based on Excel sheet endpoints

// POST /api/auth/change-password/ - Change password
authRouter.post(
  "/change-password/",
  authenticate,
  validate(changePasswordValidation),
  changePasswordController,
);

// POST /api/auth/forgot-password-email/ - Forgot password email
authRouter.post("/forgot-password-email/", forgotPasswordEmail);

// POST /api/auth/login-with-facebook/ - Login with Facebook
authRouter.post(
  "/login-with-facebook/",
  validate(facebookLoginValidation),
  loginWithFacebookController,
);

// POST /api/auth/login-with-google/ - Login with Google
authRouter.post(
  "/login-with-google/",
  validate(googleLoginValidation),
  loginWithGoogleController,
);

// POST /api/auth/login-with-x/ - Login with X (Twitter)
authRouter.post("/login-with-x/", validate(xLoginValidation), loginWithXController);

// POST /api/auth/register/ - Register user
authRouter.post("/register/", validate(registerValidation), register);

// POST /api/auth/resend-otp/ - Resend OTP
authRouter.post("/resend-otp/", validate(resendOtpValidation), resendOtpController);

// POST /api/auth/send-otp/ - Send OTP
authRouter.post("/send-otp/", login);

// POST /api/auth/set-new-password/ - Set new password
authRouter.post(
  "/set-new-password/",
  validate(setNewPasswordValidation),
  setNewPasswordController,
);

// POST /api/auth/validate-otp/ - Validate OTP
authRouter.post("/validate-otp/", validate(validateOtpValidation), validateOtpController);

// POST /api/auth/x-get-auth-url/ - Get X auth URL
authRouter.post(
  "/x-get-auth-url/",
  validate(getAuthUrlValidation),
  getXAuthUrlController,
);

export default authRouter;
