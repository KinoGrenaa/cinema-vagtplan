"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";

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

export default function TimeApprovalPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchEntries = useCallback(async () => {
    const response = await fetch("http://localhost:3001/time-entries", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();
    setEntries(Array.isArray(data) ? data : []);
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

  function getStatusLabel(status: TimeEntryStatus) {
    if (status === "APPROVED") return "Godkendt";
    if (status === "REJECTED") return "Afvist";
    return "Afventer";
  }

  function getStatusClass(status: TimeEntryStatus) {
    if (status === "APPROVED") {
      return "bg-green-100 text-green-800";
    }

    if (status === "REJECTED") {
      return "bg-red-100 text-red-800";
    }

    return "bg-yellow-100 text-yellow-800";
  }

  async function approve(id: number) {
    await fetch(`http://localhost:3001/time-entries/${id}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchEntries();
  }

  async function unapprove(id: number) {
    await fetch(`http://localhost:3001/time-entries/${id}/unapprove`, {
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

    await fetch(`http://localhost:3001/time-entries/${id}/reject`, {
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

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold">Godkend timer</h1>

          <p className="text-gray-500">
            Gennemgå, godkend eller afvis clock ind/ud.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="font-bold">
                      {entry.user.firstName} {entry.user.lastName}
                    </div>

                    <div className="text-sm text-gray-500">
                      {entry.user.email}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      Type: {entry.shift?.workType?.name || "-"}
                    </div>

                    <div className="mt-3 text-sm">
                      <div>
                        Clock ind:{" "}
                        {new Date(entry.clockIn).toLocaleString("da-DK")}
                      </div>

                      <div>
                        Clock ud:{" "}
                        {entry.clockOut
                          ? new Date(entry.clockOut).toLocaleString("da-DK")
                          : "-"}
                      </div>

                      <div>Timer: {getHours(entry)}</div>
                    </div>

                    {entry.adminNote && (
                      <div className="mt-3 text-sm bg-gray-100 rounded-lg p-2">
                        Admin-note: {entry.adminNote}
                      </div>
                    )}

                    <div className="mt-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          entry.status
                        )}`}
                      >
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => approve(entry.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg"
                    >
                      Godkend
                    </button>

                    <button
                      onClick={() => unapprove(entry.id)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg"
                    >
                      Fortryd
                    </button>

                    <button
                      onClick={() => reject(entry.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      Afvis
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {entries.length === 0 && (
              <p className="text-gray-500">Ingen timer fundet.</p>
            )}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}