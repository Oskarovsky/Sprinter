import { FALLBACK_WARNING_DRAFT, isAiConfigured } from "./config";
import { fallbackDraftFromNotes } from "./fallback/draft";
import { completeJson } from "./openrouter";
import type { DraftInput, DraftResult, DraftTaskDraft, OpenRouterDraftResponse } from "./types";

const DRAFT_SYSTEM_PROMPT = `You generate planning-poker-ready task drafts from raw notes.
Respond with JSON only: { "drafts": [{ "title": string, "description": string, "acceptanceCriteria": string[], "openQuestions": string[] }] }.
Each draft must have a non-empty title. Use the same language as the input notes.`;

function isValidDraft(draft: DraftTaskDraft): boolean {
  return typeof draft.title === "string" && draft.title.trim().length > 0;
}

function normalizeAiDrafts(drafts: DraftTaskDraft[]): DraftTaskDraft[] {
  return drafts.filter(isValidDraft).map((draft) => ({
    title: draft.title.trim(),
    description: typeof draft.description === "string" ? draft.description.trim() : "",
    acceptanceCriteria: Array.isArray(draft.acceptanceCriteria)
      ? draft.acceptanceCriteria.filter((item): item is string => typeof item === "string")
      : [],
    openQuestions: Array.isArray(draft.openQuestions)
      ? draft.openQuestions.filter((item): item is string => typeof item === "string")
      : [],
  }));
}

function buildFallbackResult(notes: string): DraftResult {
  return {
    source: "fallback",
    warning: FALLBACK_WARNING_DRAFT,
    drafts: fallbackDraftFromNotes(notes),
  };
}

export async function generateDraftFromNotes(input: DraftInput): Promise<DraftResult> {
  const notes = input.notes.trim();
  if (!notes) {
    return { source: "fallback", warning: FALLBACK_WARNING_DRAFT, drafts: [] };
  }

  if (!isAiConfigured()) {
    return buildFallbackResult(notes);
  }

  const aiResult = await completeJson<OpenRouterDraftResponse>(DRAFT_SYSTEM_PROMPT, `Raw notes:\n\n${notes}`);

  if (!aiResult || !Array.isArray(aiResult.drafts)) {
    return buildFallbackResult(notes);
  }

  const drafts = normalizeAiDrafts(aiResult.drafts);
  if (drafts.length === 0) {
    return buildFallbackResult(notes);
  }

  return { source: "ai", drafts };
}
