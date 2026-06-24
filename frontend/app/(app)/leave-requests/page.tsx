"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import LeaveRequestsCancelModal from "./components/LeaveRequestsCancelModal";
import LeaveRequestsFilterModal from "./components/LeaveRequestsFilterModal";
import LeaveRequestFormModal from "./components/LeaveRequestFormModal";
import LeaveRequestsHeader from "./components/LeaveRequestsHeader";
import LeaveRequestsListSection from "./components/LeaveRequestsListSection";
import LeaveRequestsSummaryCards from "./components/LeaveRequestsSummaryCards";
import { useLeaveRequestCancel } from "./hooks/useLeaveRequestCancel";
import { useLeaveRequestFilters } from "./hooks/useLeaveRequestFilters";
import { useLeaveRequestForm } from "./hooks/useLeaveRequestForm";
import { useLeaveRequestsData } from "./hooks/useLeaveRequestsData";

export default function LeaveRequestsPage() {
  const infoDialog = useInfoModal();

  const { currentUserId, fetchRequests, isMasterWithoutOwnCinema, requests } =
    useLeaveRequestsData({
      showError: (title, description) =>
        infoDialog.showError(title, description ?? ""),
    });

  const {
    allDay,
    endDate,
    endTime,
    minDate,
    reason,
    showRequestModal,
    startDate,
    startTime,
    success,
    createLeaveRequest,
    openRequestModal,
    setAllDay,
    setEndDate,
    setEndTime,
    setReason,
    setShowRequestModal,
    setStartDate,
    setStartTime,
    setSuccess,
  } = useLeaveRequestForm({
    fetchRequests,
    isMasterWithoutOwnCinema,
    showError: (title, description) =>
      infoDialog.showError(title, description ?? ""),
  });

  const { cancelLeaveRequest, requestToCancel, setRequestToCancel } =
    useLeaveRequestCancel({
      fetchRequests,
      setSuccess,
      showError: (title, description) =>
        infoDialog.showError(title, description ?? ""),
    });

  const {
    activeFilterCount,
    draftFilterEndDate,
    draftFilterStartDate,
    draftStatusFilters,
    expandedGroupKeys,
    filterSummary,
    groupedRequests,
    showFilterModal,
    statusCounts,
    visibleRequests,
    applyFilter,
    closeFilterModal,
    openFilterModal,
    resetFilter,
    showPendingOnly,
    toggleGroup,
    updateDraftStatusFilter,
    setDraftFilterEndDate,
    setDraftFilterStartDate,
  } = useLeaveRequestFilters(requests);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <LeaveRequestsHeader
          activeFilterCount={activeFilterCount}
          isMasterWithoutOwnCinema={isMasterWithoutOwnCinema}
          onOpenRequestModal={openRequestModal}
          onOpenFilterModal={openFilterModal}
        />

        {success && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        {isMasterWithoutOwnCinema && (
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
            <h2 className="text-lg font-semibold">
              Denne side er til egne fraværsansøgninger
            </h2>
            <p className="mt-2 text-sm">
              MASTER-brugere skal oprette og behandle fravær via
              Fraværsgodkendelse for den aktive biograf.
            </p>
          </div>
        )}

        <LeaveRequestsSummaryCards
          statusCounts={statusCounts}
          onShowPendingOnly={showPendingOnly}
        />

        <LeaveRequestsListSection
          currentUserId={currentUserId}
          expandedGroupKeys={expandedGroupKeys}
          filterSummary={filterSummary}
          groupedRequests={groupedRequests}
          totalRequestCount={requests.length}
          visibleRequestCount={visibleRequests.length}
          onSelectCancelRequest={setRequestToCancel}
          onToggleGroup={toggleGroup}
        />
      </div>

      <LeaveRequestFormModal
        allDay={allDay}
        endDate={endDate}
        endTime={endTime}
        minDate={minDate}
        open={showRequestModal}
        reason={reason}
        startDate={startDate}
        startTime={startTime}
        onClose={() => setShowRequestModal(false)}
        onSetAllDay={setAllDay}
        onSetEndDate={setEndDate}
        onSetEndTime={setEndTime}
        onSetReason={setReason}
        onSetStartDate={setStartDate}
        onSetStartTime={setStartTime}
        onSubmit={createLeaveRequest}
      />

      <LeaveRequestsFilterModal
        activeFilterCount={activeFilterCount}
        draftFilterEndDate={draftFilterEndDate}
        draftFilterStartDate={draftFilterStartDate}
        draftStatusFilters={draftStatusFilters}
        open={showFilterModal}
        onApply={applyFilter}
        onClose={closeFilterModal}
        onReset={resetFilter}
        onSetDraftFilterEndDate={setDraftFilterEndDate}
        onSetDraftFilterStartDate={setDraftFilterStartDate}
        onUpdateDraftStatusFilter={updateDraftStatusFilter}
      />

      <LeaveRequestsCancelModal
        requestToCancel={requestToCancel}
        onClose={() => setRequestToCancel(null)}
        onConfirm={cancelLeaveRequest}
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
  );
}
