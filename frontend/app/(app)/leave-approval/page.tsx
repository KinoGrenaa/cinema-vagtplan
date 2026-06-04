"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import {
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
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

function isFullDayLeave(start: Date, end: Date) {
  return (
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() === 59
  );
}

function formatLeavePeriod(startDateString: string, endDateString: string) {
  const start = new Date(startDateString);
  const end = new Date(endDateString);

  if (isFullDayLeave(start, end)) {
    const startDate = formatUtcDateDK(start);
    const endDate = formatUtcDateDK(end);

    if (startDate === endDate) {
      return `${startDate} · Heldag`;
    }

    return `${startDate} → ${endDate} · Heldag`;
  }

  const startDate = formatDateDK(start);
  const endDate = formatDateDK(end);
  const startTime = formatTimeDK(start);
  const endTime = formatTimeDK(end);

  if (startDate === endDate) {
    return `${startDate} · ${startTime}-${endTime}`;
  }

  return `${startDate} kl. ${startTime} → ${endDate} kl. ${endTime}`;
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

export default function LeaveApprovalPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/leave-requests`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

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

  async function updateStatus(requestId: number, status: LeaveStatus) {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/leave-requests/${requestId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ status }),
        },
      );

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
            <h1 className="text-3xl font-bold">Fraværsgodkendelse</h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Gennemgå, godkend, afvis eller annuller fraværsansøgninger.
            </p>
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

          {!loading && requests.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="hidden bg-gray-50 text-sm font-medium text-gray-600 dark:bg-gray-950 dark:text-gray-400 md:grid md:grid-cols-[1.2fr_1.6fr_1fr_1fr_1.6fr]">
                  <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                    Medarbejder
                  </div>

                  <div className="border-r border-gray-200 p-3 dark:border-gray-800">
                    Periode
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
                    className="grid gap-3 border-t border-gray-200 p-4 text-sm dark:border-gray-800 md:md:grid-cols-[1.2fr_1.6fr_1fr_1fr_1.6fr] md:gap-0 md:p-0"
                  >
                    <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                      <span className="block text-xs text-gray-500 md:hidden">
                        Medarbejder
                      </span>
                      {request.user.firstName} {request.user.lastName}
                    </div>

                    <div className="whitespace-nowrap md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                      <span className="block text-xs text-gray-500 md:hidden">
                        Periode
                      </span>
                      {formatLeavePeriod(request.startDate, request.endDate)}
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
                      {request.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updateStatus(request.id, "APPROVED")}
                            className="rounded-lg bg-green-600 px-3 py-1 text-white transition hover:bg-green-700"
                          >
                            Godkend
                          </button>

                          <button
                            onClick={() => updateStatus(request.id, "REJECTED")}
                            className="rounded-lg bg-red-600 px-3 py-1 text-white transition hover:bg-red-700"
                          >
                            Afvis
                          </button>
                        </>
                      )}

                      {(request.status === "PENDING" ||
                        request.status === "APPROVED") && (
                        <button
                          onClick={() => updateStatus(request.id, "CANCELLED")}
                          className="rounded-lg bg-gray-600 px-3 py-1 text-white transition hover:bg-gray-700"
                        >
                          Annuller
                        </button>
                      )}

                      {(request.status === "REJECTED" ||
                        request.status === "CANCELLED") && (
                        <span className="text-gray-400 dark:text-gray-500">
                          Ingen
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && requests.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-bold">Ingen fraværsansøgninger</h2>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Der er ingen fraværsansøgninger at behandle lige nu.
              </p>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}
