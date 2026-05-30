import { describe, expect, it } from "vitest";
import { MAX_ANALYST_FILES, selectFilesForTask } from "./select-files";
import type { RepoTreeEntry } from "./tree-types";

function blob(path: string): RepoTreeEntry {
  return { path, sha: "sha", size: 100, type: "blob" };
}

describe("selectFilesForTask", () => {
  const tree = [
    blob("src/lib/session/tasks.ts"),
    blob("src/lib/session/votes.ts"),
    blob("src/pages/api/session/tasks.ts"),
    blob("README.md"),
    blob("docs/guide.md"),
  ];

  it("prioritizes affected path hints before keyword matches", () => {
    const selected = selectFilesForTask(tree, {
      title: "session votes",
      description: null,
      affected_paths: "README.md",
    });

    expect(selected[0]).toBe("README.md");
    expect(selected).toContain("src/lib/session/votes.ts");
  });

  it("matches directory hints and globs", () => {
    const selected = selectFilesForTask(tree, {
      title: "irrelevant",
      description: null,
      affected_paths: "src/lib/session/\nsrc/pages/*/tasks.ts",
    });

    expect(selected).toEqual(
      expect.arrayContaining([
        "src/lib/session/tasks.ts",
        "src/lib/session/votes.ts",
        "src/pages/api/session/tasks.ts",
      ]),
    );
  });

  it(`caps selection at ${MAX_ANALYST_FILES} files`, () => {
    const largeTree = Array.from({ length: 80 }, (_, index) => blob(`src/feature/file-${index}.ts`));
    const selected = selectFilesForTask(largeTree, {
      title: "feature",
      description: "feature work",
      affected_paths: null,
    });

    expect(selected).toHaveLength(MAX_ANALYST_FILES);
  });
});
