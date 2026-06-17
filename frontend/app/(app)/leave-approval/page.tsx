"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import AdminGuard from "@/app/components/AdminGuard";
import FilterModal from "@/app/components/modals/FilterModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import {
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
} from "@/app/utils/dateTime";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  createdAt?: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

type LeaveDateGroup = {
  key: string;
  title: string;
  sortTime: number;
  requests: LeaveRequest[];
};

type LeaveStatusFilters = {
  pending: boolean;
  approved: boolean;
  rejected: boolean;
  cancelled: boolean;
};

const DEFAULT_STATUS_FILTERS: LeaveStatusFilters = {
  pending: true,
  approved: false,
  rejected: false,
  cancelled: false,
};

function getFullDayDateRange(
  start: Date,
  end: Date,
): LeaveDisplayDateRange | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const isLocalFullDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalFullDay) {
    return {
      startDate: formatDateDK(start),
      endDate: formatDateDK(end),
    };
  }

  const isUtcFullDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcFullDay) {
    return {
      startDate: formatUtcDateDK(start),
      endDate: formatUtcDateDK(end),
    };
  }

  return null;
}

function formatLeavePeriod(startDateString: string, endDateString: string) {
  const start = new Date(startDateString);
  const end = new Date(endDateString);
  const fullDayDateRange = getFullDayDateRange(start, end);

  if (fullDayDateRange) {
    return fullDayDateRange.startDate === fullDayDateRange.endDate
      ? `${fullDayDateRange.startDate} · Hele dagen`
      : `${fullDayDateRange.startDate} - ${fullDayDateRange.endDate} · Hele dagen`;
  }

  const startDate = formatDateDK(start);
  const endDate = formatDateDK(end);
  const startTime = formatTimeDK(start);
  const endTime = formatTimeDK(end);

  return startDate === endDate
    ? `${startDate} · kl. ${startTime}-${endTime}`
    : `${startDate} kl. ${startTime} - ${endDate} kl. ${endTime}`;
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
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  if (status === "CANCELLED") return "Annulleret";
  return "Afventer";
}

function getDetailedStatusLabel(status: LeaveStatus) {
  if (status === "APPROVED") return "Godkendt fravær";
  if (status === "REJECTED") return "Afvist ansøgning";
  if (status === "CANCELLED") return "Annulleret ansøgning";
  return "Afventer behandling";
}

function getStatusDescription(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Fraværet er godkendt og bør tages højde for i vagtplanen.";
  }

  if (status === "REJECTED") {
    return "Ansøgningen er afvist og kræver ikke yderligere handling.";
  }

  if (status === "CANCELLED") {
    return "Ansøgningen er annulleret og kræver ikke yderligere handling.";
  }

  return "Ansøgningen afventer godkendelse eller afvisning.";
}

function getNoActionLabel(status: LeaveStatus) {
  if (status === "REJECTED") return "Afvist · ingen yderligere handlinger";
  if (status === "CANCELLED") return "Annulleret · ingen yderligere handlinger";

  return "Ingen handlinger";
}

function getCancelActionLabel(status: LeaveStatus) {
  if (status === "APPROVED") return "Annullér fravær";
  return "Annullér ansøgning";
}

function formatLeaveReason(reason?: string | null) {
  const trimmedReason = reason?.trim();

  return trimmedReason ? trimmedReason : "Ingen årsag angivet";
}

function formatRequestCreatedAt(createdAt?: string) {
  if (!createdAt) return "Ukendt";

  return `${formatDateDK(createdAt)} kl. ${formatTimeDK(createdAt)}`;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyFromDanishDate(date: string) {
  const [day, month, year] = date.split(".");

  if (!day || !month || !year) {
    return date;
  }

  return `${year}-${month}-${day}`;
}

function formatDateGroupTitle(key: string, fallbackDate: string) {
  const date = new Date(`${key}T12:00:00`);
  const weekday = Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("da-DK", { weekday: "long" }).format(date);

  if (!weekday) {
    return fallbackDate;
  }

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(
    1,
  )} ${fallbackDate}`;
}

function getLeaveDateGroupMeta(request: LeaveRequest) {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const fullDayDateRange = getFullDayDateRange(start, end);

  if (fullDayDateRange) {
    const key = getDateKeyFromDanishDate(fullDayDateRange.startDate);
    return {
      key,
      title: formatDateGroupTitle(key, fullDayDateRange.startDate),
      sortTime: new Date(`${key}T12:00:00`).getTime(),
    };
  }

  if (Number.isNaN(start.getTime())) {
    return {
      key: request.startDate,
      title: "Ukendt dato",
      sortTime: 0,
    };
  }

  const key = getLocalDateKey(start);
  const displayDate = formatDateDK(start);

  return {
    key,
    title: formatDateGroupTitle(key, displayDate),
    sortTime: start.getTime(),
  };
}

function getStatusCountsForRequests(requests: LeaveRequest[]) {
  return requests.reduce(
    (counts, request) => ({
      ...counts,
      [request.status]: counts[request.status] + 1,
    }),
    {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    } satisfies Record<LeaveStatus, number>,
  );
}

function getStatusSummaryParts(requests: LeaveRequest[]) {
  const counts = getStatusCountsForRequests(requests);

  return [
    { label: "Afventer", count: counts.PENDING, status: "PENDING" as const },
    { label: "Godkendt", count: counts.APPROVED, status: "APPROVED" as const },
    { label: "Afvist", count: counts.REJECTED, status: "REJECTED" as const },
    {
      label: "Annulleret",
      count: counts.CANCELLED,
      status: "CANCELLED" as const,
    },
  ].filter((item) => item.count > 0);
}

function makeDateGroupExpansionKey(userId: number, dateKey: string) {
  return `${userId}:${dateKey}`;
}

function getUserName(request: LeaveRequest) {
  return `${request.user.firstName} ${request.user.lastName}`.trim();
}

function getStatusFilterSummary(filters: LeaveStatusFilters) {
  const labels = [];

  if (filters.pending) labels.push("Afventer");
  if (filters.approved) labels.push("Godkendte");
  if (filters.rejected) labels.push("Afviste");
  if (filters.cancelled) labels.push("Annullerede");

  return labels.length > 0 ? labels.join(", ") : "Ingen statusser valgt";
}

function getActiveFilterCount(
  filters: LeaveStatusFilters,
  startDateFilter: string,
  endDateFilter: string,
) {
  return (
    Object.values(filters).filter(Boolean).length +
    (startDateFilter ? 1 : 0) +
    (endDateFilter ? 1 : 0)
  );
}

function matchesStatusFilter(
  request: LeaveRequest,
  filters: LeaveStatusFilters,
) {
  if (request.status === "PENDING") return filters.pending;
  if (request.status === "APPROVED") return filters.approved;
  if (request.status === "REJECTED") return filters.rejected;
  if (request.status === "CANCELLED") return filters.cancelled;

  return false;
}

function getDateFilterStart(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateFilterEnd(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDateFilter(
  request: LeaveRequest,
  startDateFilter: string,
  endDateFilter: string,
) {
  const requestStart = new Date(request.startDate);
  const requestEnd = new Date(request.endDate);
  const filterStart = getDateFilterStart(startDateFilter);
  const filterEnd = getDateFilterEnd(endDateFilter);

  if (
    Number.isNaN(requestStart.getTime()) ||
    Number.isNaN(requestEnd.getTime())
  ) {
    return true;
  }

  if (filterStart && requestEnd < filterStart) {
    return false;
  }

  if (filterEnd && requestStart > filterEnd) {
    return false;
  }

  return true;
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

export default function LeaveApprovalPage() {
  const infoDialog = useInfoModal();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<LeaveStatusFilters>(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState<LeaveStatusFilters>(DEFAULT_STATUS_FILTERS);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [draftStartDateFilter, setDraftStartDateFilter] = useState("");
  const [draftEndDateFilter, setDraftEndDateFilter] = useState("");

  const [expandedUserIds, setExpandedUserIds] = useState<number[]>([]);
  const [expandedDateGroupKeys, setExpandedDateGroupKeys] = useState<string[]>(
    [],
  );

  const fetchRequests = useCallback(async (showError = true) => {
    try {
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeCore({
    onLeaveRequestUpdated: () => fetchRequests(false),
  });

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const statusCounts = useMemo(() => {
    return requests.reduce(
      (counts, request) => ({
        ...counts,
        [request.status]: counts[request.status] + 1,
      }),
      {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        CANCELLED: 0,
      } satisfies Record<LeaveStatus, number>,
    );
  }, [requests]);

  const visibleRequests = useMemo(() => {
    return requests.filter((request) => {
      return (
        matchesStatusFilter(request, statusFilters) &&
        matchesDateFilter(request, startDateFilter, endDateFilter)
      );
    });
  }, [endDateFilter, requests, startDateFilter, statusFilters]);

  const groupedRequests = useMemo(() => {
    const groups = new Map<number, LeaveRequest[]>();

    for (const request of visibleRequests) {
      const existing = groups.get(request.user.id) || [];
      groups.set(request.user.id, [...existing, request]);
    }

    return Array.from(groups.entries())
      .map(([userId, userRequests]) => {
        const sortedRequests = userRequests.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        );

        const dateGroups = new Map<string, LeaveDateGroup>();

        for (const request of sortedRequests) {
          const meta = getLeaveDateGroupMeta(request);
          const existing = dateGroups.get(meta.key);

          if (existing) {
            dateGroups.set(meta.key, {
              ...existing,
              requests: [...existing.requests, request],
            });
          } else {
            dateGroups.set(meta.key, {
              ...meta,
              requests: [request],
            });
          }
        }

        return {
          userId,
          userName: getUserName(sortedRequests[0]),
          requests: sortedRequests,
          dateGroups: Array.from(dateGroups.values()).sort(
            (a, b) => a.sortTime - b.sortTime,
          ),
        };
      })
      .sort((a, b) => a.userName.localeCompare(b.userName, "da-DK"));
  }, [visibleRequests]);

  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(statusFilters, startDateFilter, endDateFilter);
  }, [endDateFilter, startDateFilter, statusFilters]);

  const statusFilterSummary = useMemo(() => {
    return getStatusFilterSummary(statusFilters);
  }, [statusFilters]);

  const dateFilterSummary = useMemo(() => {
    if (startDateFilter && endDateFilter) {
      return `${formatDateDK(startDateFilter)} til ${formatDateDK(
        endDateFilter,
      )}`;
    }

    if (startDateFilter) {
      return `Fra ${formatDateDK(startDateFilter)}`;
    }

    if (endDateFilter) {
      return `Til ${formatDateDK(endDateFilter)}`;
    }

    return "Alle datoer";
  }, [endDateFilter, startDateFilter]);

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setDraftStartDateFilter(startDateFilter);
    setDraftEndDateFilter(endDateFilter);
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
    setStartDateFilter(draftStartDateFilter);
    setEndDateFilter(draftEndDateFilter);
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
    setShowFilterModal(false);
  }

  function resetFilter() {
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStartDateFilter("");
    setEndDateFilter("");
    setDraftStartDateFilter("");
    setDraftEndDateFilter("");
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
    setShowFilterModal(false);
  }

  function showOnlyPending() {
    setStatusFilters({
      pending: true,
      approved: false,
      rejected: false,
      cancelled: false,
    });
    setExpandedUserIds([]);
    setExpandedDateGroupKeys([]);
  }

  function toggleUserGroup(userId: number) {
    setExpandedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleDateGroup(userId: number, dateKey: string) {
    const expansionKey = makeDateGroupExpansionKey(userId, dateKey);

    setExpandedDateGroupKeys((current) =>
      current.includes(expansionKey)
        ? current.filter((key) => key !== expansionKey)
        : [...current, expansionKey],
    );
  }

  async function updateStatus(requestId: number, status: LeaveStatus) {
    try {
      const response = await apiFetch(`/leave-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Status kunne ikke opdateres."),
        );
      }

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Status kunne ikke opdateres",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Fraværsgodkendelse</h1>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Gennemgå og håndter medarbejdernes fraværsansøgninger.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    Viser: {statusFilterSummary}
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {dateFilterSummary}
                  </span>

                  {statusCounts.PENDING > 0 && (
                    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                      {statusCounts.PENDING} kræver behandling
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {statusCounts.PENDING > 0 && (
                  <button
                    type="button"
                    onClick={showOnlyPending}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
                  >
                    Vis afventende
                  </button>
                )}

                <button
                  type="button"
                  onClick={openFilterModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950"
                >
                  <SlidersHorizontal size={18} />
                  Filter
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>
          </div>

          {!loading && (
            <div className="grid gap-4 md:grid-cols-4">
              <div
                className={`rounded-2xl border p-5 shadow-sm transition-colors ${
                  statusCounts.PENDING > 0
                    ? "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Afventer
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {statusCounts.PENDING}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Kræver behandling.
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Godkendt
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {statusCounts.APPROVED}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Allerede godkendt.
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Afvist
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {statusCounts.REJECTED}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Afviste ansøgninger.
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Annulleret
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {statusCounts.CANCELLED}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Annullerede ansøgninger.
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Henter fraværsansøgninger...
            </div>
          )}

          {!loading && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Ansøgninger</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Viser {visibleRequests.length} af {requests.length}{" "}
                    ansøgninger.
                  </p>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {statusFilterSummary} · {dateFilterSummary}
                </div>
              </div>

              {groupedRequests.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800">
                  <h3 className="text-xl font-bold">
                    Ingen fraværsansøgninger
                  </h3>

                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Ingen ansøgninger matcher det valgte filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedRequests.map((group) => {
                    const isExpanded = expandedUserIds.includes(group.userId);

                    return (
                      <div
                        key={group.userId}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                      >
                        <button
                          type="button"
                          onClick={() => toggleUserGroup(group.userId)}
                          className="flex w-full items-center justify-between gap-4 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900"
                        >
                          <div>
                            <div className="flex items-center gap-2 font-semibold">
                              {isExpanded ? (
                                <ChevronDown size={18} />
                              ) : (
                                <ChevronRight size={18} />
                              )}
                              {group.userName}
                            </div>

                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {group.requests.length} ansøgning
                              {group.requests.length === 1 ? "" : "er"}
                            </div>
                          </div>

                          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                            {[
                              {
                                label: "Afventer",
                                count: group.requests.filter(
                                  (request) => request.status === "PENDING",
                                ).length,
                              },
                              {
                                label: "Godkendt",
                                count: group.requests.filter(
                                  (request) => request.status === "APPROVED",
                                ).length,
                              },
                              {
                                label: "Afvist",
                                count: group.requests.filter(
                                  (request) => request.status === "REJECTED",
                                ).length,
                              },
                              {
                                label: "Annulleret",
                                count: group.requests.filter(
                                  (request) => request.status === "CANCELLED",
                                ).length,
                              },
                            ]
                              .filter((item) => item.count > 0)
                              .map((item) => `${item.label}: ${item.count}`)
                              .join(" · ")}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="space-y-3 p-4">
                            {group.dateGroups.map((dateGroup) => {
                              const dateExpansionKey =
                                makeDateGroupExpansionKey(
                                  group.userId,
                                  dateGroup.key,
                                );
                              const isDateExpanded =
                                expandedDateGroupKeys.includes(
                                  dateExpansionKey,
                                );
                              const statusSummary = getStatusSummaryParts(
                                dateGroup.requests,
                              );

                              return (
                                <div
                                  key={dateGroup.key}
                                  className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleDateGroup(
                                        group.userId,
                                        dateGroup.key,
                                      )
                                    }
                                    className="flex w-full flex-col gap-3 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2 font-semibold">
                                        {isDateExpanded ? (
                                          <ChevronDown size={18} />
                                        ) : (
                                          <ChevronRight size={18} />
                                        )}
                                        {dateGroup.title}
                                      </div>

                                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {dateGroup.requests.length} ansøgning
                                        {dateGroup.requests.length === 1
                                          ? ""
                                          : "er"}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                      {statusSummary.map((item) => (
                                        <span
                                          key={item.status}
                                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                            item.status,
                                          )}`}
                                        >
                                          {item.label}: {item.count}
                                        </span>
                                      ))}
                                    </div>
                                  </button>

                                  {isDateExpanded && (
                                    <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
                                      {dateGroup.requests.map((request) => (
                                        <div
                                          key={request.id}
                                          className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                                        >
                                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                                    request.status,
                                                  )}`}
                                                >
                                                  {getDetailedStatusLabel(
                                                    request.status,
                                                  )}
                                                </span>

                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  Ansøgt{" "}
                                                  {formatRequestCreatedAt(
                                                    request.createdAt,
                                                  )}
                                                </span>
                                              </div>

                                              <div className="mt-2 text-lg font-semibold">
                                                {formatLeavePeriod(
                                                  request.startDate,
                                                  request.endDate,
                                                )}
                                              </div>

                                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {getStatusDescription(
                                                  request.status,
                                                )}
                                              </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 md:justify-end">
                                              {request.status === "PENDING" && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      updateStatus(
                                                        request.id,
                                                        "APPROVED",
                                                      )
                                                    }
                                                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                                  >
                                                    Godkend
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      updateStatus(
                                                        request.id,
                                                        "REJECTED",
                                                      )
                                                    }
                                                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                                  >
                                                    Afvis
                                                  </button>
                                                </>
                                              )}

                                              {(request.status === "PENDING" ||
                                                request.status ===
                                                  "APPROVED") && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    updateStatus(
                                                      request.id,
                                                      "CANCELLED",
                                                    )
                                                  }
                                                  className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                                                >
                                                  {getCancelActionLabel(
                                                    request.status,
                                                  )}
                                                </button>
                                              )}

                                              {(request.status === "REJECTED" ||
                                                request.status ===
                                                  "CANCELLED") && (
                                                <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                                  {getNoActionLabel(
                                                    request.status,
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                                              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                                Fraværsperiode
                                              </div>
                                              <div className="mt-1 font-medium">
                                                {formatLeavePeriod(
                                                  request.startDate,
                                                  request.endDate,
                                                )}
                                              </div>
                                            </div>

                                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                                              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                                Årsag
                                              </div>
                                              <div className="mt-1 font-medium">
                                                {formatLeaveReason(
                                                  request.reason,
                                                )}
                                              </div>
                                            </div>

                                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                                              <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                                Status
                                              </div>
                                              <div className="mt-1 font-medium">
                                                {getStatusLabel(request.status)}
                                              </div>
                                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Oprettet{" "}
                                                {formatRequestCreatedAt(
                                                  request.createdAt,
                                                )}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <FilterModal
          open={showFilterModal}
          title="Filtrer fraværsansøgninger"
          activeFilterCount={activeFilterCount}
          applyText="Vis ansøgninger"
          resetText="Nulstil filter"
          onApply={applyFilter}
          onReset={resetFilter}
          onClose={closeFilterModal}
        >
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status
              </h3>

              <div className="mt-3 space-y-3">
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
                      Ansøgninger der kræver behandling.
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
                      Ansøgninger der allerede er godkendt.
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
                      Ansøgninger der er blevet afvist.
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
                      Ansøgninger der er blevet annulleret.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Periode
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Fra dato</span>
                  <input
                    type="date"
                    value={draftStartDateFilter}
                    onChange={(event) =>
                      setDraftStartDateFilter(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </label>

                <label className="block text-sm">
                  <span className="font-medium">Til dato</span>
                  <input
                    type="date"
                    value={draftEndDateFilter}
                    onChange={(event) =>
                      setDraftEndDateFilter(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </label>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Datofilteret viser ansøgninger, der overlapper den valgte
                periode.
              </p>
            </div>
          </div>
        </FilterModal>

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
