import type { DraftTaskDraft } from "../types";

function normalizeDraft(title: string, descriptionLines: string[]): DraftTaskDraft {
  const trimmedTitle = title.trim();
  const description = descriptionLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  if (!trimmedTitle) {
    return {
      title: description.slice(0, 80) || "Nowe zadanie",
      description: description.length > 80 ? description : "",
      acceptanceCriteria: [],
      openQuestions: [],
    };
  }

  return {
    title: trimmedTitle,
    description,
    acceptanceCriteria: [],
    openQuestions: [],
  };
}

export function fallbackDraftFromNotes(notes: string): DraftTaskDraft[] {
  const trimmed = notes.trim();
  if (!trimmed) {
    return [];
  }

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [normalizeDraft(trimmed.slice(0, 80), trimmed.length > 80 ? [trimmed] : [])];
  }

  return blocks.map((block) => {
    const lines = block.split("\n").map((line) => line.trim());
    const [firstLine = "", ...rest] = lines;
    return normalizeDraft(firstLine, rest);
  });
}
