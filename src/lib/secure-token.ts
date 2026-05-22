import { createHash, randomBytes } from "node:crypto";

export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecureToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
