import { describe, expect, it } from "vitest";
import { formatAnalystErrorCode, toAnalystDiagnosticsPublic } from "./analyst-diagnostics";

describe("formatAnalystErrorCode", () => {
  it("maps known error codes to Polish messages", () => {
    expect(formatAnalystErrorCode("no_repo_link")).toContain("repozytorium");
    expect(formatAnalystErrorCode("ai_failed")).toContain("OpenRouter");
  });

  it("returns null for empty codes", () => {
    expect(formatAnalystErrorCode(null)).toBeNull();
  });
});

describe("toAnalystDiagnosticsPublic", () => {
  it("marks AI as called when token usage is present", () => {
    expect(
      toAnalystDiagnosticsPublic({
        status: "ready",
        error_code: null,
        source_files: ["src/a.ts"],
        ai_model: "openai/gpt-4o-mini",
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
      }),
    ).toMatchObject({
      sourceFiles: ["src/a.ts"],
      ai: {
        called: true,
        model: "openai/gpt-4o-mini",
        totalTokens: 120,
      },
    });
  });
});
