export default function AnalystPendingIndicator() {
  return (
    <div
      className="mt-4 flex items-center gap-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-3"
      aria-live="polite"
      aria-label="Sprinter Analyst is working"
    >
      <span
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-100"
        aria-hidden
      />
      <p className="text-sm text-cyan-50/90">Sprinter Analyst is reviewing the repository…</p>
    </div>
  );
}
