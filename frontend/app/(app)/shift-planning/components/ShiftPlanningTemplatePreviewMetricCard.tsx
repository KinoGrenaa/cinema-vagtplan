type ShiftPlanningTemplatePreviewMetricCardProps = {
  label: string;
  value: number;
};

export function ShiftPlanningTemplatePreviewMetricCard({
  label,
  value,
}: ShiftPlanningTemplatePreviewMetricCardProps) {
  return (
    <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
      {value}
      <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </span>
  );
}
