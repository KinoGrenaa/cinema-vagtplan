import { getDashboardSourceLabel } from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";

type DashboardSourceBadgeProps = {
  status: DashboardSourceStatus;
  hideWhenFresh?: boolean;
};

const toneClasses = {
  fresh:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  stale:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  unavailable:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  disabled:
    "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
};

export default function DashboardSourceBadge({
  status,
  hideWhenFresh = false,
}: DashboardSourceBadgeProps) {
  if (hideWhenFresh && status.state === "fresh") {
    return null;
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses[status.state]}`}
    >
      {getDashboardSourceLabel(status.state)}
    </span>
  );
}
