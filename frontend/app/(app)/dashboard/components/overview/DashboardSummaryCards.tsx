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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Planlagte timer i dag
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatHours(
              todayPlannedHours,
            )}
          </div>
        </div>
      )}

      {moduleAccess.timeTracking && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mine registrerede timer
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatHours(
              myRegisteredHours,
            )}
          </div>
        </div>
      )}

      {moduleAccess.shiftTrades && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Åbne vagtbytter
          </div>
          <div className="mt-2 text-3xl font-bold">
            {openShiftTrades}
          </div>
        </div>
      )}

      {moduleAccess.leave && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Afventer fridage
          </div>
          <div className="mt-2 text-3xl font-bold">
            {pendingLeaveRequests}
          </div>
        </div>
      )}
    </section>
  );
}
