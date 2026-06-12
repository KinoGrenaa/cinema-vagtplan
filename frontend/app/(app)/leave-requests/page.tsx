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
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import {
  getTomorrowLocalDate,
  formatUtcDateDK,
  formatTimeDK,
  localDateTimeToISOString,
} from "@/app/utils/dateTime";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

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

function isAllDayRequest(request: LeaveRequest) {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return (
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59
  );
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

function getPeriodText(request: LeaveRequest) {
  const startDate = formatUtcDateDK(request.startDate);
  const endDate = formatUtcDateDK(request.endDate);

  if (isAllDayRequest(request)) {
    return startDate === endDate
      ? `${startDate} · Heldag`
      : `${startDate} - ${endDate} · Heldag`;
  }

  const startClock = formatTimeDK(request.startDate);
  const endClock = formatTimeDK(request.endDate);

  return startDate === endDate
    ? `${startDate} · kl. ${startClock}-${endClock}`
    : `${startDate} kl. ${startClock} - ${endDate} kl. ${endClock}`;
}

function getGroupKey(request: LeaveRequest) {
  return formatUtcDateDK(request.startDate);
}

function getToken() {
  return localStorage.getItem("token");
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const minDate = getTomorrowLocalDate();

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [reason, setReason] = useState("");

  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null,
  );

  const [showPending, setShowPending] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

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

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/leave-requests`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setRequests([]);
        return;
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
  }, []);

  useRealtimeCore({
    onLeaveRequestUpdated: fetchRequests,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUserId(parsedUser.id ?? parsedUser.sub ?? null);
    }

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

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/leave-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Fraværsansøgningen kunne ikke oprettes.",
        );
      }

      resetForm();
      setShowRequestModal(false);
      setSuccess("Fraværsansøgningen er sendt.");

      await fetchRequests();
    } catch (err: any) {
      setError(err.message || "Der opstod en fejl.");
    }
  }

  async function cancelLeaveRequest(requestId: number) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/leave-requests/${requestId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Fraværsansøgningen kunne ikke annulleres.",
        );
      }

      setRequestToCancel(null);
      setSuccess("Fraværsansøgningen er annulleret.");
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || "Der opstod en fejl.");
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
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowRequestModal(true);
                }}
                className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Ansøg om fravær
              </button>

              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                <SlidersHorizontal size={18} />
                Filter
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mine ansøgninger</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Viser {visibleRequests.length} af {requests.length} ansøgninger.
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
                        {group.requests.map((request) => (
                          <span
                            key={request.id}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                              request.status,
                            )}`}
                          >
                            {getStatusLabel(request.status)}
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
                                    {getStatusLabel(request.status)}
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
                                    Annuller
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
                                  {request.reason || "-"}
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
              Annuller
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
              onClick={() => {
                setShowPending(true);
                setShowApproved(false);
                setShowRejected(false);
                setShowCancelled(false);
              }}
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

      <BaseModal
        open={Boolean(requestToCancel)}
        onClose={() => setRequestToCancel(null)}
        title="Annuller fraværsansøgning"
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
                Annuller ansøgning
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </main>
  );
}
