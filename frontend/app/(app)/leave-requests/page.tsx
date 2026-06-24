"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
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
import {
  DEFAULT_STATUS_FILTERS,
  type LeaveRequest,
  type LeaveStatusFilters,
} from "./helpers/leaveRequestTypes";
import {
  countLeaveStatuses,
  getActiveFilterCount,
  getFilterSummary,
  getGroupKey,
  isRequestVisibleByStatus,
  readErrorMessage,
  requestOverlapsDateFilter,
} from "./helpers/leaveRequestHelpers";

export default function LeaveRequestsPage() {
  const infoDialog = useInfoModal();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isMasterWithoutOwnCinema, setIsMasterWithoutOwnCinema] =
    useState(false);

  const minDate = getTomorrowLocalDate();

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [reason, setReason] = useState("");

  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const [success, setSuccess] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null,
  );

  const [statusFilters, setStatusFilters] = useState<LeaveStatusFilters>(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState<LeaveStatusFilters>(DEFAULT_STATUS_FILTERS);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [draftFilterStartDate, setDraftFilterStartDate] = useState("");
  const [draftFilterEndDate, setDraftFilterEndDate] = useState("");

  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);

  const fetchRequests = useCallback(
    async (showError = true) => {
      if (isMasterWithoutOwnCinema) {
        setRequests([]);
        return;
      }

      try {
        const response = await apiFetch("/leave-requests");

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Fraværsansøgninger kunne ikke hentes.",
            ),
          );
        }

        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        setRequests([]);

        if (showError) {
          infoDialog.showError(
            "Fraværsansøgninger kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl ved hentning af fraværsansøgninger.",
          );
        }
      }
    },
    [isMasterWithoutOwnCinema],
  );

  useRealtimeCore({
    onLeaveRequestUpdated: () => fetchRequests(false),
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const masterWithoutOwnCinema =
          parsedUser.role === "MASTER" && !parsedUser.cinemaId;

        setCurrentUserId(parsedUser.id ?? parsedUser.sub ?? null);
        setIsMasterWithoutOwnCinema(masterWithoutOwnCinema);

        if (masterWithoutOwnCinema) {
          setRequests([]);
          return;
        }
      } catch {
        setCurrentUserId(null);
        setIsMasterWithoutOwnCinema(false);
      }
    }

    fetchRequests();
  }, [fetchRequests]);

  const visibleRequests = useMemo(() => {
    return requests.filter(
      (request) =>
        isRequestVisibleByStatus(request, statusFilters) &&
        requestOverlapsDateFilter(request, filterStartDate, filterEndDate),
    );
  }, [filterEndDate, filterStartDate, requests, statusFilters]);

  const statusCounts = useMemo(() => countLeaveStatuses(requests), [requests]);

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(statusFilters, filterStartDate, filterEndDate),
    [filterEndDate, filterStartDate, statusFilters],
  );

  const filterSummary = useMemo(
    () => getFilterSummary(statusFilters, filterStartDate, filterEndDate),
    [filterEndDate, filterStartDate, statusFilters],
  );

  const groupedRequests = useMemo(() => {
    const groups = new Map<string, LeaveRequest[]>();

    for (const request of visibleRequests) {
      const key = getGroupKey(request);
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, request]);
    }

    return Array.from(groups.entries())
      .map(([key, groupRequests]) => ({
        key,
        requests: groupRequests.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
      }))
      .sort(
        (a, b) =>
          new Date(a.requests[0].startDate).getTime() -
          new Date(b.requests[0].startDate).getTime(),
      );
  }, [visibleRequests]);

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setDraftFilterStartDate(filterStartDate);
    setDraftFilterEndDate(filterEndDate);
    setShowFilterModal(true);
  }

  function closeFilterModal() {
    setShowFilterModal(false);
  }

  function updateDraftStatusFilter(
    key: keyof LeaveStatusFilters,
    checked: boolean,
  ) {
    setDraftStatusFilters((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function applyFilter() {
    setStatusFilters(draftStatusFilters);
    setFilterStartDate(draftFilterStartDate);
    setFilterEndDate(draftFilterEndDate);
    setExpandedGroupKeys([]);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setDraftFilterStartDate("");
    setDraftFilterEndDate("");
    setFilterStartDate("");
    setFilterEndDate("");
    setExpandedGroupKeys([]);
    setShowFilterModal(false);
  }

  function showPendingOnly() {
    setStatusFilters({
      pending: true,
      approved: false,
      rejected: false,
      cancelled: false,
    });
    setFilterStartDate("");
    setFilterEndDate("");
    setExpandedGroupKeys([]);
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  }

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
