const MAX_AFFECTED_PATH_LINES = 20;

export function parseAffectedPaths(raw: string | null | undefined): string[] {
  if (raw == null || raw.trim().length === 0) {
    return [];
  }

  const lines = raw.split(/\r?\n/);
  const paths: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    paths.push(trimmed);
    if (paths.length >= MAX_AFFECTED_PATH_LINES) {
      break;
    }
  }

  return paths;
}
