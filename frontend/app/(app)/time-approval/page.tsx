"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type TimeEntryStatus = "PENDING" | "APPROVED" | "REJECTED";

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
  adminNote?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  shift?: {
    workType?: {
      name: string;
    };
  } | null;
};

function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  return "Afventer";
}

function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

export default function TimeApprovalPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/time-entries`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setEntries([]);
        return;
      }

      const data = await response.json();

      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function getHours(entry: TimeEntry) {
    if (!entry.clockOut) return "-";

    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);

    const hours =
      (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours.toFixed(2);
  }

  async function approve(id: number) {
    await fetch(`${API_URL}/time-entries/${id}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchEntries();
  }

  async function unapprove(id: number) {
    await fetch(`${API_URL}/time-entries/${id}/unapprove`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchEntries();
  }

  async function reject(id: number) {
    const adminNote =
      window.prompt("Skriv evt. årsag til afvisning") || "";

    await fetch(`${API_URL}/time-entries/${id}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        adminNote,
      }),
    });

    await fetchEntries();
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Godkend timer</h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Gennemgå, godkend eller afvis clock ind/ud.
            </p>
          </div>

          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Henter tidsregistreringer...
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-xl font-bold">
                          {entry.user.firstName}{" "}
                          {entry.user.lastName}
                        </h2>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.user.email}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="font-semibold">
                            Arbejdstype:
                          </span>{" "}
                          {entry.shift?.workType?.name || "-"}
                        </div>

                        <div>
                          <span className="font-semibold">
                            Clock ind:
                          </span>{" "}
                          {new Date(
                            entry.clockIn,
                          ).toLocaleString("da-DK")}
                        </div>

                        <div>
                          <span className="font-semibold">
                            Clock ud:
                          </span>{" "}
                          {entry.clockOut
                            ? new Date(
                                entry.clockOut,
                              ).toLocaleString("da-DK")
                            : "-"}
                        </div>

                        <div>
                          <span className="font-semibold">
                            Timer:
                          </span>{" "}
                          {getHours(entry)}
                        </div>

                        {entry.adminNote && (
                          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
                            <span className="font-semibold">
                              Admin note:
                            </span>{" "}
                            {entry.adminNote}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          entry.status,
                        )}`}
                      >
                        {getStatusLabel(entry.status)}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {entry.status !== "APPROVED" && (
                          <button
                            onClick={() => approve(entry.id)}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                          >
                            Godkend
                          </button>
                        )}

                        {entry.status === "APPROVED" && (
                          <button
                            onClick={() => unapprove(entry.id)}
                            className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700"
                          >
                            Fjern godkendelse
                          </button>
                        )}

                        <button
                          onClick={() => reject(entry.id)}
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          Afvis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 text-4xl">⏱️</div>

              <h2 className="text-xl font-bold">
                Ingen tidsregistreringer
              </h2>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Der er ingen registreringer at godkende lige nu.
              </p>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}