"use client";

import Link from "next/link";

import DashboardAnalysisMethod from "./components/analysis/DashboardAnalysisMethod";
import AiLearningAnalytics from "./components/ai/AiLearningAnalytics";
import AiOperationsCommandCenter from "./components/ai/AiOperationsCommandCenter";
import AiPatternInsights from "./components/ai/AiPatternInsights";
import AiStaffingHeatmap from "./components/ai/AiStaffingHeatmap";
import DashboardHeader from "./components/layout/DashboardHeader";
import DashboardSectionHeading from "./components/layout/DashboardSectionHeading";
import OperationsStatus from "./components/operations/OperationsStatus";
import DashboardOverviewSections from "./components/overview/DashboardOverviewSections";
import DashboardPriorityActions from "./components/overview/DashboardPriorityActions";
import DashboardSummaryCards from "./components/overview/DashboardSummaryCards";
import DashboardStaffingSections from "./components/staffing/DashboardStaffingSections";
import DashboardConnectivityNotice from "./components/status/DashboardConnectivityNotice";
import DashboardDataCoverage from "./components/status/DashboardDataCoverage";
import DashboardDataStatus from "./components/status/DashboardDataStatus";
import { summarizeDashboardSources } from "./helpers/dashboardSourceHealth";
import { useDashboard } from "./hooks/useDashboard";
import { useDashboardAutoRefresh } from "./hooks/useDashboardAutoRefresh";
import { useDashboardSourceHistory } from "./hooks/useDashboardSourceHistory";

export default function DashboardPage() {
  const {
    loading,
    refreshing,
    hasLoadedDashboard,
    lastUpdatedAt,
    sourceStatus,
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

  const sourceHistory = useDashboardSourceHistory({
    sourceStatus,
    lastUpdatedAt,
    isRefreshing: refreshing,
    hasLoadedDashboard,
    errorMessage,
  });
  const sourceSummary = summarizeDashboardSources(
    sourceStatus,
    sourceHistory,
  );
  const autoRefresh = useDashboardAutoRefresh({
    canRefresh:
      hasLoadedDashboard &&
      Boolean(currentUser) &&
      !needsMasterCinemaSelection,
    isRefreshing: refreshing,
    lastUpdatedAt,
    onRefresh: reloadDashboard,
  });

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
            Driftsoverblikket viser vagter, fravær, vagtbytter og
            filmprogram for en konkret biograf. Som MASTER skal du vælge
            en aktiv biograf først.
          </p>
          <Link
            href="/master"
            className="mt-5 inline-flex rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-950"
          >
            Vælg biograf
          </Link>
        </div>
      </main>
    );
  }

  const showStaffingAi =
    moduleAccess.staffingAi && moduleAccess.schedule;
  const hasAdministrativeAccess =
    currentUser.role === "ADMIN" || currentUser.role === "MASTER";
  const showDashboardContent =
    !errorMessage || hasLoadedDashboard;
  const hasMovieShowings = movies.length > 0;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardHeader
          onRefresh={reloadDashboard}
          isRefreshing={refreshing}
          lastUpdatedAt={lastUpdatedAt}
          autoRefreshEnabled={autoRefresh.autoRefreshEnabled}
          autoRefreshState={autoRefresh.state}
          nextRefreshAt={autoRefresh.nextRefreshAt}
          secondsUntilRefresh={autoRefresh.secondsUntilRefresh}
          sourceSummary={sourceSummary}
          onAutoRefreshChange={autoRefresh.setAutoRefreshEnabled}
        />
        <DashboardConnectivityNotice
          isOnline={autoRefresh.isOnline}
          autoRefreshEnabled={autoRefresh.autoRefreshEnabled}
        />
        {hasLoadedDashboard && (
          <DashboardDataStatus
            sourceStatus={sourceStatus}
            sourceHistory={sourceHistory}
          />
        )}
        {errorMessage && (
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
              {hasLoadedDashboard && (
                <p className="mt-2 text-sm text-red-800 dark:text-red-200">
                  De senest hentede oplysninger vises fortsat nedenfor.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={reloadDashboard}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-red-300 dark:bg-red-500 dark:text-red-950 dark:hover:bg-red-400 dark:focus-visible:ring-red-300 dark:focus-visible:ring-offset-red-950 dark:disabled:bg-red-900 dark:disabled:text-red-300"
            >
              {refreshing ? "Opdaterer..." : "Prøv igen"}
            </button>
          </section>
        )}
        {hasLoadedDashboard && !errorMessage && (
          <DashboardDataCoverage
            sourceStatus={sourceStatus}
            sourceHistory={sourceHistory}
            onRefresh={reloadDashboard}
            isRefreshing={refreshing}
            autoRefreshEnabled={autoRefresh.autoRefreshEnabled}
          />
        )}
        {showDashboardContent && (
          <>
            {showStaffingAi && (
              <OperationsStatus
                liveOperationsStatus={liveOperationsStatus}
                shiftsSourceStatus={sourceStatus.shifts}
                moviesSourceStatus={sourceStatus.movies}
                hasMovieShowings={hasMovieShowings}
              />
            )}
            <DashboardPriorityActions
              openShiftTrades={openShiftTrades}
              pendingLeaveRequests={pendingLeaveRequests}
              staffingWarningsCount={staffingWarnings.length}
              sourceStatus={sourceStatus}
              moduleAccess={moduleAccess}
              hasAdministrativeAccess={hasAdministrativeAccess}
            />
            <DashboardSummaryCards
              todayPlannedHours={todayPlannedHours}
              myRegisteredHours={myRegisteredHours}
              movieCount={movies.length}
              soldSeatsToday={soldSeatsToday}
              seatLoadPercent={seatLoadPercent}
              shiftCount={shifts.length}
              canShowPersonalTime={currentUser.role !== "MASTER"}
              sourceStatus={sourceStatus}
              moduleAccess={moduleAccess}
            />
            <DashboardOverviewSections
              moduleAccess={moduleAccess}
              hasAdministrativeAccess={hasAdministrativeAccess}
            />
            {showStaffingAi && (
              <>
                <DashboardStaffingSections
                  staffingWarnings={staffingWarnings}
                  predictiveStaffing={predictiveStaffing}
                  hasMovieShowings={hasMovieShowings}
                  shiftsSourceStatus={sourceStatus.shifts}
                  moviesSourceStatus={sourceStatus.movies}
                  hasAdministrativeAccess={hasAdministrativeAccess}
                />
                <section aria-labelledby="dashboard-analysis-heading">
                  <DashboardSectionHeading
                    id="dashboard-analysis-heading"
                    eyebrow="Automatisk analyse"
                    title="Automatiske vurderinger"
                    description="Gennemgå beregningsgrundlaget, de udløste regler og dagens vagtbelastning. Hver del viser, når datagrundlaget er gammelt eller utilgængeligt."
                  />
                  <div className="space-y-6">
                    <DashboardAnalysisMethod
                      shiftCount={shifts.length}
                      movieCount={movies.length}
                      shiftsSourceStatus={sourceStatus.shifts}
                      moviesSourceStatus={sourceStatus.movies}
                      hasAdministrativeAccess={hasAdministrativeAccess}
                    />
                    <AiOperationsCommandCenter
                      operationsHealth={operationsHealth}
                      operationalRecommendations={
                        operationalRecommendations
                      }
                      shiftsSourceStatus={sourceStatus.shifts}
                      moviesSourceStatus={sourceStatus.movies}
                      hasAdministrativeAccess={hasAdministrativeAccess}
                    />
                    <AiStaffingHeatmap
                      staffingHeatmap={staffingHeatmap}
                      shiftsSourceStatus={sourceStatus.shifts}
                    />
                    <div className="grid gap-6 2xl:grid-cols-2">
                      <AiLearningAnalytics
                        aiLearningAnalytics={aiLearningAnalytics}
                        shiftsSourceStatus={sourceStatus.shifts}
                        moviesSourceStatus={sourceStatus.movies}
                      />
                      <AiPatternInsights
                        aiPatternInsights={aiPatternInsights}
                        shiftsSourceStatus={sourceStatus.shifts}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
