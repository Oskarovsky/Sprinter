import type { AnalystDiagnosticsPublic, AnalystVotePublic } from "@/lib/repo/types";

interface Props {
  vote: AnalystVotePublic | null;
  pending: boolean;
  diagnostics: AnalystDiagnosticsPublic | null;
}

function AiStatusBadge({ diagnostics }: { diagnostics: AnalystDiagnosticsPublic }) {
  if (diagnostics.status === "skipped") {
    return (
      <span className="rounded-full border border-blue-300/30 bg-blue-500/15 px-2 py-0.5 text-xs text-blue-100">
        Pominięty
      </span>
    );
  }

  if (diagnostics.status === "ready" && diagnostics.sourceFiles.length === 0) {
    return (
      <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-100">
        Bez analizy kodu
      </span>
    );
  }

  if (diagnostics.ai.called && diagnostics.sourceFiles.length > 0) {
    return (
      <span className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-100">
        OpenRouter OK
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-100">
      AI nie wywołane
    </span>
  );
}

function AnalystDiagnosticsDetails({ diagnostics }: { diagnostics: AnalystDiagnosticsPublic }) {
  const { ai, sourceFiles } = diagnostics;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-cyan-50/90">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-cyan-100">Diagnostyka AI</span>
        <AiStatusBadge diagnostics={diagnostics} />
      </div>

      {diagnostics.errorMessage ? (
        <p className="leading-relaxed text-amber-100/90">{diagnostics.errorMessage}</p>
      ) : null}

      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-cyan-100/60">Wywołanie OpenRouter</dt>
          <dd className="mt-0.5 text-cyan-50">
            {ai.called
              ? diagnostics.sourceFiles.length > 0
                ? "Tak — estymata na podstawie kodu"
                : "Tak — ale bez fragmentów kodu (tylko opis zadania)"
              : diagnostics.errorCode === "no_files"
                ? "Nie — brak plików"
                : diagnostics.errorCode === "not_configured"
                  ? "Nie — brak konfiguracji AI"
                  : "Nie"}
          </dd>
        </div>
        {ai.model ? (
          <div>
            <dt className="text-cyan-100/60">Model</dt>
            <dd className="mt-0.5 font-mono text-cyan-50">{ai.model}</dd>
          </div>
        ) : null}
        {ai.totalTokens !== null ? (
          <div className="sm:col-span-2">
            <dt className="text-cyan-100/60">Tokeny</dt>
            <dd className="mt-0.5 font-mono text-cyan-50">
              prompt {ai.promptTokens ?? "—"}, completion {ai.completionTokens ?? "—"}, razem {ai.totalTokens}
            </dd>
          </div>
        ) : null}
      </dl>

      <div>
        <p className="text-cyan-100/60">Pliki użyte w estymacji ({sourceFiles.length})</p>
        {sourceFiles.length > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-cyan-50/95">
            {sourceFiles.map((path) => (
              <li key={path} className="rounded border border-white/5 bg-white/5 px-2 py-1">
                {path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-cyan-50/70">Brak pobranych plików z repozytorium.</p>
        )}
      </div>
    </div>
  );
}

export default function AnalystInsightsSection({ vote, pending, diagnostics }: Props) {
  if (pending && !vote) {
    return (
      <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-3" aria-live="polite">
        <div className="flex items-center gap-3">
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-100"
            aria-hidden
          />
          <p className="text-sm text-cyan-50/90">Sprinter Analyst analizuje repozytorium…</p>
        </div>
      </div>
    );
  }

  if (!vote && !diagnostics) {
    return null;
  }

  return (
    <div className="mt-4 space-y-0">
      {vote ? (
        <div
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-3"
          aria-label="Sprinter Analyst reference vote"
        >
          <h4 className="text-sm font-semibold text-cyan-100">Sprinter Analyst (referencja)</h4>
          <p className="mt-2 text-2xl font-bold text-white">{vote.storyPoints}</p>
          <p className="mt-2 text-sm leading-relaxed text-cyan-50/90">{vote.rationale}</p>
          {diagnostics && diagnostics.sourceFiles.length === 0 ? (
            <p className="mt-2 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100/90">
              Uwaga: ta estymata powstała bez analizy plików z repo (tylko z opisu zadania). Nie traktuj jej jak oceny
              złożoności kodu.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-cyan-100/60">Pominięty w średniej zespołu — tylko referencja.</p>
        </div>
      ) : diagnostics && diagnostics.status !== "ready" ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <h4 className="text-sm font-semibold text-amber-100">Sprinter Analyst</h4>
          <p className="mt-2 text-sm text-amber-50/90">
            {diagnostics.status === "skipped"
              ? "Analyst nie uruchomił estymacji AI dla tego zadania."
              : "Analyst nie zakończył estymacji AI."}
          </p>
        </div>
      ) : null}

      {diagnostics ? <AnalystDiagnosticsDetails diagnostics={diagnostics} /> : null}
    </div>
  );
}
