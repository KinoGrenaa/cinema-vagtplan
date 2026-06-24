"use client";

import { FormEvent, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import {
  getTomorrowLocalDate,
  localDateTimeToISOString,
} from "@/app/utils/dateTime";
import LeaveRequestsCancelModal from "./components/LeaveRequestsCancelModal";
import LeaveRequestsFilterModal from "./components/LeaveRequestsFilterModal";
import LeaveRequestFormModal from "./components/LeaveRequestFormModal";
import LeaveRequestsHeader from "./components/LeaveRequestsHeader";
import LeaveRequestsListSection from "./components/LeaveRequestsListSection";
import LeaveRequestsSummaryCards from "./components/LeaveRequestsSummaryCards";
import type { LeaveRequest } from "./helpers/leaveRequestTypes";
import { readErrorMessage } from "./helpers/leaveRequestHelpers";
import { useLeaveRequestsData } from "./hooks/useLeaveRequestsData";
import { useLeaveRequestFilters } from "./hooks/useLeaveRequestFilters";

export default function LeaveRequestsPage() {
  const infoDialog = useInfoModal();

  const {
    currentUserId,
    fetchRequests,
    isMasterWithoutOwnCinema,
    requests,
  } = useLeaveRequestsData({
    showError: infoDialog.showError,
  });

  const minDate = getTomorrowLocalDate();

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [reason, setReason] = useState("");

  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const [success, setSuccess] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null,
  );

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

  function resetForm() {
    setStartDate(minDate);
    setEndDate(minDate);
    setReason("");
    setAllDay(false);
    setStartTime("08:00");
    setEndTime("16:00");
  }

  async function createLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccess("");

    if (isMasterWithoutOwnCinema) {
      infoDialog.showError(
        "Egen fraværsansøgning er ikke tilgængelig for MASTER",
        "MASTER-brugere skal oprette og behandle fravær via Fraværsgodkendelse for den aktive biograf.",
      );
      return;
    }

    try {
      const response = await apiFetch("/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          startDate: allDay
            ? localDateTimeToISOString(`${startDate}T00:00`)
            : localDateTimeToISOString(`${startDate}T${startTime}`),
          endDate: allDay
            ? localDateTimeToISOString(`${endDate}T23:59`)
            : localDateTimeToISOString(`${endDate}T${endTime}`),
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Fraværsansøgningen kunne ikke oprettes.",
          ),
        );
      }

      resetForm();
      setShowRequestModal(false);
      setSuccess("Fraværsansøgningen er sendt.");

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Fraværsansøgningen kunne ikke oprettes",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  async function cancelLeaveRequest(requestId: number) {
    setSuccess("");

    try {
      const response = await apiFetch(`/leave-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Fraværsansøgningen kunne ikke annulleres.",
          ),
        );
      }

      setRequestToCancel(null);
      setSuccess("Fraværsansøgningen er annulleret.");
      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Fraværsansøgningen kunne ikke annulleres",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <LeaveRequestsHeader
          activeFilterCount={activeFilterCount}
          isMasterWithoutOwnCinema={isMasterWithoutOwnCinema}
          onOpenRequestModal={() => {
            setSuccess("");
            setShowRequestModal(true);
          }}
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
