import { describe, expect, it } from "vitest";
import { createOAuthState, parseOAuthState } from "./oauth-state";

describe("oauth-state", () => {
  it("round-trips signed state when secret is configured", async () => {
    const state = await createOAuthState({
      userId: "user-1",
      connectionId: null,
      provider: "github",
      repoUrl: "https://github.com/acme/widget",
      repoFullName: "acme/widget",
      gitlabBaseUrl: null,
      returnPath: "/session",
    });

    expect(state).toBeTruthy();
    if (!state) {
      return;
    }
    const parsed = await parseOAuthState(state);
    expect(parsed?.userId).toBe("user-1");
    expect(parsed?.provider).toBe("github");
    expect(parsed?.repoFullName).toBe("acme/widget");
  });

  it("round-trips GitLab self-hosted state payload", async () => {
    const state = await createOAuthState({
      userId: "user-1",
      connectionId: null,
      provider: "gitlab",
      repoUrl: "https://gitlab.vodeno.net/vodeno/payments/blik/blik-api",
      repoFullName: "vodeno/payments/blik/blik-api",
      gitlabBaseUrl: "https://gitlab.vodeno.net",
      returnPath: "/session",
    });

    expect(state).toBeTruthy();
    if (!state) {
      return;
    }
    const parsed = await parseOAuthState(state);
    expect(parsed?.provider).toBe("gitlab");
    expect(parsed?.gitlabBaseUrl).toBe("https://gitlab.vodeno.net");
    expect(parsed?.repoFullName).toBe("vodeno/payments/blik/blik-api");
  });

  it("rejects tampered state", async () => {
    const state = await createOAuthState({
      userId: "user-1",
      connectionId: null,
      provider: "github",
      repoUrl: "https://github.com/acme/widget",
      repoFullName: "acme/widget",
      gitlabBaseUrl: null,
      returnPath: "/session",
    });

    if (!state) {
      throw new Error("expected state");
    }
    expect(await parseOAuthState(`${state}x`)).toBeNull();
  });
});
