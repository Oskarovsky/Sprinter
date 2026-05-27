import { describe, expect, it } from "vitest";
import { FIBONACCI_STORY_POINTS, isValidStoryPoint } from "./constants";

describe("isValidStoryPoint", () => {
  it.each(FIBONACCI_STORY_POINTS)("accepts Fibonacci value %i", (points) => {
    expect(isValidStoryPoint(points)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isValidStoryPoint(0)).toBe(false);
  });

  it("rejects negative integers", () => {
    expect(isValidStoryPoint(-1)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidStoryPoint(3.5)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isValidStoryPoint(Number.NaN)).toBe(false);
  });

  it("rejects values between allowed Fibonacci numbers", () => {
    expect(isValidStoryPoint(4)).toBe(false);
    expect(isValidStoryPoint(6)).toBe(false);
  });

  it("rejects out-of-scale values", () => {
    expect(isValidStoryPoint(100)).toBe(false);
  });
});
