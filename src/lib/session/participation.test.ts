import { describe, expect, it } from "vitest";
import { sortParticipationByPoints } from "./participation";
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

describe("sortParticipationByPoints", () => {
  it("sorts by story_points ascending with nulls last", () => {
    const sorted = sortParticipationByPoints([row("b", 8), row("a", 3), row("c", null)]);
    expect(sorted.map((r) => r.story_points)).toEqual([3, 8, null]);
  });
});
