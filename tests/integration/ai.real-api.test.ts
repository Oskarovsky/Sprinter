import { describe, test, expect } from "vitest";
import { generateAnalystVote } from "@/lib/ai/generate-analyst";
import { isAiConfigured } from "@/lib/ai/config";

describe("generateAnalystVote (real-api)", () => {
  test("should return a valid response from the real OpenRouter API", async () => {
    if (!isAiConfigured()) {
      return;
    }

    const input = {
      taskTitle: "Test Task",
      taskDescription: "This is a test task.",
      affectedPaths: [],
      files: [],
    };

    const result = await generateAnalystVote(input);

    expect(result.result).not.toBeNull();
    expect(result.result?.storyPoints).toBeGreaterThan(0);
    expect(result.result?.rationale).not.toBe("");
  });
});
