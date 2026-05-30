import type { RepoAccessMode, RepoProvider } from "./types";

export function parseLinkProvider(value: unknown): RepoProvider | null {
  return value === "github" || value === "gitlab" ? value : null;
}

export function parseLinkAccessMode(value: unknown): RepoAccessMode | null {
  return value === "public" || value === "private" ? value : null;
}

export interface ParsedLinkPostFields {
  provider: RepoProvider;
  accessMode: RepoAccessMode;
  repoUrl: string;
}

export function parseLinkPostFields(body: unknown): ParsedLinkPostFields | { error: string } {
  const payload = body as {
    provider?: unknown;
    repoUrl?: unknown;
    accessMode?: unknown;
  };

  const provider = parseLinkProvider(payload.provider);
  const accessMode = parseLinkAccessMode(payload.accessMode);
  const repoUrl = typeof payload.repoUrl === "string" ? payload.repoUrl.trim() : "";

  if (!provider || !accessMode || !repoUrl) {
    return { error: "provider, repoUrl, and accessMode are required" };
  }

  return { provider, accessMode, repoUrl };
}
