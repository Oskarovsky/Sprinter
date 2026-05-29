import type { DraftResult } from "@/lib/ai/types";

async function readDraftError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export async function fetchDraftsFromNotes(notes: string): Promise<DraftResult> {
  const response = await fetch("/api/ai/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error(await readDraftError(response));
  }

  return (await response.json()) as DraftResult;
}
