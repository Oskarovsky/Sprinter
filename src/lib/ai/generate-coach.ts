import { isAiConfigured } from "./config";
import { fallbackCoachPrompts } from "./fallback/coach";
import { completeJson } from "./openrouter";
import type { CoachInput, CoachResult, OpenRouterCoachResponse } from "./types";

const COACH_SYSTEM_PROMPT = `You help agile teams discuss divergent story-point estimates.
Respond with JSON only: { "summary": string, "questions": string[] }.
Provide 3 to 5 discussion questions. Never recommend a final story-point value.
Reference the task and vote distribution in your output. Use the same language as the task title.`;

function normalizeCoachResult(result: OpenRouterCoachResponse): CoachResult | null {
  const summary = typeof result.summary === "string" ? result.summary.trim() : "";
  const questions = Array.isArray(result.questions)
    ? result.questions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!summary || questions.length < 3) {
    return null;
  }

  return {
    source: "ai",
    summary,
    questions: questions.slice(0, 5),
  };
}

export async function generateCoachPrompts(input: CoachInput): Promise<CoachResult> {
  if (!isAiConfigured()) {
    return fallbackCoachPrompts(input);
  }

  const descriptionLine = input.taskDescription?.trim() ? `\nDescription: ${input.taskDescription.trim()}` : "";
  const votesLine = `Votes: ${input.votes.join(", ")} (min ${Math.min(...input.votes)}, max ${Math.max(...input.votes)})`;

  const aiResult = await completeJson<OpenRouterCoachResponse>(
    COACH_SYSTEM_PROMPT,
    `Task title: ${input.taskTitle.trim()}${descriptionLine}\n${votesLine}`,
  );

  if (!aiResult) {
    return fallbackCoachPrompts(input);
  }

  const normalized = normalizeCoachResult(aiResult);
  if (!normalized) {
    return fallbackCoachPrompts(input);
  }

  return normalized;
}
