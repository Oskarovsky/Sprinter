import { describe, expect, it } from "vitest";
import { MAX_FILE_CONTENT_CHARS, truncateFileContent } from "./content-limits";

describe("truncateFileContent", () => {
  it("returns content unchanged when under the cap", () => {
    expect(truncateFileContent("hello")).toBe("hello");
  });

  it("truncates oversized file content with a marker", () => {
    const content = "x".repeat(MAX_FILE_CONTENT_CHARS + 50);
    const truncated = truncateFileContent(content);

    expect(truncated.length).toBeLessThan(content.length);
    expect(truncated.endsWith("\n… [truncated]")).toBe(true);
  });
});
