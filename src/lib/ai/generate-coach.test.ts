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
import { generateCoachPrompts } from "./generate-coach";

describe("generateCoachPrompts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback prompts when AI is not configured", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(false);

    const result = await generateCoachPrompts({
      taskTitle: "Checkout",
      votes: [1, 8],
    });

    expect(result.source).toBe("fallback");
    expect(result.warning).toBeTruthy();
    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("calls AI when configured", async () => {
    (isAiConfigured as vi.Mock).mockReturnValue(true);
    (completeJson as vi.Mock).mockResolvedValue({
      summary: "test summary",
      questions: ["q1", "q2", "q3"],
    });

    await generateCoachPrompts({
      taskTitle: "Checkout",
      votes: [1, 8],
    });

    expect(completeJson).toHaveBeenCalled();
  });
});
