import { describe, expect, it } from "vitest";
import { computeHumanAverage, formatHumanAverage } from "./average";

describe("computeHumanAverage", () => {
  it("returns null for empty input", () => {
    expect(computeHumanAverage([])).toBeNull();
  });

  it("computes arithmetic mean", () => {
    expect(computeHumanAverage([5, 8])).toBe(6.5);
    expect(computeHumanAverage([3])).toBe(3);
  });
});

describe("formatHumanAverage", () => {
  it("formats to one decimal place", () => {
    expect(formatHumanAverage(6.5)).toBe("6.5");
    expect(formatHumanAverage(5)).toBe("5.0");
  });
});
