type PublicationPreviewMetricVariant = "neutral" | "warning" | "success";

type ShiftPlanningPublicationPreviewMetricCardProps = {
  label: string;
  value: number | string;
  variant?: PublicationPreviewMetricVariant;
};

export function ShiftPlanningPublicationPreviewMetricCard({
  label,
  value,
  variant = "neutral",
}: ShiftPlanningPublicationPreviewMetricCardProps) {
  const numericValue = Number(value);
  const shouldHighlightProblem = !Number.isFinite(numericValue) || numericValue > 0;
  const classes =
    variant === "warning" && shouldHighlightProblem
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
        : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-xl border px-3 py-2 ${classes}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
