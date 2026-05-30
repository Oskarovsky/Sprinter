import { describe, expect, it } from "vitest";
import { getGitlabOAuthConfig, getOAuthStateSecret } from "./oauth-config";

describe("getGitlabOAuthConfig", () => {
  it("derives callback redirect from request origin", () => {
    expect(getGitlabOAuthConfig("http://127.0.0.1:4321/session")).toEqual({
      clientId: "test-gitlab-client-id",
      redirectUri: "http://127.0.0.1:4321/api/repo/oauth/gitlab/callback",
    });
  });
});

describe("getOAuthStateSecret", () => {
  it("prefers configured OAuth client secrets for state signing", () => {
    expect(getOAuthStateSecret()).toBe("test-github-secret");
  });
});
