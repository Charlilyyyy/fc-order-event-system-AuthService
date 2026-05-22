import { describe, expect, it } from "vitest";
import add from "./calc.js";

describe("add", () => {
  it("sums two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });

  it("handles zero", () => {
    expect(add(0, 0)).toBe(0);
  });
});
