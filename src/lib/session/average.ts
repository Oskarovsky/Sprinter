export function computeHumanAverage(points: number[]): number | null {
  if (points.length === 0) {
    return null;
  }
  const sum = points.reduce((total, value) => total + value, 0);
  return sum / points.length;
}

export function formatHumanAverage(value: number): string {
  return value.toFixed(1);
}
