import { describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "./google-oauth.js";

describe("google OAuth state", () => {
  it("round-trips redirect path in signed state", () => {
    const state = signOAuthState("/dashboard");
    expect(verifyOAuthState(state)).toEqual({ redirectPath: "/dashboard" });
  });

  it("rejects tampered state", () => {
    expect(() => verifyOAuthState("invalid.state.token")).toThrow();
  });
});
