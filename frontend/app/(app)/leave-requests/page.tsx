"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { getTomorrowLocalDate, formatUtcDateDK } from "@/app/utils/dateTime";

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

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const minDate = getTomorrowLocalDate();

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  }

  function getToken() {
    return localStorage.getItem("token");
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

  async function createLeaveRequest(event: React.FormEvent<HTMLFormElement>) {
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
            ? `${startDate}T00:00:00`
            : `${startDate}T${startTime}:00`,

          endDate: allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`,

          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Fraværsansøgningen kunne ikke oprettes.",
        );
      }

      setReason("");
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
              <h1 className="text-3xl font-bold">Fridagsansøgninger</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Ansøg om fri og se status på ansøgninger.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-2xl font-bold">Ny fridagsansøgning</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={createLeaveRequest}
            className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
          >
            <div>
              <label className={labelClass}>Fra dato</label>
              <div className="relative">
                <input
                  ref={startDateInputRef}
                  type="date"
                  min={minDate}
                  className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
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

            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                Hele dagen
              </label>
            </div>

            {!allDay && (
              <>
                <div>
                  <label className={labelClass}>Fra tidspunkt</label>
                  <input
                    type="time"
                    className={inputClass}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Til tidspunkt</label>
                  <input
                    type="time"
                    className={inputClass}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Årsag</label>
              <input
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Valgfrit"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Send ansøgning
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-2xl font-bold">Mine ansøgninger</h2>

          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="hidden bg-gray-50 text-sm font-medium text-gray-600 dark:bg-gray-950 dark:text-gray-400 md:grid md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.2fr]">
              <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                Medarbejder
              </div>
              <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                Fra
              </div>
              <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                Til
              </div>
              <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                Årsag
              </div>
              <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                Status
              </div>
              <div className="p-3">Handling</div>
            </div>

            {requests.map((request) => (
              <div
                key={request.id}
                className="grid gap-3 border-t border-gray-200 p-4 text-sm dark:border-gray-800 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.2fr] md:gap-0 md:p-0"
              >
                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Medarbejder
                  </span>
                  {request.user.firstName} {request.user.lastName}
                </div>

                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Fra
                  </span>
                  {formatUtcDateDK(request.startDate)}
                </div>

                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Til
                  </span>
                  {formatUtcDateDK(request.endDate)}
                </div>

                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Årsag
                  </span>
                  {request.reason || "-"}
                </div>

                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Status
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                      request.status,
                    )}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 md:p-3">
                  {(request.status === "PENDING" ||
                    request.status === "APPROVED") &&
                  request.user.id === currentUserId ? (
                    <button
                      onClick={() => cancelLeaveRequest(request.id)}
                      className="rounded-lg bg-gray-600 px-3 py-1 text-white transition hover:bg-gray-700"
                    >
                      Annuller
                    </button>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      Ingen
                    </span>
                  )}
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Ingen fridagsansøgninger endnu.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
