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
  } = useDashboard();

  if (loading || !currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-300">
          Indlæser...
        </div>
      </main>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Ingen aktiv biograf valgt
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Vælg en biograf for at se
            dashboardet
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
            Dashboardet viser vagter,
            fravær, vagtbytter og
            filmprogram for en konkret
            biograf. Som MASTER skal du
            vælge en aktiv biograf først.
          </p>
          <a
            href="/master"
            className="mt-5 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
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
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardHeader
          firstName={
            currentUser.firstName
          }
        />

        {showStaffingAi && (
          <>
            <AiOperationsCommandCenter
              operationsHealth={
                operationsHealth
              }
              operationalRecommendations={
                operationalRecommendations
              }
            />

            <OperationsStatus
              liveOperationsStatus={
                liveOperationsStatus
              }
            />

            <AiStaffingHeatmap
              staffingHeatmap={
                staffingHeatmap
              }
            />

            <AiLearningAnalytics
              aiLearningAnalytics={
                aiLearningAnalytics
              }
            />
          </>
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
          moduleAccess={
            moduleAccess
          }
        />

        {showStaffingAi && (
          <DashboardStaffingSections
            staffingWarnings={
              staffingWarnings
            }
            predictiveStaffing={
              predictiveStaffing
            }
          />
        )}

        <DashboardOverviewSections
          movieCount={movies.length}
          soldSeatsToday={
            soldSeatsToday
          }
          seatLoadPercent={
            seatLoadPercent
          }
          shiftCount={shifts.length}
          moduleAccess={
            moduleAccess
          }
        />

        {showStaffingAi && (
          <AiPatternInsights
            aiPatternInsights={
              aiPatternInsights
            }
          />
        )}
      </div>
    </main>
  );
}
