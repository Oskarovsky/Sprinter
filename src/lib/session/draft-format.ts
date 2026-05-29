import type { DraftTaskDraft } from "@/lib/ai/types";

function bulletSection(heading: string, items: string[]): string | null {
  const trimmedItems = items.map((item) => item.trim()).filter(Boolean);
  if (trimmedItems.length === 0) {
    return null;
  }

  return `${heading}\n${trimmedItems.map((item) => `- ${item}`).join("\n")}`;
}

export function formatDraftForForm(draft: DraftTaskDraft): { title: string; description: string } {
  const title = draft.title.trim();
  const parts = [draft.description.trim()];

  const acceptanceCriteria = bulletSection("## Acceptance criteria", draft.acceptanceCriteria);
  if (acceptanceCriteria) {
    parts.push(acceptanceCriteria);
  }

  const openQuestions = bulletSection("## Open questions", draft.openQuestions);
  if (openQuestions) {
    parts.push(openQuestions);
  }

  return {
    title,
    description: parts.filter(Boolean).join("\n\n"),
  };
}
