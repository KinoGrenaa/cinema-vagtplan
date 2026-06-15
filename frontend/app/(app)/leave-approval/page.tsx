"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import AdminGuard from "@/app/components/AdminGuard";
import BaseModal from "@/app/components/modals/BaseModal";
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

function getUserName(request: LeaveRequest) {
  return `${request.user.firstName} ${request.user.lastName}`.trim();
}

export default function LeaveApprovalPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const [expandedUserIds, setExpandedUserIds] = useState<number[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/leave-requests");

      if (!response.ok) {
        setRequests([]);
        setError("Fraværsansøgninger kunne ikke hentes.");
        return;
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
      setError("Der opstod en fejl ved hentning af fraværsansøgninger.");
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeCore({
    onLeaveRequestUpdated: fetchRequests,
  });

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const visibleRequests = useMemo(() => {
    return requests.filter((request) => {
      if (request.status === "PENDING") return showPending;
      if (request.status === "APPROVED") return showApproved;
      if (request.status === "REJECTED") return showRejected;
      if (request.status === "CANCELLED") return showCancelled;

      return false;
    });
  }, [requests, showApproved, showCancelled, showPending, showRejected]);

  const groupedRequests = useMemo(() => {
    const groups = new Map<number, LeaveRequest[]>();

    for (const request of visibleRequests) {
      const existing = groups.get(request.user.id) || [];
      groups.set(request.user.id, [...existing, request]);
    }

    return Array.from(groups.entries())
      .map(([userId, userRequests]) => ({
        userId,
        userName: getUserName(userRequests[0]),
        requests: userRequests.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
      }))
      .sort((a, b) => a.userName.localeCompare(b.userName, "da-DK"));
  }, [visibleRequests]);

  function resetFilter() {
    setShowPending(true);
    setShowApproved(false);
    setShowRejected(false);
    setShowCancelled(false);
  }

  function toggleUserGroup(userId: number) {
    setExpandedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function updateStatus(requestId: number, status: LeaveStatus) {
    try {
      setError("");

      const response = await apiFetch(`/leave-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Status kunne ikke opdateres.");
      }

      await fetchRequests();
    } catch (err: any) {
      setError(err.message || "Der opstod en fejl.");
    }
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Fraværsgodkendelse</h1>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Gennemgå, godkend, afvis eller annuller fraværsansøgninger.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                <SlidersHorizontal size={18} />
                Filter
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Henter fraværsansøgninger...
            </div>
          )}

          {!loading && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Ansøgninger</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Viser {visibleRequests.length} af {requests.length}{" "}
                  ansøgninger.
                </p>
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
                            {group.requests.map((request) => (
                              <div
                                key={request.id}
                                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="text-lg font-semibold">
                                      {formatLeavePeriod(
                                        request.startDate,
                                        request.endDate,
                                      )}
                                    </div>

                                    <div className="mt-2">
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                          request.status,
                                        )}`}
                                      >
                                        {getStatusLabel(request.status)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {request.status === "PENDING" && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateStatus(request.id, "APPROVED")
                                          }
                                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                        >
                                          Godkend
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateStatus(request.id, "REJECTED")
                                          }
                                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                        >
                                          Afvis
                                        </button>
                                      </>
                                    )}

                                    {(request.status === "PENDING" ||
                                      request.status === "APPROVED") && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateStatus(request.id, "CANCELLED")
                                        }
                                        className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                                      >
                                        Annuller
                                      </button>
                                    )}

                                    {(request.status === "REJECTED" ||
                                      request.status === "CANCELLED") && (
                                      <span className="text-sm text-gray-400 dark:text-gray-500">
                                        Ingen handlinger
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                                  <div>
                                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                      Medarbejder
                                    </div>
                                    <div className="mt-1">
                                      {getUserName(request)}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                      Periode
                                    </div>
                                    <div className="mt-1">
                                      {formatLeavePeriod(
                                        request.startDate,
                                        request.endDate,
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                      Årsag
                                    </div>
                                    <div className="mt-1">
                                      {request.reason || "-"}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                      Oprettet
                                    </div>
                                    <div className="mt-1">
                                      {request.createdAt
                                        ? `${formatDateDK(
                                            request.createdAt,
                                          )} kl. ${formatTimeDK(
                                            request.createdAt,
                                          )}`
                                        : "-"}
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
          )}
        </div>

        <BaseModal
          open={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          title="Filter"
        >
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <span>Afventer</span>
              <input
                type="checkbox"
                checked={showPending}
                onChange={(event) => setShowPending(event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <span>Godkendt</span>
              <input
                type="checkbox"
                checked={showApproved}
                onChange={(event) => setShowApproved(event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <span>Afvist</span>
              <input
                type="checkbox"
                checked={showRejected}
                onChange={(event) => setShowRejected(event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <span>Annulleret</span>
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(event) => setShowCancelled(event.target.checked)}
              />
            </label>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetFilter}
                className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Nulstil filter
              </button>

              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Luk
              </button>
            </div>
          </div>
        </BaseModal>
      </main>
    </AdminGuard>
  );
}
