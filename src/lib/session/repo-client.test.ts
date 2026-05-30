import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGithubOAuthStartUrl,
  buildGitlabOAuthStartUrl,
  disconnectRepo,
  fetchRepoConnections,
  fetchSessionRepoStatus,
  linkRepo,
} from "./repo-client";

describe("repo-client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchRepoConnections returns library payload", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ connections: [], activeConnectionId: null }), { status: 200 }),
    );

    const result = await fetchRepoConnections();
    expect(result.connections).toEqual([]);
    expect(fetch).toHaveBeenCalledWith("/api/repo/connections", { credentials: "include" });
  });

  it("fetchSessionRepoStatus returns linked summary", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          linked: true,
          connection: {
            provider: "gitlab",
            repoFullName: "acme/widget",
            accessMode: "private",
            linkedByDisplayName: "Alice",
          },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchSessionRepoStatus();
    expect(result.linked).toBe(true);
    expect(result.connection?.repoFullName).toBe("acme/widget");
  });

  it("linkRepo posts repository details without tokens in response handling", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          connection: {
            id: "conn-1",
            provider: "gitlab",
            repoUrl: "https://gitlab.com/acme/widget",
            repoFullName: "acme/widget",
            accessMode: "public",
            gitlabBaseUrl: null,
            defaultBranch: "main",
          },
        }),
        { status: 200 },
      ),
    );

    const result = await linkRepo({
      provider: "gitlab",
      repoUrl: "https://gitlab.com/acme/widget",
      accessMode: "public",
    });
    expect(result.connection.id).toBe("conn-1");
    expect(JSON.stringify(result)).not.toContain("accessToken");
  });

  it("disconnectRepo sends DELETE body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ disconnected: true }), { status: 200 }));

    await disconnectRepo({ removeFromLibrary: true, connectionId: "conn-1" });
    expect(fetch).toHaveBeenCalledWith("/api/repo/link", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeFromLibrary: true, connectionId: "conn-1" }),
    });
  });

  it("buildGithubOAuthStartUrl encodes query params", () => {
    expect(buildGithubOAuthStartUrl("https://github.com/acme/widget")).toBe(
      "/api/repo/oauth/github/start?repoUrl=https%3A%2F%2Fgithub.com%2Facme%2Fwidget&accessMode=private&returnPath=%2Fsession",
    );
  });

  it("buildGitlabOAuthStartUrl includes gitlab base URL", () => {
    const url = buildGitlabOAuthStartUrl("https://gitlab.vodeno.net/vodeno/app", "https://gitlab.vodeno.net");
    expect(url).toContain("/api/repo/oauth/gitlab/start?");
    expect(url).toContain("gitlabBaseUrl=https%3A%2F%2Fgitlab.vodeno.net");
  });
});
