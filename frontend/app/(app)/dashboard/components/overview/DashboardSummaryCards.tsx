import Link from "next/link";

import { formatHours } from "../../helpers/dashboardHelpers";

type DashboardSummaryCardsProps = {
  todayPlannedHours: number;
  myRegisteredHours: number;
  canShowPersonalTime: boolean;
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
  canShowPersonalTime,
  moduleAccess,
}: DashboardSummaryCardsProps) {
  const showSchedule = moduleAccess.schedule;
  const showPersonalTime =
    moduleAccess.timeTracking && canShowPersonalTime;

  if (!showSchedule && !showPersonalTime) {
    return null;
  }

  const description =
    showSchedule && showPersonalTime
      ? "Dagens plan og dine afsluttede tidsregistreringer."
      : showSchedule
        ? "Dagens planlagte arbejdstid i biografen."
        : "Dine afsluttede tidsregistreringer i dag.";
  const gridClass =
    showSchedule && showPersonalTime
      ? "grid grid-cols-1 gap-6 md:grid-cols-2"
      : "grid grid-cols-1 gap-6";

  return (
    <section aria-labelledby="dashboard-summary-heading">
      <div className="mb-3">
        <h2
          id="dashboard-summary-heading"
          className="text-xl font-bold text-gray-950 dark:text-white"
        >
          Dagens nøgletal
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
      <div className={gridClass}>
        {showSchedule && (
          <Link href="/schedule" className={cardClass}>
            <div className={labelClass}>Planlagte arbejdstimer i dag</div>
            <div className={valueClass}>
              {formatHours(todayPlannedHours)}
            </div>
            <div className={actionClass}>
              Åbn vagtplan
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        )}
        {showPersonalTime && (
          <Link href="/my-time" className={cardClass}>
            <div className={labelClass}>Mine afsluttede timer i dag</div>
            <div className={valueClass}>
              {formatHours(myRegisteredHours)}
            </div>
            <div className={actionClass}>
              Se mine timer
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
