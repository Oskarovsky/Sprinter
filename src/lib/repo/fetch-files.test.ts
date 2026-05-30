import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_FILE_CONTENT_CHARS } from "./content-limits";
import type { FacilitatorRepoConnection } from "./types";

const githubConnection: FacilitatorRepoConnection = {
  id: "conn-1",
  user_id: "user-1",
  provider: "github",
  repo_url: "https://github.com/acme/widget",
  repo_full_name: "acme/widget",
  default_branch: "main",
  access_mode: "public",
  gitlab_base_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("fetchFileContents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("stops fetching when aggregate byte cap is reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        const payload = "x".repeat(MAX_FILE_CONTENT_CHARS);
        return new Response(JSON.stringify({ content: btoa(payload), encoding: "base64" }), { status: 200 });
      }),
    );

    const { fetchFileContents } = await import("./fetch-files");
    const files = await fetchFileContents(githubConnection, ["a.ts", "b.ts", "c.ts", "d.ts"], {
      maxBytes: 30_000,
    });

    expect(files.length).toBeLessThanOrEqual(2);
    expect(files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0)).toBeLessThanOrEqual(
      30_000,
    );
  });
});
