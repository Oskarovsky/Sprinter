import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGitlabAuthorizeUrl,
  DEFAULT_GITLAB_BASE_URL,
  exchangeGitlabCode,
  normalizeGitlabBaseUrl,
  parseGitlabRepoUrl,
  verifyPrivateGitlabRepoWithPat,
  verifyPublicGitlabRepo,
  listGitlabTree,
} from "./gitlab";

describe("normalizeGitlabBaseUrl", () => {
  it("defaults empty input to gitlab.com", () => {
    expect(normalizeGitlabBaseUrl(null)).toBe(DEFAULT_GITLAB_BASE_URL);
    expect(normalizeGitlabBaseUrl("")).toBe(DEFAULT_GITLAB_BASE_URL);
  });

  it("accepts https self-hosted origins", () => {
    expect(normalizeGitlabBaseUrl("https://gitlab.mycompany.com/")).toBe("https://gitlab.mycompany.com");
  });

  it("rejects non-https origins", () => {
    expect(normalizeGitlabBaseUrl("http://gitlab.com")).toBeNull();
  });
});

describe("parseGitlabRepoUrl", () => {
  it("parses gitlab.com project paths", () => {
    expect(parseGitlabRepoUrl("https://gitlab.com/acme/widget", DEFAULT_GITLAB_BASE_URL)).toEqual({
      projectPath: "acme/widget",
      repoFullName: "acme/widget",
      repoUrl: "https://gitlab.com/acme/widget",
    });
  });

  it("parses self-hosted project paths", () => {
    const base = "https://gitlab.mycompany.com";
    expect(parseGitlabRepoUrl(`${base}/team/app`, base)).toEqual({
      projectPath: "team/app",
      repoFullName: "team/app",
      repoUrl: `${base}/team/app`,
    });
  });
});

describe("verifyPublicGitlabRepo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the project API on the configured base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyPublicGitlabRepo("https://gitlab.mycompany.com", "team/app")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gitlab.mycompany.com/api/v4/projects/team%2Fapp",
      expect.any(Object),
    );
  });
});

describe("verifyPrivateGitlabRepoWithPat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects placeholder PAT values", async () => {
    await expect(
      verifyPrivateGitlabRepoWithPat("https://gitlab.vodeno.net", "vodeno/payments/blik/blik-api", "glpat-..."),
    ).resolves.toEqual({ ok: false, reason: "Replace the placeholder with your full GitLab access token" });
  });

  it("accepts tokens without the glpat- prefix", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPrivateGitlabRepoWithPat(
        "https://gitlab.vodeno.net",
        "vodeno/payments/blik/blik-api",
        "legacy-token-abc123",
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("falls back to Bearer auth when PRIVATE-TOKEN returns 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "401 Unauthorized" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPrivateGitlabRepoWithPat("https://gitlab.vodeno.net", "vodeno/payments/blik/blik-api", "oauth-style-token"),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://gitlab.vodeno.net/api/v4/projects/vodeno%2Fpayments%2Fblik%2Fblik-api",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer oauth-style-token" }),
      }),
    );
  });

  it("sends PRIVATE-TOKEN header for PAT verification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPrivateGitlabRepoWithPat("https://gitlab.vodeno.net", "vodeno/payments/blik/blik-api", "glpat-test"),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://gitlab.vodeno.net/api/v4/projects/vodeno%2Fpayments%2Fblik%2Fblik-api",
      expect.objectContaining({
        headers: expect.objectContaining({ "PRIVATE-TOKEN": "glpat-test" }),
      }),
    );
  });
});

describe("buildGitlabAuthorizeUrl", () => {
  it("builds self-hosted authorize URL with OAuth scopes", () => {
    const base = "https://gitlab.vodeno.net";
    const url = new URL(
      buildGitlabAuthorizeUrl(base, "app-id", "http://127.0.0.1:4321/api/repo/oauth/gitlab/callback", "signed-state"),
    );

    expect(url.origin).toBe(base);
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("app-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("read_api read_repository");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:4321/api/repo/oauth/gitlab/callback");
  });
});

describe("exchangeGitlabCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges authorization code for tokens on self-hosted GitLab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "oauth-access",
            refresh_token: "oauth-refresh",
            expires_in: 7200,
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      exchangeGitlabCode(
        "auth-code",
        "app-id",
        "app-secret",
        "http://127.0.0.1:4321/api/repo/oauth/gitlab/callback",
        "https://gitlab.vodeno.net",
      ),
    ).resolves.toEqual({
      accessToken: "oauth-access",
      refreshToken: "oauth-refresh",
      expiresAt: expect.any(String),
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gitlab.vodeno.net/oauth/token",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"grant_type":"authorization_code"'),
      }),
    );
  });

  it("returns null when token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    await expect(
      exchangeGitlabCode("bad-code", "app-id", "app-secret", "http://127.0.0.1:4321/cb", DEFAULT_GITLAB_BASE_URL),
    ).resolves.toBeNull();
  });
});

describe("listGitlabTree", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes repository tree entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            { path: "README.md", id: "1", type: "blob" },
            { path: "src", id: "2", type: "tree" },
          ]),
          { status: 200 },
        ),
      ),
    );

    await expect(listGitlabTree(DEFAULT_GITLAB_BASE_URL, "acme/widget", "main")).resolves.toEqual([
      { path: "README.md", sha: "1", size: null, type: "blob" },
      { path: "src", sha: "2", size: null, type: "tree" },
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://gitlab.com/api/v4/projects/acme%2Fwidget/repository/tree?recursive=true&ref=main&per_page=100&page=1",
      expect.any(Object),
    );
  });
});
