import { describe, it, expect, vi } from "vitest";
import type { APIContext } from "astro";
import { POST as postRepoLink } from "@/pages/api/repo/link";
import { POST as postStartVoting } from "@/pages/api/session/tasks/[taskId]/start-voting";
import * as apiJson from "@/lib/session/api-json";
import * as resolveSession from "@/lib/session/resolve-session-slug";
import * as github from "@/lib/repo/providers/github";
import * as connections from "@/lib/repo/connections";
import * as session from "@/lib/session";
import * as supabaseService from "@/lib/supabase-service";
import * as runAnalyst from "@/lib/repo/run-analyst";

vi.mock("@/lib/session/api-json", () => ({
  jsonResponse: (body, status) => new Response(JSON.stringify(body), { status }),
  requireSessionAuth: vi.fn(),
}));
vi.mock("@/lib/session/resolve-session-slug");
vi.mock("@/lib/repo/providers/github", () => ({
  parseGithubRepoUrl: vi.fn(),
  verifyPublicGithubRepo: vi.fn(),
  fetchGithubRepoMeta: vi.fn(),
}));
vi.mock("@/lib/repo/connections", () => ({
  toPublicConnection: (c) => c,
  upsertFacilitatorConnection: vi.fn(),
  setSessionRepoLink: vi.fn(),
}));
vi.mock("@/lib/session");
vi.mock("@/lib/supabase-service");
vi.mock("@/lib/repo/run-analyst");

function createContext(body?: unknown, params?: Record<string, string>): APIContext {
  return {
    params,
    locals: {},
    request: new Request("http://test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  } as APIContext;
}

describe("Repository Integration Tests", () => {
  describe("Repository Linking", () => {
    it("should successfully link a public repository", async () => {
      vi.mocked(apiJson.requireSessionAuth).mockResolvedValue({
        supabase: {} as never,
        user: { id: "user-1" } as never,
      });
      vi.mocked(resolveSession.requireSessionSlugFromRequest).mockResolvedValue({
        sessionId: "session-1",
      });
      vi.mocked(github.parseGithubRepoUrl).mockReturnValue({
        owner: "user",
        repo: "repo",
        repoFullName: "user/repo",
        repoUrl: "https://github.com/user/repo",
      });
      vi.mocked(github.verifyPublicGithubRepo).mockResolvedValue({ ok: true });
      vi.mocked(github.fetchGithubRepoMeta).mockResolvedValue({
        defaultBranch: "main",
      });
      vi.mocked(connections.upsertFacilitatorConnection).mockResolvedValue({
        data: { id: "conn-1" } as any,
      });
      vi.mocked(connections.setSessionRepoLink).mockResolvedValue({});

      const response = await postRepoLink(
        createContext({
          provider: "github",
          accessMode: "public",
          repoUrl: "https://github.com/user/repo",
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.connection).toBeDefined();
    });

    it("should return an error for an invalid repository URL", async () => {
      vi.mocked(apiJson.requireSessionAuth).mockResolvedValue({
        supabase: {} as never,
        user: { id: "user-1" } as never,
      });
      vi.mocked(resolveSession.requireSessionSlugFromRequest).mockResolvedValue({
        sessionId: "session-1",
      });
      vi.mocked(github.parseGithubRepoUrl).mockReturnValue(null);

      const response = await postRepoLink(
        createContext({
          provider: "github",
          accessMode: "public",
          repoUrl: "invalid-url",
        }),
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid GitHub repository URL");
    });
  });

  describe("Sprinter Analyst Workflow", () => {
    it("should trigger the analyst workflow", async () => {
      vi.mocked(apiJson.requireSessionAuth).mockResolvedValue({
        supabase: {} as never,
        user: { id: "user-1" } as never,
      });
      vi.mocked(resolveSession.validateTaskSessionSlugWhenPresent).mockResolvedValue({
        sessionId: "session-1",
      });
      vi.mocked(session.startVoting).mockResolvedValue({
        data: { session_id: "session-1" } as any,
      });
      vi.mocked(supabaseService.createServiceRoleClient).mockReturnValue({} as any);
      vi.mocked(runAnalyst.insertAnalystPending).mockResolvedValue();
      vi.mocked(runAnalyst.runAnalystForTask).mockResolvedValue();

      const response = await postStartVoting(createContext(undefined, { taskId: "task-1" }));

      expect(response.status).toBe(200);
      expect(runAnalyst.insertAnalystPending).toHaveBeenCalledWith({}, "task-1");
      expect(runAnalyst.runAnalystForTask).toHaveBeenCalledWith({
        taskId: "task-1",
        sessionId: "session-1",
        serviceClient: {},
      });
    });
  });
});
