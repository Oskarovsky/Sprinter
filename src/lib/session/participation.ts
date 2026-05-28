import type { VoteParticipation } from "./types";

export function sortParticipationByPoints(rows: VoteParticipation[]): VoteParticipation[] {
  return [...rows].sort((a, b) => {
    if (a.story_points === null && b.story_points === null) {
      return 0;
    }
    if (a.story_points === null) {
      return 1;
    }
    if (b.story_points === null) {
      return -1;
    }
    return a.story_points - b.story_points;
  });
}
