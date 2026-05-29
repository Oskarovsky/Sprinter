import { describe, expect, it } from "vitest";
import { fallbackCoachPrompts } from "./coach";

describe("fallbackCoachPrompts", () => {
  it("returns 4 to 5 template questions with vote context", () => {
    const result = fallbackCoachPrompts({
      taskTitle: "Login flow",
      taskDescription: "OAuth only",
      votes: [2, 8],
    });

    expect(result.source).toBe("fallback");
    expect(result.warning).toBeTruthy();
    expect(result.summary).toContain("Login flow");
    expect(result.summary).toContain("2–8");
    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    expect(result.questions.length).toBeLessThanOrEqual(5);
  });
});
