import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("jwt", () => {
  const user = { id: "user-1", email: "alice@example.com" } satisfies Auth.User;

  it("signs and verifies an access token", () => {
    const tokens = signAccessToken(user);

    expect(tokens.tokenType).toBe("Bearer");
    expect(tokens.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(tokens.expiresIn).toBeGreaterThan(0);

    const payload = verifyAccessToken(tokens.accessToken);
    expect(payload).toEqual({ sub: user.id, email: user.email });
  });

  it("rejects invalid tokens", () => {
    expect(() => verifyAccessToken("not.a.jwt")).toThrow();
  });
});
