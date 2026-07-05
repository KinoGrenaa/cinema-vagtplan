type ShiftPlanningIssueActionSummaryProps = {
  hints: string[];
  intro?: string;
  title?: string;
};

export function ShiftPlanningIssueActionSummary({
  hints,
  intro = "Start med disse rettelser, og kontrollér forslaget igen bagefter.",
  title = "Næste handlinger",
}: ShiftPlanningIssueActionSummaryProps) {
  if (hints.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-xs opacity-85">{intro}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ol>
    </div>
  );
}
