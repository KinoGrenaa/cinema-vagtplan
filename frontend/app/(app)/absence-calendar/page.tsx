"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import { apiFetch } from "@/app/lib/api";
import { dateToLocalMonthString, formatDateDK } from "@/app/utils/dateTime";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  user: User;
};

export default function AbsenceCalendarPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(
    dateToLocalMonthString(new Date()),
  );

  const fetchRequests = useCallback(async () => {
    try {
      const response = await apiFetch("/leave-requests");

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
    fetchRequests();
  }, [fetchRequests]);

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);

    const lastDay = new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;

      return `${selectedMonth}-${String(day).padStart(2, "0")}`;
    });
  }, [selectedMonth]);

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);

    date.setMonth(date.getMonth() + direction);

    setSelectedMonth(dateToLocalMonthString(date));
  }

  function requestIsOnDate(request: LeaveRequest, date: string) {
    const current = new Date(`${date}T12:00:00`);

    const start = new Date(request.startDate);

    const end = new Date(request.endDate);

    return current >= start && current <= end;
  }

  function getStatusStyle(status: LeaveRequest["status"]) {
    if (status === "APPROVED") {
      return "bg-green-100 text-green-800 border-green-300";
    }

    if (status === "REJECTED") {
      return "bg-red-100 text-red-800 border-red-300";
    }

    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  }

  return (
    <AdminGuard>
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Ferie/fraværskalender</h1>

              <p className="text-gray-500">
                Overblik over ferie, fridage og afventende ansøgninger.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Forrige
              </button>

              <div className="bg-black text-white px-4 py-2 rounded-lg">
                {selectedMonth}
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Næste
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-[900px]">
            {daysInMonth.map((date) => {
              const dayRequests = requests.filter(
                (request) =>
                  (request.status === "PENDING" ||
                    request.status === "APPROVED") &&
                  requestIsOnDate(request, date),
              );

              return (
                <div
                  key={date}
                  className="border rounded-xl p-3 min-h-32 bg-gray-50"
                >
                  <div className="font-bold mb-2">
                    {formatDateDK(`${date}T12:00:00`)}
                  </div>

                  <div className="space-y-2">
                    {dayRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`border rounded-lg p-2 text-xs ${getStatusStyle(
                          request.status,
                        )}`}
                      >
                        <div className="font-bold">
                          {request.user.firstName} {request.user.lastName}
                        </div>

                        <div>{request.status}</div>

                        {request.reason && (
                          <div className="mt-1 opacity-80">
                            {request.reason}
                          </div>
                        )}
                      </div>
                    ))}

                    {dayRequests.length === 0 && (
                      <div className="text-xs text-gray-400">Ingen fravær</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}
