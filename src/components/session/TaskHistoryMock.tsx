const SAMPLE_TASKS = [
  { title: "OAuth login flow", average: "5.0" },
  { title: "Dashboard empty state", average: "3.0" },
  { title: "Export CSV for reports", average: "8.0" },
] as const;

export default function TaskHistoryMock() {
  return (
    <section
      aria-labelledby="task-history-mock-heading"
      className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6"
    >
      <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
        Sample history — real past tasks coming soon
      </p>
      <h3 id="task-history-mock-heading" className="mt-4 text-sm font-medium text-blue-100/90">
        Recent tasks (sample)
      </h3>
      <ul className="mt-3 space-y-2" aria-label="Sample task history">
        {SAMPLE_TASKS.map((row) => (
          <li
            key={row.title}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span className="text-white">{row.title}</span>
            <span className="text-blue-100/70">Avg {row.average}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
