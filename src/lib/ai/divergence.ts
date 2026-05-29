export function isDivergent(votes: number[]): boolean {
  if (votes.length < 2) {
    return false;
  }

  const min = Math.min(...votes);
  const max = Math.max(...votes);

  if (max - min >= 3) {
    return true;
  }

  return min > 0 && max >= 2 * min;
}
