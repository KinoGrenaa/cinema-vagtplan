import Link from "next/link";

import { formatHours } from "../../helpers/dashboardHelpers";

type DashboardSummaryCardsProps = {
  todayPlannedHours: number;
  myRegisteredHours: number;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
  };
};

const cardClass =
  "group rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";
const labelClass = "text-sm text-gray-600 dark:text-gray-300";
const valueClass = "mt-2 text-3xl font-bold text-gray-950 dark:text-white";
const actionClass =
  "mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:gap-2 dark:text-blue-300";

export default function DashboardSummaryCards({
  todayPlannedHours,
  myRegisteredHours,
  moduleAccess,
}: DashboardSummaryCardsProps) {
  if (!moduleAccess.schedule && !moduleAccess.timeTracking) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-summary-heading">
      <div className="mb-3">
        <h2
          id="dashboard-summary-heading"
          className="text-xl font-bold text-gray-950 dark:text-white"
        >
          Nøgletal
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Dagens plan og dine registrerede timer.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {moduleAccess.schedule && (
          <Link href="/schedule" className={cardClass}>
            <div className={labelClass}>Planlagte timer i dag</div>
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
          <Link href="/my-time" className={cardClass}>
            <div className={labelClass}>Mine registrerede timer</div>
            <div className={valueClass}>
              {formatHours(myRegisteredHours)}
            </div>
            <div className={actionClass}>
              Se tidsregistreringer
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
