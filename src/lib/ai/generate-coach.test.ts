import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./openrouter", () => ({
  completeJson: vi.fn(),
}));

import { completeJson } from "./openrouter";
import { generateCoachPrompts } from "./generate-coach";

describe("generateCoachPrompts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback prompts when AI is not configured", async () => {
    const result = await generateCoachPrompts({
      taskTitle: "Checkout",
      votes: [1, 8],
    });

    expect(result.source).toBe("fallback");
    expect(result.warning).toBeTruthy();
    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    expect(completeJson).not.toHaveBeenCalled();
  });
});
