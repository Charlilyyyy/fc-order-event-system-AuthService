import { describe, expect, it } from "vitest";
import {
  extractGoogleIdToken,
  stripAndValidateLoginInput,
  stripAndValidateSignupInput,
} from "./validation.js";

describe("stripAndValidateLoginInput", () => {
  it("returns stripped credentials for valid input", () => {
    const result = stripAndValidateLoginInput({
      email: "  Alice@Example.COM ",
      password: "  secret123  ",
    });

    expect(result).toEqual({
      email: "alice@example.com",
      password: "secret123",
    });
  });

  it("returns null for missing or empty fields", () => {
    expect(stripAndValidateLoginInput({ email: "", password: "secret123" })).toBeNull();
    expect(stripAndValidateLoginInput(null)).toBeNull();
    expect(stripAndValidateLoginInput({ email: "a@b.com" })).toBeNull();
  });

  it("returns null for invalid email or short password", () => {
    expect(
      stripAndValidateLoginInput({ email: "not-an-email", password: "secret123" }),
    ).toBeNull();
    expect(
      stripAndValidateLoginInput({ email: "a@b.com", password: "short" }),
    ).toBeNull();
  });

  it("returns null for suspicious SQL-like input", () => {
    expect(
      stripAndValidateLoginInput({
        email: "a@b.com",
        password: "'; DROP TABLE users; --",
      }),
    ).toBeNull();
  });
});

describe("stripAndValidateSignupInput", () => {
  it("returns null when passwords do not match", () => {
    const result = stripAndValidateSignupInput({
      email: "alice@example.com",
      password: "secret123",
      passwordConfirmation: "different",
    });

    expect(result).toBeNull();
  });

  it("returns signup payload when passwords match", () => {
    const result = stripAndValidateSignupInput({
      email: "alice@example.com",
      password: "secret123",
      passwordConfirmation: "secret123",
    });

    expect(result).toEqual({
      email: "alice@example.com",
      password: "secret123",
      passwordConfirmation: "secret123",
    });
  });
});

describe("extractGoogleIdToken", () => {
  it("accepts credential or idToken field", () => {
    expect(extractGoogleIdToken({ credential: "  token-a  " })).toBe("token-a");
    expect(extractGoogleIdToken({ idToken: "token-b" })).toBe("token-b");
    expect(extractGoogleIdToken({})).toBeNull();
  });
});
