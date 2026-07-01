type ShiftPlanningDraftValidationMetricCardProps = {
  label: string;
  value: number | string;
  variant?: "neutral" | "warning" | "error" | "success";
};

export function ShiftPlanningDraftValidationMetricCard({
  label,
  value,
  variant = "neutral",
}: ShiftPlanningDraftValidationMetricCardProps) {
  const numericValue = Number(value);
  const shouldHighlightProblem =
    !Number.isFinite(numericValue) || numericValue > 0;

  const classes =
    variant === "error" && shouldHighlightProblem
      ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      : variant === "warning" && shouldHighlightProblem
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
        : variant === "success"
          ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
          : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
