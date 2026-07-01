type ShiftPlanningPublishErrorPanelProps = {
  message: string;
};

export function ShiftPlanningPublishErrorPanel({
  message,
}: ShiftPlanningPublishErrorPanelProps) {
  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
      {message}
    </div>
  );
}
