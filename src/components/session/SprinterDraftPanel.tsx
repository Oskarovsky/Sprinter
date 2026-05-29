import React, { useState } from "react";
import type { AiSource, DraftTaskDraft } from "@/lib/ai/types";
import { fetchDraftsFromNotes } from "@/lib/session/draft-client";
import { formatDraftForForm } from "@/lib/session/draft-format";

interface Props {
  onApplyDraft: (fields: { title: string; description: string }) => void;
}

function DraftList({ items, label }: { items: string[]; label: string }) {
  const visible = items.map((item) => item.trim()).filter(Boolean);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-blue-100/60 uppercase">{label}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-blue-100/80">
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function SprinterDraftPanel({ onApplyDraft }: Props) {
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<DraftTaskDraft[] | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);

  const notesTrimmed = notes.trim();
  const canGenerate = notesTrimmed.length > 0 && !isGeneratingDrafts;

  async function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    setIsGeneratingDrafts(true);
    setPanelError(null);
    setDrafts(null);
    setSource(null);
    setWarning(null);

    try {
      const result = await fetchDraftsFromNotes(notesTrimmed);
      setDrafts(result.drafts);
      setSource(result.source);
      setWarning(result.warning ?? null);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Failed to generate drafts");
    } finally {
      setIsGeneratingDrafts(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
      <div>
        <h3 className="text-sm font-medium text-white">Sprinter Draft</h3>
        <p className="mt-1 text-sm text-blue-100/70">
          Paste raw notes to generate planning-poker-ready task proposals. Nothing is shared until you create a task.
        </p>
      </div>

      <label className="block text-sm text-blue-100/90">
        Notes
        <textarea
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          rows={4}
          placeholder="Paste meeting notes, user stories, or backlog items…"
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-blue-100/40"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          void handleGenerate();
        }}
        disabled={!canGenerate}
        className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30 disabled:opacity-50"
      >
        {isGeneratingDrafts ? "Generating…" : "Generate tasks"}
      </button>

      {panelError ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100" role="alert">
          {panelError}
        </p>
      ) : null}

      {source === "fallback" && warning ? (
        <p
          className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-100"
          role="status"
        >
          {warning}
        </p>
      ) : null}

      {drafts && drafts.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-blue-100/80">
            {drafts.length} draft{drafts.length === 1 ? "" : "s"} — pick one to prefill the form below.
          </p>
          {drafts.map((draft, index) => (
            <article
              key={`${draft.title}-${index}`}
              className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <h4 className="font-medium text-white">{draft.title}</h4>
              {draft.description.trim() ? (
                <p className="text-sm whitespace-pre-wrap text-blue-100/80">{draft.description.trim()}</p>
              ) : null}
              <DraftList items={draft.acceptanceCriteria} label="Acceptance criteria" />
              <DraftList items={draft.openQuestions} label="Open questions" />
              <button
                type="button"
                onClick={() => {
                  onApplyDraft(formatDraftForForm(draft));
                }}
                className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500/30"
              >
                Use this task
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {drafts && drafts.length === 0 ? (
        <p className="text-sm text-blue-100/70">No task drafts were generated. Try adding more detail to your notes.</p>
      ) : null}
    </section>
  );
}
