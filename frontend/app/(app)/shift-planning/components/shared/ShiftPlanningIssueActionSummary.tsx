import type { ShiftPlanningIssueActionHint } from "../../helpers/shiftPlanningIssueActionHints";

type ShiftPlanningIssueActionSummaryProps = {
  hints: ShiftPlanningIssueActionHint[];
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
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sky-800 dark:text-sky-200">{intro}</p>
      <ol className="mt-3 space-y-2 pl-5">
        {hints.map((hint, index) => (
          <li key={`${hint.text}-${index}`} className="list-decimal">
            <span>{hint.text}</span>
            {hint.href && (
              <a
                href={hint.href}
                className="ml-2 inline-flex rounded-full border border-sky-300 px-2 py-0.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-100 dark:hover:bg-sky-900"
              >
                {hint.linkLabel ?? "Åbn"}
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
