import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await comparePassword("secret123", hash)).toBe(true);
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});
