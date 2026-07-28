import Link from "next/link";

import { formatHours } from "../../helpers/dashboardHelpers";

type DashboardSummaryCardsProps = {
  todayPlannedHours: number;
  myRegisteredHours: number;
  openShiftTrades: number;
  pendingLeaveRequests: number;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
    leave: boolean;
    shiftTrades: boolean;
  };
};

const cardClass =
  "group rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";

const labelClass =
  "text-sm text-gray-600 dark:text-gray-300";

const valueClass =
  "mt-2 text-3xl font-bold text-gray-950 dark:text-white";

const actionClass =
  "mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:gap-2 dark:text-blue-300";

export default function DashboardSummaryCards({
  todayPlannedHours,
  myRegisteredHours,
  openShiftTrades,
  pendingLeaveRequests,
  moduleAccess,
}: DashboardSummaryCardsProps) {
  const hasVisibleCards =
    moduleAccess.schedule ||
    moduleAccess.timeTracking ||
    moduleAccess.shiftTrades ||
    moduleAccess.leave;

  if (!hasVisibleCards) {
    return null;
  }

  return (
    <section
      aria-label="Vigtige nøgletal og genveje"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      {moduleAccess.schedule && (
        <Link
          href="/schedule"
          className={cardClass}
        >
          <div className={labelClass}>
            Planlagte timer i dag
          </div>
          <div className={valueClass}>
            {formatHours(todayPlannedHours)}
          </div>
          <div className={actionClass}>
            Åbn vagtplan
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      )}

      {moduleAccess.timeTracking && (
        <Link
          href="/my-time"
          className={cardClass}
        >
          <div className={labelClass}>
            Mine registrerede timer
          </div>
          <div className={valueClass}>
            {formatHours(myRegisteredHours)}
          </div>
          <div className={actionClass}>
            Se tidsregistreringer
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      )}

      {moduleAccess.shiftTrades && (
        <Link
          href="/shift-trades"
          className={cardClass}
        >
          <div className={labelClass}>
            Åbne vagtbytter
          </div>
          <div className={valueClass}>
            {openShiftTrades}
          </div>
          <div className={actionClass}>
            Se vagtbytter
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      )}

      {moduleAccess.leave && (
        <Link
          href="/leave-requests"
          className={cardClass}
        >
          <div className={labelClass}>
            Afventer fravær
          </div>
          <div className={valueClass}>
            {pendingLeaveRequests}
          </div>
          <div className={actionClass}>
            Se fravær
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      )}
    </section>
  );
}
