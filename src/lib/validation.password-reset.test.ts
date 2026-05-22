import { describe, expect, it } from "vitest";
import {
  stripAndValidateForgotPasswordInput,
  stripAndValidateResetPasswordInput,
  stripAndValidateResetToken,
} from "./validation.js";

describe("password reset validation", () => {
  const validToken = "a".repeat(43);

  it("accepts forgot password email", () => {
    expect(
      stripAndValidateForgotPasswordInput({ email: "User@Example.com" }),
    ).toEqual({ email: "user@example.com" });
  });

  it("accepts reset token from query string shape", () => {
    expect(stripAndValidateResetToken({ token: validToken })).toEqual({
      token: validToken,
    });
  });

  it("accepts reset password input", () => {
    expect(
      stripAndValidateResetPasswordInput({
        token: validToken,
        password: "newpassword1",
        passwordConfirmation: "newpassword1",
      }),
    ).toEqual({
      token: validToken,
      password: "newpassword1",
      passwordConfirmation: "newpassword1",
    });
  });

  it("rejects mismatched passwords", () => {
    expect(
      stripAndValidateResetPasswordInput({
        token: validToken,
        password: "newpassword1",
        passwordConfirmation: "different1",
      }),
    ).toBeNull();
  });
});
