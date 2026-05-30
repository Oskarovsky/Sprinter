interface Props {
  storyPoints: number;
  rationale: string;
}

export default function AnalystReferenceCard({ storyPoints, rationale }: Props) {
  return (
    <div
      className="mt-4 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-3"
      aria-label="Sprinter Analyst reference vote"
    >
      <h4 className="text-sm font-semibold text-cyan-100">Sprinter Analyst (reference)</h4>
      <p className="mt-2 text-2xl font-bold text-white">{storyPoints}</p>
      <p className="mt-2 text-sm leading-relaxed text-cyan-50/90">{rationale}</p>
      <p className="mt-2 text-xs text-cyan-100/60">Excluded from team average — reference only.</p>
    </div>
  );
}
