import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGithubRepoUrl, verifyPublicGithubRepo, listGithubTree } from "./github";

describe("parseGithubRepoUrl", () => {
  it("parses https github URLs", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/widget")).toEqual({
      owner: "acme",
      repo: "widget",
      repoFullName: "acme/widget",
      repoUrl: "https://github.com/acme/widget",
    });
  });

  it("strips .git suffix and rejects invalid hosts", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/widget.git")?.repo).toBe("widget");
    expect(parseGithubRepoUrl("https://gitlab.com/acme/widget")).toBeNull();
    expect(parseGithubRepoUrl("not-a-url")).toBeNull();
  });
});

describe("verifyPublicGithubRepo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when GitHub API responds ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await expect(verifyPublicGithubRepo("acme", "widget")).resolves.toEqual({ ok: true });
  });

  it("returns false when GitHub API responds with error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(verifyPublicGithubRepo("acme", "missing")).resolves.toEqual({
      ok: false,
      reason: "Repository not found or not public",
    });
  });
});

describe("listGithubTree", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes tree entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tree: [
              { path: "src/index.ts", sha: "abc", size: 12, type: "blob" },
              { path: "src", sha: "def", type: "tree" },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(listGithubTree("acme", "widget", "main")).resolves.toEqual([
      { path: "src/index.ts", sha: "abc", size: 12, type: "blob" },
      { path: "src", sha: "def", size: null, type: "tree" },
    ]);
  });
});
