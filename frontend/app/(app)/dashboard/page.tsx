"use client";

import AiStaffingHeatmap from "../../components/dashboard/AiStaffingHeatmap";
import AiLearningAnalytics from "../../components/dashboard/AiLearningAnalytics";
import AiPatternInsights from "../../components/dashboard/AiPatternInsights";
import AiOperationsCommandCenter from "../../components/dashboard/AiOperationsCommandCenter";
import OperationsStatus from "../../components/dashboard/OperationsStatus";
import { useDashboard } from "../../hooks/useDashboard";

function formatHours(value: number) {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const {
    loading,
    currentUser,
    shifts,
    movies,

    todayPlannedHours,
    myRegisteredHours,
    pendingLeaveRequests,
    openShiftTrades,
    soldSeatsToday,
    seatLoadPercent,

    staffingWarnings,
    operationsHealth,
    operationalRecommendations,

    staffingHeatmap,
    liveOperationsStatus,
    predictiveStaffing,

    aiLearningAnalytics,
    aiPatternInsights,
  } = useDashboard();

  if (loading || !currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-300">Indlæser...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">
            Velkommen, {currentUser.firstName}
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Her er dagens overblik for biografen.
          </p>
        </section>

        <AiOperationsCommandCenter
          operationsHealth={operationsHealth}
          operationalRecommendations={operationalRecommendations}
        />

        <OperationsStatus liveOperationsStatus={liveOperationsStatus} />

        <AiStaffingHeatmap staffingHeatmap={staffingHeatmap} />

        <AiLearningAnalytics aiLearningAnalytics={aiLearningAnalytics} />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Planlagte timer i dag
            </div>

            <div className="mt-2 text-3xl font-bold">
              {formatHours(todayPlannedHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mine registrerede timer
            </div>

            <div className="mt-2 text-3xl font-bold">
              {formatHours(myRegisteredHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Åbne vagtbytter
            </div>

            <div className="mt-2 text-3xl font-bold">{openShiftTrades}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afventer fridage
            </div>

            <div className="mt-2 text-3xl font-bold">
              {pendingLeaveRequests}
            </div>
          </div>
        </section>

        {staffingWarnings.length > 0 && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-orange-900 dark:bg-orange-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">⚠️</div>

              <div>
                <h2 className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  Staffing Intelligence
                </h2>

                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Systemet har fundet potentielle bemandingsproblemer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-orange-200 bg-white p-4 text-sm text-orange-700 dark:border-orange-900 dark:bg-gray-900 dark:text-orange-300"
                >
                  {warning}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm dark:border-purple-900 dark:bg-purple-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">📈</div>

            <div>
              <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                Predictive Staffing
              </h2>

              <p className="text-sm text-purple-600 dark:text-purple-400">
                Systemet forudsiger fremtidig staffing pressure.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(predictiveStaffing.length > 0
              ? predictiveStaffing
              : ["Ingen predictive staffing alerts lige nu."]
            ).map((prediction, index) => (
              <div
                key={index}
                className="rounded-xl border border-purple-200 bg-white p-4 text-sm text-purple-700 dark:border-purple-900 dark:bg-gray-900 dark:text-purple-300"
              >
                {prediction}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold">Biograf i dag</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Forestillinger
                </span>
                <span className="font-medium">{movies.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Solgte billetter
                </span>
                <span className="font-medium">{soldSeatsToday}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Belægning
                </span>
                <span className="font-medium">{seatLoadPercent}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Vagter i dag
                </span>
                <span className="font-medium">{shifts.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold">Genveje</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href="/schedule"
                className="rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
              >
                Vagtplan
              </a>

              <a
                href="/time-entries"
                className="rounded-xl bg-green-600 px-4 py-3 text-center font-medium text-white hover:bg-green-700"
              >
                Tidsregistrering
              </a>

              <a
                href="/shift-trades"
                className="rounded-xl bg-purple-600 px-4 py-3 text-center font-medium text-white hover:bg-purple-700"
              >
                Vagtbytte
              </a>

              <a
                href="/payroll"
                className="rounded-xl bg-gray-800 px-4 py-3 text-center font-medium text-white hover:bg-gray-900"
              >
                Payroll
              </a>
            </div>
          </div>
        </section>

        <AiPatternInsights aiPatternInsights={aiPatternInsights} />
      </div>
    </main>
  );
}
