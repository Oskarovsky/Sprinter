import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./openrouter", () => ({
  completeJsonWithMeta: vi.fn(),
}));

vi.mock("./config", () => ({
  isAiConfigured: vi.fn(),
}));

import { completeJsonWithMeta } from "./openrouter";
import { isAiConfigured } from "./config";
import { generateAnalystVote, normalizeAnalystResponse } from "./generate-analyst";

describe("normalizeAnalystResponse", () => {
  it("accepts valid Fibonacci story points with rationale", () => {
    expect(
      normalizeAnalystResponse({
        storyPoints: 5,
        rationale: "Moderate complexity across session modules.",
      }),
    ).toEqual({
      storyPoints: 5,
      rationale: "Moderate complexity across session modules.",
    });
  });

  it("rejects invalid Fibonacci values", () => {
    expect(
      normalizeAnalystResponse({
        storyPoints: 4,
        rationale: "Invalid point scale.",
      }),
    ).toBeNull();
  });

  it("rejects missing rationale", () => {
    expect(
      normalizeAnalystResponse({
        storyPoints: 3,
        rationale: "   ",
      }),
    ).toBeNull();
  });
});

describe("generateAnalystVote", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when AI is not configured", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(false);

    const result = await generateAnalystVote({
      taskTitle: "Add repo link",
      affectedPaths: [],
      files: [{ path: "src/a.ts", content: "export {}" }],
    });

    expect(result.result).toBeNull();
    expect(result.error).toBe("not_configured");
    expect(completeJsonWithMeta).not.toHaveBeenCalled();
  });

  it("returns null when no file snippets were fetched", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(true);

    const result = await generateAnalystVote({
      taskTitle: "Add repo link",
      affectedPaths: [],
      files: [],
    });

    expect(result.result).toBeNull();
    expect(result.error).toBe("no_files");
    expect(completeJsonWithMeta).not.toHaveBeenCalled();
  });

  it("calls AI when configured and files are present", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(true);
    (completeJsonWithMeta as vi.Mock).mockResolvedValue({
      data: { storyPoints: 3, rationale: "test" },
      model: "test-model",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    await generateAnalystVote({
      taskTitle: "Add repo link",
      affectedPaths: [],
      files: [{ path: "src/a.ts", content: "export {}" }],
    });

    expect(completeJsonWithMeta).toHaveBeenCalled();
  });
});
