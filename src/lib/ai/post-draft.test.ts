import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";

vi.mock("@/lib/session/api-json", () => ({
  jsonResponse: (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  requireSessionAuth: vi.fn(),
}));

vi.mock("@/lib/ai/generate-draft", () => ({
  generateDraftFromNotes: vi.fn(),
}));

import { generateDraftFromNotes } from "@/lib/ai/generate-draft";
import { requireSessionAuth } from "@/lib/session/api-json";
import { postDraft } from "./post-draft";

function createContext(body: unknown): APIContext {
  return {
    request: new Request("http://test/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as APIContext;
}

describe("postDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSessionAuth).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const response = await postDraft(createContext({ notes: "hello" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when notes are missing", async () => {
    vi.mocked(requireSessionAuth).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
    });

    const response = await postDraft(createContext({ notes: "   " }));
    expect(response.status).toBe(400);
  });

  it("returns draft result when authenticated", async () => {
    vi.mocked(requireSessionAuth).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
    });
    vi.mocked(generateDraftFromNotes).mockResolvedValue({
      source: "fallback",
      warning: "AI off",
      drafts: [{ title: "Task", description: "", acceptanceCriteria: [], openQuestions: [] }],
    });

    const response = await postDraft(createContext({ notes: "Task\nDetails" }));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.source).toBe("fallback");
    expect(payload.drafts).toHaveLength(1);
  });
});
