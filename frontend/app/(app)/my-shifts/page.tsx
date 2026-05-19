"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  note?: string | null;
  userId: number;
  workType: {
    name: string;
    color: string;
  };
};

export default function MyShiftsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-05");

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchShifts = useCallback(async () => {
    const response = await fetch("http://localhost:3001/shifts", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data: Shift[] = await response.json();
    setShifts(data);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchShifts();
  }, [fetchShifts]);

  const myMonthShifts = useMemo(() => {
    if (!currentUser) return [];

    return shifts.filter((shift) => {
      const shiftMonth = shift.startTime.slice(0, 7);

      return shift.userId === currentUser.id && shiftMonth === selectedMonth;
    });
  }, [shifts, currentUser, selectedMonth]);

  const totalHours = useMemo(() => {
    return myMonthShifts.reduce((total, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return total + hours;
    }, 0);
  }, [myMonthShifts]);

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);

    setSelectedMonth(date.toISOString().slice(0, 7));
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mine vagter</h1>
            <p className="text-gray-500">Oversigt over dine vagter pr. måned</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              Forrige måned
            </button>

            <div className="bg-black text-white px-4 py-2 rounded-lg">
              {selectedMonth}
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              Næste måned
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">Samlet timer</h2>

        <div className="text-4xl font-bold">{totalHours.toFixed(2)} timer</div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Vagter</h2>

        <div className="space-y-3">
          {myMonthShifts.map((shift) => (
            <div
              key={shift.id}
              className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <div className="font-bold text-lg">
                  {new Date(shift.startTime).toLocaleDateString("da-DK", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </div>

                <div className="text-sm text-gray-600">
                  {new Date(shift.startTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(shift.endTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div className="text-sm mt-1">{shift.workType.name}</div>

                {shift.note && (
                  <div className="text-sm text-gray-500 mt-1">
                    Note: {shift.note}
                  </div>
                )}
              </div>

              <div
                className="px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: shift.workType.color }}
              >
                {(
                  (new Date(shift.endTime).getTime() -
                    new Date(shift.startTime).getTime()) /
                  1000 /
                  60 /
                  60
                ).toFixed(2)}{" "}
                timer
              </div>
            </div>
          ))}

          {myMonthShifts.length === 0 && (
            <div className="text-gray-500">Ingen vagter i denne måned.</div>
          )}
        </div>
      </div>
    </main>
  );
}
