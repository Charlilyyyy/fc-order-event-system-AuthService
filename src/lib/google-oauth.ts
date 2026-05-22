import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

let oauthClient: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  if (!oauthClient) {
    oauthClient = new OAuth2Client(
      env.googleClientId,
      env.googleClientSecret,
      env.googleRedirectUri,
    );
  }

  return oauthClient;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function getGoogleAuthorizationUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await getOAuthClient().verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google token payload");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified ?? false,
    name: payload.name,
    picture: payload.picture,
  };
}

export async function exchangeGoogleAuthCode(code: string): Promise<GoogleProfile> {
  const { tokens } = await getOAuthClient().getToken(code);
  if (!tokens.id_token) {
    throw new Error("Missing id_token from Google");
  }

  return verifyGoogleIdToken(tokens.id_token);
}

export function signOAuthState(redirectPath = "/"): string {
  return jwt.sign({ redirectPath }, env.jwtSecret, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): { redirectPath: string } {
  const payload = jwt.verify(state, env.jwtSecret);
  if (typeof payload === "string" || !payload || typeof payload !== "object") {
    throw new Error("Invalid OAuth state");
  }

  const redirectPath =
    "redirectPath" in payload && typeof payload.redirectPath === "string"
      ? payload.redirectPath
      : "/";

  return { redirectPath };
}
