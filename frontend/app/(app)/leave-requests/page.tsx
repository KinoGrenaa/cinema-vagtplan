"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar } from "lucide-react";
import BaseModal from "@/app/components/modals/BaseModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import {
  getTomorrowLocalDate,
  localDateTimeToISOString,
} from "@/app/utils/dateTime";
import LeaveRequestsFilterModal from "./components/LeaveRequestsFilterModal";
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
  getPeriodText,
  isRequestVisibleByStatus,
  readErrorMessage,
  requestOverlapsDateFilter,
} from "./helpers/leaveRequestHelpers";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

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

  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  }

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

      <BaseModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Ansøg om fravær"
      >
        <form onSubmit={createLeaveRequest} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Fra dato</label>
              <div className="relative">
                <input
                  ref={startDateInputRef}
                  type="date"
                  min={minDate}
                  className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />

                <button
                  type="button"
                  aria-label="Åbn kalender for fra dato"
                  onClick={() => openDatePicker(startDateInputRef.current)}
                  className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Calendar size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Til dato</label>
              <div className="relative">
                <input
                  ref={endDateInputRef}
                  type="date"
                  min={minDate}
                  className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />

                <button
                  type="button"
                  aria-label="Åbn kalender for til dato"
                  onClick={() => openDatePicker(endDateInputRef.current)}
                  className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Calendar size={18} />
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
            />
            Hele dagen
          </label>

          {!allDay && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Fra tidspunkt</label>
                <input
                  type="time"
                  className={inputClass}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Til tidspunkt</label>
                <input
                  type="time"
                  className={inputClass}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Årsag</label>
            <input
              className={inputClass}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Valgfrit"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Annullér
            </button>

            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Send ansøgning
            </button>
          </div>
        </form>
      </BaseModal>

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

      <BaseModal
        open={Boolean(requestToCancel)}
        onClose={() => setRequestToCancel(null)}
        title="Annullér fraværsansøgning"
      >
        {requestToCancel && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Du er ved at annullere denne fraværsansøgning:
            </p>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="font-semibold">
                {getPeriodText(requestToCancel)}
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Årsag: {requestToCancel.reason || "-"}
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Er du sikker?
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRequestToCancel(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Fortryd
              </button>

              <button
                type="button"
                onClick={() => cancelLeaveRequest(requestToCancel.id)}
                className="rounded-xl bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
              >
                Annullér ansøgning
              </button>
            </div>
          </div>
        )}
      </BaseModal>

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
