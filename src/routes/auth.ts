import { Router } from "express";
import {
  forgotPassword,
  googleAuthCallback,
  googleAuthRedirect,
  googleSignIn,
  login,
  me,
  resendOtp,
  resetPassword,
  signup,
  validateResetToken,
  verifyEmail,
} from "../controller/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";

export const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/resend-otp", resendOtp);
authRouter.post("/forgot-password", forgotPassword);
authRouter.get("/reset-password/validate", validateResetToken);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/login", login);
authRouter.get("/google", googleAuthRedirect);
authRouter.get("/google/callback", googleAuthCallback);
authRouter.post("/google", googleSignIn);
authRouter.get("/me", authenticate, me);
