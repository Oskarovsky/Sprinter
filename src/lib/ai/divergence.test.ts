import { describe, expect, it } from "vitest";
import { isDivergent } from "./divergence";

describe("isDivergent", () => {
  it("returns false for fewer than two votes", () => {
    expect(isDivergent([])).toBe(false);
    expect(isDivergent([5])).toBe(false);
  });

  it("returns false for aligned votes", () => {
    expect(isDivergent([3, 3])).toBe(false);
    expect(isDivergent([5, 5, 5])).toBe(false);
  });

  it("returns true when spread is at least 3", () => {
    expect(isDivergent([1, 4])).toBe(true);
    expect(isDivergent([2, 5])).toBe(true);
  });

  it("returns true when max is at least double min (min > 0)", () => {
    expect(isDivergent([2, 5])).toBe(true);
    expect(isDivergent([3, 8])).toBe(true);
  });

  it("does not apply double rule when min is zero", () => {
    expect(isDivergent([0, 1])).toBe(false);
    expect(isDivergent([0, 2])).toBe(false);
  });
});
