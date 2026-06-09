import { describe, it, expect, vi } from "vitest";
import {
  generateDraftFromNotes,
  generateCoachPrompts,
  generateAnalystVote,
} from "@/lib/ai";
import * as config from "@/lib/ai/config";
import { createUser, deleteUser } from "@/test/utils/db";

describe("AI Integration Tests", () => {
  describe("generateDraftFromNotes", () => {
    it("should return a draft from AI when configured", async () => {
      const result = await generateDraftFromNotes({ notes: "A simple note" });
      expect(result.source).toBe("ai");
      expect(result.drafts.length).toBeGreaterThan(0);
      expect(result.drafts[0].title).toBeDefined();
    });

    it("should return a fallback draft when AI is not configured", async () => {
      vi.spyOn(config, "isAiConfigured").mockReturnValue(false);
      const result = await generateDraftFromNotes({ notes: "A simple note" });
      expect(result.source).toBe("fallback");
      expect(result.drafts.length).toBeGreaterThan(0);
      vi.mocked(config.isAiConfigured).mockRestore();
    });
  });

  describe("generateCoachPrompts", () => {
    it("should return coach prompts from AI when configured", async () => {
      const result = await generateCoachPrompts({
        taskTitle: "A simple task",
        votes: [1, 2, 3, 5],
      });
      expect(result.source).toBe("ai");
      expect(result.summary).toBeDefined();
      expect(result.questions.length).toBeGreaterThan(0);
    });

    it("should return fallback coach prompts when AI is not configured", async () => {
      vi.spyOn(config, "isAiConfigured").mockReturnValue(false);
      const result = await generateCoachPrompts({
        taskTitle: "A simple task",
        votes: [1, 2, 3, 5],
      });
      expect(result.source).toBe("fallback");
      expect(result.summary).toBeDefined();
      expect(result.questions.length).toBeGreaterThan(0);
      vi.mocked(config.isAiConfigured).mockRestore();
    });
  });

  describe("generateAnalystVote", () => {
    it("should return an analyst vote from AI when configured", async () => {
      const { result, error } = await generateAnalystVote({
        taskTitle: "A simple task",
        affectedPaths: [],
        files: [{ path: "a.ts", content: "const a = 1;" }],
      });
      expect(error).toBeUndefined();
      expect(result).toBeDefined();
      expect(result?.storyPoints).toBe(5);
    });

    it("should return an error when AI is not configured", async () => {
      vi.spyOn(config, "isAiConfigured").mockReturnValue(false);
      const { result, error } = await generateAnalystVote({
        taskTitle: "A simple task",
        affectedPaths: [],
        files: [{ path: "a.ts", content: "const a = 1;" }],
      });
      expect(result).toBeNull();
      expect(error).toBe("not_configured");
      vi.mocked(config.isAiConfigured).mockRestore();
    });

    it("should return an error when there are no files", async () => {
      const { result, error } = await generateAnalystVote({
        taskTitle: "A simple task",
        affectedPaths: [],
        files: [],
      });
      expect(result).toBeNull();
      expect(error).toBe("no_files");
    });
  });
});
