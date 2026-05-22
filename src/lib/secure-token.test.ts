import { describe, expect, it } from "vitest";
import { generateSecureToken, hashSecureToken } from "./secure-token.js";

describe("secure-token", () => {
  it("generates URL-safe tokens", () => {
    const token = generateSecureToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes tokens consistently", () => {
    const token = "test-token-value";
    expect(hashSecureToken(token)).toBe(hashSecureToken(token));
  });
});
