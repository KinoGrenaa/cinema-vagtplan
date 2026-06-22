"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import BaseModal from "@/app/components/modals/BaseModal";
import FilterModal from "@/app/components/modals/FilterModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import {
  getTomorrowLocalDate,
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
  localDateTimeToISOString,
} from "@/app/utils/dateTime";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveStatusFilters = {
  pending: boolean;
  approved: boolean;
  rejected: boolean;
  cancelled: boolean;
};

type LeaveStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
};

const DEFAULT_STATUS_FILTERS: LeaveStatusFilters = {
  pending: true,
  approved: false,
  rejected: false,
  cancelled: false,
};

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

function getAllDayDateRange(
  request: LeaveRequest,
): LeaveDisplayDateRange | null {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const isLocalAllDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalAllDay) {
    return {
      startDate: formatDateDK(start),
      endDate: formatDateDK(end),
    };
  }

  const isUtcAllDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcAllDay) {
    return {
      startDate: formatUtcDateDK(start),
      endDate: formatUtcDateDK(end),
    };
  }

  return null;
}

function getPeriodText(request: LeaveRequest) {
  const allDayDateRange = getAllDayDateRange(request);

  if (allDayDateRange) {
    return allDayDateRange.startDate === allDayDateRange.endDate
      ? `${allDayDateRange.startDate} · Hele dagen`
      : `${allDayDateRange.startDate} - ${allDayDateRange.endDate} · Hele dagen`;
  }

  const startDate = formatDateDK(request.startDate);
  const endDate = formatDateDK(request.endDate);
  const startClock = formatTimeDK(request.startDate);
  const endClock = formatTimeDK(request.endDate);

  return startDate === endDate
    ? `${startDate} · kl. ${startClock}-${endClock}`
    : `${startDate} kl. ${startClock} - ${endDate} kl. ${endClock}`;
}

function getGroupKey(request: LeaveRequest) {
  const allDayDateRange = getAllDayDateRange(request);

  return allDayDateRange?.startDate ?? formatDateDK(request.startDate);
}

function getStatusBadge(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  if (status === "CANCELLED") {
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function getStatusLabel(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Godkendt";
  }

  if (status === "REJECTED") {
    return "Afvist";
  }

  if (status === "CANCELLED") {
    return "Annulleret";
  }

  return "Afventer";
}

function getStatusDescription(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Godkendt fravær";
  }

  if (status === "REJECTED") {
    return "Afvist ansøgning";
  }

  if (status === "CANCELLED") {
    return "Annulleret ansøgning";
  }

  return "Afventer behandling";
}

function getEmptyReasonText(reason?: string | null) {
  return reason?.trim() ? reason : "Ingen årsag angivet";
}

function getLocalDateStart(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getLocalDateEnd(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function requestOverlapsDateFilter(
  request: LeaveRequest,
  fromDate: string,
  toDate: string,
) {
  const requestStart = new Date(request.startDate);
  const requestEnd = new Date(request.endDate);

  if (
    Number.isNaN(requestStart.getTime()) ||
    Number.isNaN(requestEnd.getTime())
  ) {
    return false;
  }

  const filterStart = fromDate ? getLocalDateStart(fromDate) : null;
  const filterEnd = toDate ? getLocalDateEnd(toDate) : null;

  if (filterStart && requestEnd < filterStart) {
    return false;
  }

  if (filterEnd && requestStart > filterEnd) {
    return false;
  }

  return true;
}

function countLeaveStatuses(requests: LeaveRequest[]): LeaveStatusCounts {
  return requests.reduce<LeaveStatusCounts>(
    (counts, request) => {
      if (request.status === "PENDING") counts.pending += 1;
      if (request.status === "APPROVED") counts.approved += 1;
      if (request.status === "REJECTED") counts.rejected += 1;
      if (request.status === "CANCELLED") counts.cancelled += 1;

      return counts;
    },
    {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    },
  );
}

function getStatusSummaryParts(requests: LeaveRequest[]) {
  const counts = countLeaveStatuses(requests);

  return [
    counts.pending > 0 ? `Afventer: ${counts.pending}` : null,
    counts.approved > 0 ? `Godkendt: ${counts.approved}` : null,
    counts.rejected > 0 ? `Afvist: ${counts.rejected}` : null,
    counts.cancelled > 0 ? `Annulleret: ${counts.cancelled}` : null,
  ].filter(Boolean);
}

function isRequestVisibleByStatus(
  request: LeaveRequest,
  filters: LeaveStatusFilters,
) {
  if (request.status === "PENDING") return filters.pending;
  if (request.status === "APPROVED") return filters.approved;
  if (request.status === "REJECTED") return filters.rejected;
  if (request.status === "CANCELLED") return filters.cancelled;

  return false;
}

function getActiveFilterCount(
  filters: LeaveStatusFilters,
  fromDate: string,
  toDate: string,
) {
  return (
    Object.values(filters).filter(Boolean).length +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0)
  );
}

function getFilterSummary(
  filters: LeaveStatusFilters,
  fromDate: string,
  toDate: string,
) {
  const statusLabels = [];

  if (filters.pending) statusLabels.push("Afventer");
  if (filters.approved) statusLabels.push("Godkendte");
  if (filters.rejected) statusLabels.push("Afviste");
  if (filters.cancelled) statusLabels.push("Annullerede");

  const parts = [
    statusLabels.length > 0 ? statusLabels.join(", ") : "Ingen statusser valgt",
  ];

  if (fromDate) {
    parts.push(`fra ${formatDateDK(fromDate)}`);
  }

  if (toDate) {
    parts.push(`til ${formatDateDK(toDate)}`);
  }

  return parts.join(" · ");
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }

    return data.message || fallback;
  } catch {
    return fallback;
  }
}

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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Fraværsansøgninger</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Ansøg om fravær og se status på dine ansøgninger.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isMasterWithoutOwnCinema}
                onClick={() => {
                  setSuccess("");
                  setShowRequestModal(true);
                }}
                className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Ansøg om fravær
              </button>

              <button
                type="button"
                onClick={openFilterModal}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                <SlidersHorizontal size={18} />
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </div>

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

        <section className="grid gap-4 md:grid-cols-4">
          <div
            className={`rounded-2xl border p-5 shadow-sm transition-colors ${
              statusCounts.pending > 0
                ? "border-yellow-300 bg-yellow-50 dark:border-yellow-900/70 dark:bg-yellow-950/30"
                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afventer
            </div>
            <div className="mt-1 text-3xl font-bold">
              {statusCounts.pending}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ansøgninger der afventer behandling.
            </div>

            {statusCounts.pending > 0 && (
              <button
                type="button"
                onClick={showPendingOnly}
                className="mt-3 rounded-xl bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-700"
              >
                Vis afventende
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Godkendte
            </div>
            <div className="mt-1 text-3xl font-bold">
              {statusCounts.approved}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Fravær der er godkendt.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afviste
            </div>
            <div className="mt-1 text-3xl font-bold">
              {statusCounts.rejected}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ansøgninger der er afvist.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Annullerede
            </div>
            <div className="mt-1 text-3xl font-bold">
              {statusCounts.cancelled}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ansøgninger du eller administrationen har annulleret.
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mine ansøgninger</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Viser {visibleRequests.length} af {requests.length} ansøgninger.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Filter: {filterSummary}
              </p>
            </div>
          </div>

          {groupedRequests.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 p-6 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Ingen fraværsansøgninger matcher det valgte filter.
            </div>
          ) : (
            <div className="space-y-3">
              {groupedRequests.map((group) => {
                const isExpanded = expandedGroupKeys.includes(group.key);

                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="flex w-full items-center justify-between gap-4 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          {isExpanded ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          {group.key}
                        </div>

                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {group.requests.length} ansøgning
                          {group.requests.length === 1 ? "" : "er"}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {getStatusSummaryParts(group.requests).map((part) => (
                          <span
                            key={part}
                            className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 p-4">
                        {group.requests.map((request) => (
                          <div
                            key={request.id}
                            className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-lg font-semibold">
                                  {getPeriodText(request)}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                      request.status,
                                    )}`}
                                  >
                                    {getStatusDescription(request.status)}
                                  </span>
                                </div>
                              </div>

                              {(request.status === "PENDING" ||
                                request.status === "APPROVED") &&
                                request.user.id === currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() => setRequestToCancel(request)}
                                    className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                                  >
                                    Annullér
                                  </button>
                                )}
                            </div>

                            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                              <div>
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Periode
                                </div>
                                <div className="mt-1">
                                  {getPeriodText(request)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Årsag
                                </div>
                                <div className="mt-1">
                                  {getEmptyReasonText(request.reason)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Status
                                </div>
                                <div className="mt-1">
                                  {getStatusLabel(request.status)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
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

      <FilterModal
        open={showFilterModal}
        title="Filter"
        activeFilterCount={activeFilterCount}
        applyText="Vis ansøgninger"
        resetText="Nulstil filter"
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={closeFilterModal}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vælg hvilke fraværsansøgninger du vil se.
          </p>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Status
            </h3>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.pending}
                onChange={(event) =>
                  updateDraftStatusFilter("pending", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Afventer</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der endnu ikke er behandlet.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.approved}
                onChange={(event) =>
                  updateDraftStatusFilter("approved", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Godkendte</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Fravær der er godkendt.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.rejected}
                onChange={(event) =>
                  updateDraftStatusFilter("rejected", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Afviste</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der er afvist.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                checked={draftStatusFilters.cancelled}
                onChange={(event) =>
                  updateDraftStatusFilter("cancelled", event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium">Annullerede</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Ansøgninger der er annulleret.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Periode
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Fra dato</label>
                <input
                  type="date"
                  className={inputClass}
                  value={draftFilterStartDate}
                  onChange={(event) =>
                    setDraftFilterStartDate(event.target.value)
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Til dato</label>
                <input
                  type="date"
                  className={inputClass}
                  value={draftFilterEndDate}
                  onChange={(event) =>
                    setDraftFilterEndDate(event.target.value)
                  }
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Datofilteret viser ansøgninger, der overlapper den valgte periode.
            </p>
          </div>
        </div>
      </FilterModal>

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
