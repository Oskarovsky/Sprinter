import { describe, expect, it } from "vitest";
import { parseAffectedPaths } from "./path-hints";

describe("parseAffectedPaths", () => {
  it("returns empty array for null, undefined, or blank input", () => {
    expect(parseAffectedPaths(null)).toEqual([]);
    expect(parseAffectedPaths(undefined)).toEqual([]);
    expect(parseAffectedPaths("   \n  ")).toEqual([]);
  });

  it("trims lines and drops empty rows", () => {
    expect(parseAffectedPaths(" src/lib/session/\n\n  src/pages/  \n")).toEqual(["src/lib/session/", "src/pages/"]);
  });

  it("caps at 20 non-empty lines", () => {
    const input = Array.from({ length: 25 }, (_, index) => `path/${index}.ts`).join("\n");
    expect(parseAffectedPaths(input)).toHaveLength(20);
    expect(parseAffectedPaths(input)[0]).toBe("path/0.ts");
    expect(parseAffectedPaths(input)[19]).toBe("path/19.ts");
  });

  it("handles Windows-style newlines", () => {
    expect(parseAffectedPaths("src/a.ts\r\nsrc/b.ts")).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
