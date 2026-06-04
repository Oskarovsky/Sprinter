import { describe, expect, it } from "vitest";
import { getAnalystStateForTask, getAnalystVoteForTask } from "./analyst";
import type { SessionSupabaseClient } from "./types";

function mockSupabase(row: unknown, error: Error | null = null): SessionSupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error }),
        }),
      }),
    }),
  } as unknown as SessionSupabaseClient;
}

const readyRow = {
  story_points: 5,
  rationale: "Moderate complexity in session modules.",
  status: "ready",
  error_code: null,
  source_files: ["src/session/analyst.ts"],
  ai_model: "openai/gpt-4o-mini",
  prompt_tokens: 120,
  completion_tokens: 30,
  total_tokens: 150,
};

describe("getAnalystStateForTask", () => {
  it("returns idle state before voting starts", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "draft")).resolves.toEqual({
      analyst: null,
      analystPending: false,
      analystDiagnostics: null,
    });
  });

  it("returns pending state during voting", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "voting")).resolves.toEqual({
      analyst: null,
      analystPending: true,
      analystDiagnostics: null,
    });
  });

  it("returns ready analyst and diagnostics after reveal", async () => {
    const supabase = mockSupabase(readyRow);

    const state = await getAnalystStateForTask(supabase, "task-1", "revealed");
    expect(state.analyst).toEqual({
      storyPoints: 5,
      rationale: "Moderate complexity in session modules.",
      label: "Sprinter Analyst",
    });
    expect(state.analystPending).toBe(false);
    expect(state.analystDiagnostics).toMatchObject({
      status: "ready",
      sourceFiles: ["src/session/analyst.ts"],
      ai: { called: true, totalTokens: 150 },
    });
  });

  it("returns pending after reveal while analyst is still running", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      analyst: null,
      analystPending: true,
      analystDiagnostics: null,
    });
  });

  // it("returns diagnostics for failed analyst rows after reveal", async () => {
  //   const supabase = mockSupabase({
  //     story_points: null,
  //     rationale: null,
  //     status: "failed",
  //     error_code: "ai_failed",
  //     source_files: [],
  //     ai_model: null,
  //     prompt_tokens: null,
  //     completion_tokens: null,
  //     total_tokens: null,
  //   });

  //   const state = await getAnalystStateForTask(supabase, "task-1", "revealed");
  //   expect(state.analyst).toBeNull();
  //   expect(state.analystPending).toBe(false);
  //   expect(state.analystDiagnostics).toMatchObject({
  //     status: "failed",
  //     ai: { called: false },
  //   });
  // });
});

describe("getAnalystVoteForTask", () => {
  it("returns null before reveal without querying analyst data for clients", async () => {
    const supabase = mockSupabase(readyRow);

    await expect(getAnalystVoteForTask(supabase, "task-1", "voting")).resolves.toBeNull();
    await expect(getAnalystVoteForTask(supabase, "task-1", "draft")).resolves.toBeNull();
  });

  it("returns public analyst payload only when task is revealed and vote is ready", async () => {
    const supabase = mockSupabase(readyRow);

    await expect(getAnalystVoteForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      storyPoints: 5,
      rationale: "Moderate complexity in session modules.",
      label: "Sprinter Analyst",
    });
  });

  it("returns null for pending or failed analyst rows after reveal", async () => {
    const pending = mockSupabase({ story_points: null, rationale: null, status: "pending" });
    const failed = mockSupabase({
      story_points: null,
      rationale: "error",
      status: "failed",
      error_code: "ai_failed",
      source_files: [],
      ai_model: null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
    });

    await expect(getAnalystVoteForTask(pending, "task-1", "revealed")).resolves.toBeNull();
    await expect(getAnalystVoteForTask(failed, "task-1", "revealed")).resolves.toBeNull();
  });
});
