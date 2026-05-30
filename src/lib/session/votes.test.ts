import { describe, expect, it } from "vitest";
import { computeHumanAverage } from "./average";
import { extractHumanStoryPoints } from "./votes";
import type { VoteParticipation } from "./types";

function row(userId: string, points: number | null): VoteParticipation {
  return {
    task_id: "task-1",
    user_id: userId,
    display_name: userId,
    voted_at: "2026-05-28T00:00:00Z",
    story_points: points,
  };
}

describe("extractHumanStoryPoints", () => {
  it("returns only non-null participant story points", () => {
    expect(extractHumanStoryPoints([row("a", 5), row("b", null), row("c", 8)])).toEqual([5, 8]);
  });
});

describe("human average regression guard", () => {
  it("uses participation points only and excludes Sprinter Analyst reference votes", () => {
    const humanPoints = extractHumanStoryPoints([row("a", 3), row("b", 5)]);
    expect(computeHumanAverage(humanPoints)).toBe(4);

    const analystReferencePoint = 13;
    expect(computeHumanAverage([...humanPoints, analystReferencePoint])).not.toBe(4);
  });
});
