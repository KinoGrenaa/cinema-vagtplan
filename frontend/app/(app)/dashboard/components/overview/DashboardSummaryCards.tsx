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
  "rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";
const labelClass =
  "text-sm text-gray-600 dark:text-gray-300";
const valueClass =
  "mt-2 text-3xl font-bold text-gray-950 dark:text-white";

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
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {moduleAccess.schedule && (
        <div className={cardClass}>
          <div className={labelClass}>
            Planlagte timer i dag
          </div>
          <div className={valueClass}>
            {formatHours(
              todayPlannedHours,
            )}
          </div>
        </div>
      )}

      {moduleAccess.timeTracking && (
        <div className={cardClass}>
          <div className={labelClass}>
            Mine registrerede timer
          </div>
          <div className={valueClass}>
            {formatHours(
              myRegisteredHours,
            )}
          </div>
        </div>
      )}

      {moduleAccess.shiftTrades && (
        <div className={cardClass}>
          <div className={labelClass}>
            Åbne vagtbytter
          </div>
          <div className={valueClass}>
            {openShiftTrades}
          </div>
        </div>
      )}

      {moduleAccess.leave && (
        <div className={cardClass}>
          <div className={labelClass}>
            Afventer fridage
          </div>
          <div className={valueClass}>
            {pendingLeaveRequests}
          </div>
        </div>
      )}
    </section>
  );
}
