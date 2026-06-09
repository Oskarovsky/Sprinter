import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./openrouter", () => ({
  completeJson: vi.fn(),
}));

vi.mock("./config", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    isAiConfigured: vi.fn(),
  };
});

import { completeJson } from "./openrouter";
import { isAiConfigured } from "./config";
import { generateDraftFromNotes } from "./generate-draft";

describe("generateDraftFromNotes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback drafts when AI is not configured", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(false);

    const result = await generateDraftFromNotes({
      notes: "Task one\nDetails\n\nTask two",
    });

    expect(result.source).toBe("fallback");
    expect(result.warning).toBeTruthy();
    expect(result.drafts).toHaveLength(2);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("returns empty drafts for blank notes", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(false);
    const result = await generateDraftFromNotes({ notes: "   " });

    expect(result.source).toBe("fallback");
    expect(result.drafts).toEqual([]);
  });

  it("calls AI when configured", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(true);
    (completeJson as vi.Mock).mockResolvedValue({
      drafts: [{ title: "test draft" }],
    });

    await generateDraftFromNotes({
      notes: "A task",
    });

    expect(completeJson).toHaveBeenCalled();
  });
});
