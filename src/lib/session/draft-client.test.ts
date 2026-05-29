import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDraftsFromNotes } from "./draft-client";

describe("fetchDraftsFromNotes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns draft result on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          source: "fallback",
          warning: "AI off",
          drafts: [{ title: "Task", description: "", acceptanceCriteria: [], openQuestions: [] }],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchDraftsFromNotes("notes");
    expect(result.source).toBe("fallback");
    expect(result.drafts).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "notes" }),
    });
  });

  it("throws with API error message on 400", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "notes is required" }), { status: 400 }));

    await expect(fetchDraftsFromNotes("")).rejects.toThrow("notes is required");
  });

  it("throws with API error message on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));

    await expect(fetchDraftsFromNotes("notes")).rejects.toThrow("Unauthorized");
  });
});
