import { signAccessToken } from "./jwt.js";
import { HttpStatusCode } from "../types/http-status.js";

export function buildLoginData(user: Auth.User): Auth.LoginResponse {
  const tokens = signAccessToken(user);
  return {
    user,
    accessToken: tokens.accessToken,
    tokenType: tokens.tokenType,
    expiresIn: tokens.expiresIn,
  };
}

export function buildLoginSuccessResponse(
  user: Auth.User,
): API.SuccessResponse<Auth.LoginResponse> {
  return {
    data: buildLoginData(user),
    error: null,
    status: HttpStatusCode.OK,
  } satisfies API.SuccessResponse<Auth.LoginResponse>;
}

export function buildSignupPendingResponse(
  user: Auth.User,
  otpExpiresIn: number,
): API.CreatedResponse<Auth.SignupPendingResponse> {
  return {
    data: {
      user,
      message: "Verification OTP sent to your email",
      otpExpiresIn,
    },
    error: null,
    status: HttpStatusCode.CREATED,
  } satisfies API.CreatedResponse<Auth.SignupPendingResponse>;
}
