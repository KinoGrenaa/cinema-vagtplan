"use client";

import AiLearningAnalytics from "./components/ai/AiLearningAnalytics";
import AiOperationsCommandCenter from "./components/ai/AiOperationsCommandCenter";
import AiPatternInsights from "./components/ai/AiPatternInsights";
import AiStaffingHeatmap from "./components/ai/AiStaffingHeatmap";
import DashboardHeader from "./components/layout/DashboardHeader";
import OperationsStatus from "./components/operations/OperationsStatus";
import DashboardOverviewSections from "./components/overview/DashboardOverviewSections";
import DashboardSummaryCards from "./components/overview/DashboardSummaryCards";
import DashboardStaffingSections from "./components/staffing/DashboardStaffingSections";
import { useDashboard } from "./hooks/useDashboard";

export default function DashboardPage() {
  const {
    loading,
    currentUser,
    needsMasterCinemaSelection,
    moduleAccess,
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
    errorMessage,
    reloadDashboard,
  } = useDashboard();

  if (loading || !currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          Indlæser driftsoverblik...
        </div>
      </main>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm transition-colors dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Ingen aktiv biograf valgt
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Vælg en biograf for at se driftsoverblikket
          </h1>

          <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
            Driftsoverblikket viser vagter, fravær,
            vagtbytter og filmprogram for en konkret
            biograf. Som MASTER skal du vælge en
            aktiv biograf først.
          </p>

          <a
            href="/master"
            className="mt-5 inline-flex rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-950"
          >
            Vælg biograf
          </a>
        </div>
      </main>
    );
  }

  const showStaffingAi =
    moduleAccess.staffingAi &&
    moduleAccess.schedule;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardHeader />

        {errorMessage ? (
          <section
            role="alert"
            className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-100 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-lg font-bold">
                Driftsoverblikket kunne ikke opdateres
              </h2>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={reloadDashboard}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-500 dark:text-red-950 dark:hover:bg-red-400 dark:focus-visible:ring-red-300 dark:focus-visible:ring-offset-red-950"
            >
              Prøv igen
            </button>
          </section>
        ) : (
          <>
            {showStaffingAi && (
              <OperationsStatus
                liveOperationsStatus={
                  liveOperationsStatus
                }
              />
            )}

            <DashboardSummaryCards
              todayPlannedHours={
                todayPlannedHours
              }
              myRegisteredHours={
                myRegisteredHours
              }
              openShiftTrades={
                openShiftTrades
              }
              pendingLeaveRequests={
                pendingLeaveRequests
              }
              moduleAccess={moduleAccess}
            />

            <DashboardOverviewSections
              movieCount={movies.length}
              soldSeatsToday={
                soldSeatsToday
              }
              seatLoadPercent={
                seatLoadPercent
              }
              shiftCount={shifts.length}
              movieDataAvailable={
                operationsHealth.movieDataAvailable
              }
              moduleAccess={moduleAccess}
            />

            {showStaffingAi && (
              <>
                <DashboardStaffingSections
                  staffingWarnings={
                    staffingWarnings
                  }
                  predictiveStaffing={
                    predictiveStaffing
                  }
                  movieDataAvailable={
                    operationsHealth.movieDataAvailable
                  }
                />

                <AiOperationsCommandCenter
                  operationsHealth={operationsHealth}
                  operationalRecommendations={
                    operationalRecommendations
                  }
                />

                <AiStaffingHeatmap
                  staffingHeatmap={staffingHeatmap}
                />

                <div className="grid gap-6 2xl:grid-cols-2">
                  <AiLearningAnalytics
                    aiLearningAnalytics={
                      aiLearningAnalytics
                    }
                  />
                  <AiPatternInsights
                    aiPatternInsights={
                      aiPatternInsights
                    }
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
