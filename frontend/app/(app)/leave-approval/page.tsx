"use client";

import AdminGuard from "@/app/components/AdminGuard";

import InfoModal from "@/app/components/modals/InfoModal";
import LeaveApprovalFilterModal from "./components/modals/LeaveApprovalFilterModal";

import LeaveApprovalHeader from "./components/layout/LeaveApprovalHeader";

import LeaveApprovalRequestsSection from "./components/list/LeaveApprovalRequestsSection";

import LeaveApprovalSummaryCards from "./components/overview/LeaveApprovalSummaryCards";

import { makeDateGroupExpansionKey } from "./helpers/leaveApprovalHelpers";

import { useLeaveApprovalData } from "./hooks/useLeaveApprovalData";
import { useLeaveApprovalFilters } from "./hooks/useLeaveApprovalFilters";

import { useInfoModal } from "@/app/hooks/useInfoModal";

export default function LeaveApprovalPage() {
  const infoDialog = useInfoModal();

  const {
    requests,
    loading,
    statusCounts,
    needsMasterCinemaSelection,
    updateStatus,
  } = useLeaveApprovalData(infoDialog);

  const {
    showFilterModal,
    draftStatusFilters,
    draftStartDateFilter,
    draftEndDateFilter,
    expandedUserIds,
    expandedDateGroupKeys,
    visibleRequests,
    groupedRequests,
    activeFilterCount,
    statusFilterSummary,
    dateFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    setDraftStartDateFilter,
    setDraftEndDateFilter,
    applyFilter,
    resetFilter,
    showOnlyPending,
    toggleUserGroup,
    toggleDateGroup,
  } = useLeaveApprovalFilters(requests);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <LeaveApprovalHeader
            statusFilterSummary={statusFilterSummary}
            dateFilterSummary={dateFilterSummary}
            pendingCount={statusCounts.PENDING}
            activeFilterCount={activeFilterCount}
            onShowOnlyPending={showOnlyPending}
            onOpenFilterModal={openFilterModal}
          />

          {needsMasterCinemaSelection && (
            <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
              <h2 className="text-lg font-semibold">
                Ingen aktiv biograf valgt
              </h2>
              <p className="mt-2 text-sm">
                Vælg en biograf i MASTER-panelet, før du kan se eller behandle
                fravær.
              </p>
            </div>
          )}

          {!needsMasterCinemaSelection && !loading && (
            <LeaveApprovalSummaryCards statusCounts={statusCounts} />
          )}

          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Henter fraværsansøgninger...
            </div>
          )}

          {!needsMasterCinemaSelection && !loading && (
            <LeaveApprovalRequestsSection
              requests={requests}
              visibleRequests={visibleRequests}
              groupedRequests={groupedRequests}
              statusFilterSummary={statusFilterSummary}
              dateFilterSummary={dateFilterSummary}
              expandedUserIds={expandedUserIds}
              isDateGroupExpanded={(userId, dateKey) =>
                expandedDateGroupKeys.includes(
                  makeDateGroupExpansionKey(userId, dateKey),
                )
              }
              onToggleUserGroup={toggleUserGroup}
              onToggleDateGroup={toggleDateGroup}
              onUpdateStatus={updateStatus}
            />
          )}
        </div>

        <LeaveApprovalFilterModal
          open={showFilterModal}
          activeFilterCount={activeFilterCount}
          draftStatusFilters={draftStatusFilters}
          draftStartDateFilter={draftStartDateFilter}
          draftEndDateFilter={draftEndDateFilter}
          onStatusFilterChange={updateDraftStatusFilter}
          onStartDateFilterChange={setDraftStartDateFilter}
          onEndDateFilterChange={setDraftEndDateFilter}
          onApply={applyFilter}
          onReset={resetFilter}
          onClose={closeFilterModal}
        />

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </main>
    </AdminGuard>
  );
}
