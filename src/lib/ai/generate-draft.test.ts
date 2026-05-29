import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./openrouter", () => ({
  completeJson: vi.fn(),
}));

import { completeJson } from "./openrouter";
import { generateDraftFromNotes } from "./generate-draft";

describe("generateDraftFromNotes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback drafts when AI is not configured", async () => {
    const result = await generateDraftFromNotes({
      notes: "Task one\nDetails\n\nTask two",
    });

    expect(result.source).toBe("fallback");
    expect(result.warning).toBeTruthy();
    expect(result.drafts).toHaveLength(2);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("returns empty drafts for blank notes", async () => {
    const result = await generateDraftFromNotes({ notes: "   " });

    expect(result.source).toBe("fallback");
    expect(result.drafts).toEqual([]);
  });
});
