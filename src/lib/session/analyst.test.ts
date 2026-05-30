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

describe("getAnalystStateForTask", () => {
  it("returns idle state before voting starts", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "draft")).resolves.toEqual({
      analyst: null,
      analystPending: false,
    });
  });

  it("returns pending state during voting", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "voting")).resolves.toEqual({
      analyst: null,
      analystPending: true,
    });
  });

  it("returns ready analyst after reveal", async () => {
    const supabase = mockSupabase({
      story_points: 5,
      rationale: "Moderate complexity in session modules.",
      status: "ready",
    });

    await expect(getAnalystStateForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      analyst: {
        storyPoints: 5,
        rationale: "Moderate complexity in session modules.",
        label: "Sprinter Analyst",
      },
      analystPending: false,
    });
  });

  it("returns pending after reveal while analyst is still running", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: null, status: "pending" });

    await expect(getAnalystStateForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      analyst: null,
      analystPending: true,
    });
  });

  it("returns idle state for failed analyst rows", async () => {
    const supabase = mockSupabase({ story_points: null, rationale: "error", status: "failed" });

    await expect(getAnalystStateForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      analyst: null,
      analystPending: false,
    });
  });
});

describe("getAnalystVoteForTask", () => {
  it("returns null before reveal without querying analyst data for clients", async () => {
    const supabase = mockSupabase({
      story_points: 8,
      rationale: "Complex module",
      status: "ready",
    });

    await expect(getAnalystVoteForTask(supabase, "task-1", "voting")).resolves.toBeNull();
    await expect(getAnalystVoteForTask(supabase, "task-1", "draft")).resolves.toBeNull();
  });

  it("returns public analyst payload only when task is revealed and vote is ready", async () => {
    const supabase = mockSupabase({
      story_points: 5,
      rationale: "Moderate complexity in session modules.",
      status: "ready",
    });

    await expect(getAnalystVoteForTask(supabase, "task-1", "revealed")).resolves.toEqual({
      storyPoints: 5,
      rationale: "Moderate complexity in session modules.",
      label: "Sprinter Analyst",
    });
  });

  it("returns null for pending or failed analyst rows after reveal", async () => {
    const pending = mockSupabase({ story_points: null, rationale: null, status: "pending" });
    const failed = mockSupabase({ story_points: null, rationale: "error", status: "failed" });

    await expect(getAnalystVoteForTask(pending, "task-1", "revealed")).resolves.toBeNull();
    await expect(getAnalystVoteForTask(failed, "task-1", "revealed")).resolves.toBeNull();
  });
});
