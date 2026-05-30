import { isAiConfigured } from "./config";
import { completeJson } from "./openrouter";
import { MAX_ANALYST_PROMPT_CHARS } from "@/lib/repo/content-limits";
import type { AnalystInput, AnalystResult, OpenRouterAnalystResponse } from "./types";

export const VALID_ANALYST_STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

const ANALYST_SYSTEM_PROMPT = `You are Sprinter Analyst — a reference-only planning poker assistant.
Estimate story points from code complexity signals in the provided task and file snippets.
Respond with JSON only: { "storyPoints": number, "rationale": string }.
Use Fibonacci scale only: 1, 2, 3, 5, 8, 13, or 21.
This vote is reference-only and excluded from the human team average.
Do not mention human votes or team consensus. Use the same language as the task title.`;

function isValidStoryPoints(value: unknown): value is (typeof VALID_ANALYST_STORY_POINTS)[number] {
  return (
    typeof value === "number" &&
    VALID_ANALYST_STORY_POINTS.includes(value as (typeof VALID_ANALYST_STORY_POINTS)[number])
  );
}

export function normalizeAnalystResponse(result: OpenRouterAnalystResponse): AnalystResult | null {
  const rationale = typeof result.rationale === "string" ? result.rationale.trim() : "";
  if (!isValidStoryPoints(result.storyPoints) || rationale.length === 0) {
    return null;
  }

  return {
    storyPoints: result.storyPoints,
    rationale,
  };
}

function buildUserPrompt(input: AnalystInput): string {
  const descriptionLine = input.taskDescription?.trim() ? `\nDescription: ${input.taskDescription.trim()}` : "";
  const hintsLine = input.affectedPaths.length > 0 ? `\nAffected paths:\n${input.affectedPaths.join("\n")}` : "";
  const filesBlock =
    input.files.length > 0
      ? input.files
          .map((file) => `--- ${file.path} ---\n${file.content}`)
          .join("\n\n")
          .slice(0, MAX_ANALYST_PROMPT_CHARS)
      : "(no file snippets available)";

  return `Task title: ${input.taskTitle.trim()}${descriptionLine}${hintsLine}\n\nFile snippets:\n${filesBlock}`;
}

export async function generateAnalystVote(input: AnalystInput): Promise<AnalystResult | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const aiResult = await completeJson<OpenRouterAnalystResponse>(ANALYST_SYSTEM_PROMPT, buildUserPrompt(input));
  if (!aiResult) {
    return null;
  }

  return normalizeAnalystResponse(aiResult);
}
