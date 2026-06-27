"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import LeaveRequestsCancelModal from "./components/LeaveRequestsCancelModal";
import LeaveRequestsFilterModal from "./components/LeaveRequestsFilterModal";
import LeaveRequestFormModal from "./components/LeaveRequestFormModal";
import LeaveRequestsHeader from "./components/LeaveRequestsHeader";
import LeaveRequestsListSection from "./components/LeaveRequestsListSection";
import LeaveRequestsMasterNotice from "./components/LeaveRequestsMasterNotice";
import LeaveRequestsSuccessMessage from "./components/LeaveRequestsSuccessMessage";
import LeaveRequestsSummaryCards from "./components/LeaveRequestsSummaryCards";
import { useLeaveRequestsPage } from "./hooks/useLeaveRequestsPage";

export default function LeaveRequestsPage() {
  const {
    cancel,
    currentUserId,
    employeeSelection,
    filters,
    form,
    infoDialog,
    isMasterWithoutOwnCinema,
    requests,
  } = useLeaveRequestsPage();

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <LeaveRequestsHeader
          activeFilterCount={filters.activeFilterCount}
          isMasterWithoutOwnCinema={isMasterWithoutOwnCinema}
          onOpenRequestModal={form.openRequestModal}
          onOpenFilterModal={filters.openFilterModal}
        />

        <LeaveRequestsSuccessMessage success={form.success} />

        {isMasterWithoutOwnCinema && <LeaveRequestsMasterNotice />}

        <LeaveRequestsSummaryCards
          statusCounts={filters.statusCounts}
          onShowPendingOnly={filters.showPendingOnly}
        />

        <LeaveRequestsListSection
          currentUserId={currentUserId}
          expandedGroupKeys={filters.expandedGroupKeys}
          filterSummary={filters.filterSummary}
          groupedRequests={filters.groupedRequests}
          totalRequestCount={requests.length}
          visibleRequestCount={filters.visibleRequests.length}
          onSelectCancelRequest={cancel.setRequestToCancel}
          onToggleGroup={filters.toggleGroup}
        />
      </div>

      <LeaveRequestFormModal
        allDay={form.allDay}
        canCreateForEmployees={employeeSelection.canCreateForEmployees}
        employeeOptions={employeeSelection.employeeOptions}
        endDate={form.endDate}
        endTime={form.endTime}
        loadingEmployeeOptions={employeeSelection.loadingEmployeeOptions}
        minDate={form.minDate}
        open={form.showRequestModal}
        reason={form.reason}
        selectedUserId={form.selectedUserId}
        startDate={form.startDate}
        startTime={form.startTime}
        onClose={() => form.setShowRequestModal(false)}
        onSetAllDay={form.setAllDay}
        onSetEndDate={form.setEndDate}
        onSetEndTime={form.setEndTime}
        onSetReason={form.setReason}
        onSetSelectedUserId={form.setSelectedUserId}
        onSetStartDate={form.setStartDate}
        onSetStartTime={form.setStartTime}
        onSubmit={form.createLeaveRequest}
      />

      <LeaveRequestsFilterModal
        activeFilterCount={filters.activeFilterCount}
        draftFilterEndDate={filters.draftFilterEndDate}
        draftFilterStartDate={filters.draftFilterStartDate}
        draftStatusFilters={filters.draftStatusFilters}
        open={filters.showFilterModal}
        onApply={filters.applyFilter}
        onClose={filters.closeFilterModal}
        onReset={filters.resetFilter}
        onSetDraftFilterEndDate={filters.setDraftFilterEndDate}
        onSetDraftFilterStartDate={filters.setDraftFilterStartDate}
        onUpdateDraftStatusFilter={filters.updateDraftStatusFilter}
      />

      <LeaveRequestsCancelModal
        requestToCancel={cancel.requestToCancel}
        onClose={() => cancel.setRequestToCancel(null)}
        onConfirm={cancel.cancelLeaveRequest}
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
