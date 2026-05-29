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

vi.mock("@/lib/ai/generate-coach", () => ({
  generateCoachPrompts: vi.fn(),
}));

import { generateCoachPrompts } from "@/lib/ai/generate-coach";
import { requireSessionAuth } from "@/lib/session/api-json";
import { postCoach } from "./post-coach";

function createContext(body: unknown): APIContext {
  return {
    request: new Request("http://test/api/ai/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as APIContext;
}

describe("postCoach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSessionAuth).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireSessionAuth).mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const response = await postCoach(createContext({ taskTitle: "Task", votes: [1, 8] }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when votes are not divergent", async () => {
    const response = await postCoach(createContext({ taskTitle: "Task", votes: [3, 3] }));
    expect(response.status).toBe(400);
    expect(generateCoachPrompts).not.toHaveBeenCalled();
  });

  it("returns coach result for divergent votes", async () => {
    vi.mocked(generateCoachPrompts).mockResolvedValue({
      source: "fallback",
      warning: "AI off",
      summary: "Spread",
      questions: ["Q1", "Q2", "Q3", "Q4"],
    });

    const response = await postCoach(createContext({ taskTitle: "Task", votes: [1, 8] }));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.questions).toHaveLength(4);
  });
});
