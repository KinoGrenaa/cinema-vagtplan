type ControlMetricVariant = "neutral" | "warning" | "success";

type ShiftPlanningDraftControlMetricCardProps = {
  label: string;
  value: number;
  variant?: ControlMetricVariant;
};

function getMetricCardClasses(variant: ControlMetricVariant, value: number) {
  if (variant === "warning" && value > 0) {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
  }

  if (variant === "success") {
    return "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100";
  }

  return "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";
}

export function ShiftPlanningDraftControlMetricCard({
  label,
  value,
  variant = "neutral",
}: ShiftPlanningDraftControlMetricCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 ${getMetricCardClasses(
        variant,
        value,
      )}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
