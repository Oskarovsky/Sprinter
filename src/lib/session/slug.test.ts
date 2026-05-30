import { describe, expect, it } from "vitest";
import { normalizePlanningSessionSlug } from "./slug";

describe("normalizePlanningSessionSlug", () => {
  it("normalizes spaces and underscores to kebab-case", () => {
    expect(normalizePlanningSessionSlug("Sprint 42")).toBe("sprint-42");
    expect(normalizePlanningSessionSlug("team_alpha")).toBe("team-alpha");
  });

  it("collapses repeated hyphens and trims edges", () => {
    expect(normalizePlanningSessionSlug("  sprint--42  ")).toBe("sprint-42");
    expect(normalizePlanningSessionSlug("-sprint-42-")).toBe("sprint-42");
  });

  it("accepts valid slugs within length bounds", () => {
    expect(normalizePlanningSessionSlug("abc")).toBe("abc");
    expect(normalizePlanningSessionSlug("a".repeat(32))).toBe("a".repeat(32));
  });

  it("rejects too short, too long, or invalid characters", () => {
    expect(normalizePlanningSessionSlug("ab")).toBeNull();
    expect(normalizePlanningSessionSlug("a".repeat(33))).toBeNull();
    expect(normalizePlanningSessionSlug("team@alpha")).toBeNull();
    expect(normalizePlanningSessionSlug("")).toBeNull();
  });
});
