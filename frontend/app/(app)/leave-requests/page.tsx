"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    firstName: string;
    lastName: string;
  };
};

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

function getStatusBadge(status: LeaveRequest["status"]) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function getStatusLabel(status: LeaveRequest["status"]) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  return "Afventer";
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [startDate, setStartDate] = useState("2026-05-15");
  const [endDate, setEndDate] = useState("2026-05-15");
  const [reason, setReason] = useState("");

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

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchRequests();
  }, [fetchRequests]);

  async function createLeaveRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) return;

    await fetch(`${API_URL}/leave-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.999Z`,
        reason,
        cinemaId: currentUser.cinemaId,
        userId: currentUser.id,
      }),
    });

    setReason("");
    await fetchRequests();
  }

  async function updateStatus(
    requestId: number,
    status: "APPROVED" | "REJECTED",
  ) {
    await fetch(`${API_URL}/leave-requests/${requestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });

    await fetchRequests();
  }

  const canApprove =
    currentUser?.role === "ADMIN" || currentUser?.role === "MASTER";

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

            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Dashboard
            </a>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-2xl font-bold">Ny fridagsansøgning</h2>

          <form
            onSubmit={createLeaveRequest}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <div>
              <label className={labelClass}>Fra dato</label>
              <input
                type="date"
                className={inputClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Til dato</label>
              <input
                type="date"
                className={inputClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

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
                className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Send ansøgning
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-2xl font-bold">Ansøgninger</h2>

          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="hidden grid-cols-6 bg-gray-50 text-sm font-medium text-gray-600 dark:bg-gray-950 dark:text-gray-400 md:grid">
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
                className="grid gap-3 border-t border-gray-200 p-4 text-sm dark:border-gray-800 md:grid-cols-6 md:gap-0 md:p-0"
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
                  {new Date(request.startDate).toLocaleDateString("da-DK")}
                </div>

                <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
                  <span className="block text-xs text-gray-500 md:hidden">
                    Til
                  </span>
                  {new Date(request.endDate).toLocaleDateString("da-DK")}
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

                <div className="flex gap-2 md:p-3">
                  {canApprove && request.status === "PENDING" ? (
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