"use client";

import AiStaffingHeatmap from "../../components/dashboard/AiStaffingHeatmap";
import AiLearningAnalytics from "../../components/dashboard/AiLearningAnalytics";
import AiPatternInsights from "../../components/dashboard/AiPatternInsights";
import AiOperationsCommandCenter from "../../components/dashboard/AiOperationsCommandCenter";
import OperationsStatus from "../../components/dashboard/OperationsStatus";
import { useDashboard } from "../../hooks/useDashboard";
import DashboardHeader from "./components/DashboardHeader";
import DashboardOverviewSections from "./components/DashboardOverviewSections";
import DashboardStaffingSections from "./components/DashboardStaffingSections";
import DashboardSummaryCards from "./components/DashboardSummaryCards";

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
        <DashboardHeader firstName={currentUser.firstName} />

        <AiOperationsCommandCenter
          operationsHealth={operationsHealth}
          operationalRecommendations={operationalRecommendations}
        />

        <OperationsStatus liveOperationsStatus={liveOperationsStatus} />

        <AiStaffingHeatmap staffingHeatmap={staffingHeatmap} />

        <AiLearningAnalytics aiLearningAnalytics={aiLearningAnalytics} />

        <DashboardSummaryCards
          todayPlannedHours={todayPlannedHours}
          myRegisteredHours={myRegisteredHours}
          openShiftTrades={openShiftTrades}
          pendingLeaveRequests={pendingLeaveRequests}
        />

        <DashboardStaffingSections
          staffingWarnings={staffingWarnings}
          predictiveStaffing={predictiveStaffing}
        />

        <DashboardOverviewSections
          movieCount={movies.length}
          soldSeatsToday={soldSeatsToday}
          seatLoadPercent={seatLoadPercent}
          shiftCount={shifts.length}
        />

        <AiPatternInsights aiPatternInsights={aiPatternInsights} />
      </div>
    </main>
  );
}
