import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

const signOptions = {
  expiresIn: env.jwtExpiresIn,
} as SignOptions;

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export function signAccessToken(user: Auth.User): Auth.LoginTokens {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email } satisfies AccessTokenPayload,
    env.jwtSecret,
    signOptions,
  );

  const decoded = jwt.decode(accessToken);
  if (!decoded || typeof decoded === "string" || !decoded.exp || !decoded.iat) {
    throw new Error("Failed to decode access token");
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: decoded.exp - decoded.iat,
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret);
  if (typeof payload === "string" || !payload.sub || !payload.email) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email),
  };
}
