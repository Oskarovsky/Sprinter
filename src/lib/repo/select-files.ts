import { parseAffectedPaths } from "./path-hints";
import type { RepoTreeEntry } from "./tree-types";

export const MAX_ANALYST_FILES = 50;

export interface TaskForFileSelection {
  title: string;
  description: string | null;
  affected_paths: string | null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*");
  return new RegExp(`^${escaped}$`, "iu");
}

function matchesHint(path: string, hint: string): boolean {
  const normalizedPath = path.replace(/\\/gu, "/");
  const normalizedHint = hint.replace(/\\/gu, "/").trim();

  if (normalizedHint.length === 0) {
    return false;
  }

  if (normalizedHint.includes("*")) {
    return globToRegExp(normalizedHint).test(normalizedPath);
  }

  if (normalizedHint.endsWith("/")) {
    return normalizedPath.startsWith(normalizedHint) || normalizedPath.startsWith(normalizedHint.slice(0, -1));
  }

  return normalizedPath === normalizedHint || normalizedPath.startsWith(`${normalizedHint}/`);
}

function collectHintMatches(blobPaths: string[], hint: string): string[] {
  return blobPaths.filter((path) => matchesHint(path, hint));
}

export function selectFilesForTask(tree: RepoTreeEntry[], task: TaskForFileSelection): string[] {
  const blobPaths = tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  const selected: string[] = [];
  const seen = new Set<string>();

  const addPath = (path: string) => {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    selected.push(path);
  };

  for (const hint of parseAffectedPaths(task.affected_paths)) {
    for (const path of collectHintMatches(blobPaths, hint)) {
      addPath(path);
      if (selected.length >= MAX_ANALYST_FILES) {
        return selected;
      }
    }
  }

  const keywords = tokenize(`${task.title} ${task.description ?? ""}`);
  if (keywords.length === 0) {
    return selected;
  }

  for (const path of blobPaths) {
    if (seen.has(path)) {
      continue;
    }
    const lowerPath = path.toLowerCase();
    if (keywords.some((keyword) => lowerPath.includes(keyword))) {
      addPath(path);
      if (selected.length >= MAX_ANALYST_FILES) {
        break;
      }
    }
  }

  return selected;
}
