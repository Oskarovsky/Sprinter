import { describe, expect, it, vi } from "vitest";
import { getLatestActiveTask } from "./tasks";
import type { SessionSupabaseClient } from "./types";

function mockLatestTaskQuery(row: unknown, error: Error | null = null): SessionSupabaseClient {
  const maybeSingle = vi.fn(async () => ({ data: row, error }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const inFilter = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ in: inFilter }));
  const select = vi.fn(() => ({ eq }));

  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SessionSupabaseClient;
}

describe("getLatestActiveTask", () => {
  it("includes draft tasks when querying the latest room task", async () => {
    const supabase = mockLatestTaskQuery({
      id: "task-1",
      session_id: "session-1",
      title: "New draft",
      status: "draft",
    });

    const result = await getLatestActiveTask(supabase, "session-1");

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe("draft");
    expect(supabase.from).toHaveBeenCalledWith("tasks");
  });
});
