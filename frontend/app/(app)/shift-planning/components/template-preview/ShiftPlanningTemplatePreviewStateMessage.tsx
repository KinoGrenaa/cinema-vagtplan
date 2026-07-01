import type { ReactNode } from "react";

type ShiftPlanningTemplatePreviewStateMessageProps = {
  children: ReactNode;
  tone: "inactive" | "missing" | "empty";
};

const messageClasses: Record<
  ShiftPlanningTemplatePreviewStateMessageProps["tone"],
  string
> = {
  inactive:
    "rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300",
  missing:
    "rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200",
  empty:
    "mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export function ShiftPlanningTemplatePreviewStateMessage({
  children,
  tone,
}: ShiftPlanningTemplatePreviewStateMessageProps) {
  return <section className={messageClasses[tone]}>{children}</section>;
}
