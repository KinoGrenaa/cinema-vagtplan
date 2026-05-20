"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [message, setMessage] = useState("");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchShifts = useCallback(async () => {
    const response = await fetch("http://localhost:3001/shifts", {
      headers: getHeaders(),
    });

    const data = await response.json();

    setShifts(
      Array.isArray(data)
        ? data
        : Array.isArray(data.shifts)
          ? data.shifts
          : [],
    );
  }, []);

  const fetchUsers = useCallback(async () => {
    const response = await fetch("http://localhost:3001/users", {
      headers: getHeaders(),
    });

    const data = await response.json();

    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchShifts();
    fetchUsers();
  }, [fetchShifts, fetchUsers]);

  async function sendToPool(shiftId: number) {
    if (!currentUser) return;

    const response = await fetch("http://localhost:3001/shift-trades", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        shiftId,
        offeredByUserId: currentUser.id,
        cinemaId: currentUser.cinemaId,
        type: "POOL",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke sende vagten til puljen");
      return;
    }

    setMessage("Vagten er sendt til fælles pulje.");
    fetchShifts();
  }

  async function sendDirect(shiftId: number, targetUserId: number) {
    if (!currentUser || !targetUserId) return;

    const response = await fetch("http://localhost:3001/shift-trades", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        shiftId,
        offeredByUserId: currentUser.id,
        cinemaId: currentUser.cinemaId,
        type: "DIRECT",
        targetUserId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke sende vagten til kollegaen");
      return;
    }

    setMessage("Vagten er sendt direkte til kollegaen.");
    fetchShifts();
  }

  const myMonthShifts = useMemo(() => {
    if (!currentUser) return [];

    return shifts.filter((shift) => {
      const shiftMonth = shift.startTime.slice(0, 7);

      return (
        shift.userId === currentUser.id &&
        shiftMonth === selectedMonth
      );
    });
  }, [shifts, currentUser, selectedMonth]);

  const totalHours = useMemo(() => {
    return myMonthShifts.reduce((total, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return (
        total +
        (end.getTime() - start.getTime()) /
          1000 /
          60 /
          60
      );
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
            <h1 className="text-3xl font-bold">
              Mine vagter
            </h1>

            <p className="text-gray-500">
              Oversigt over dine vagter pr. måned
            </p>
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

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Samlet timer
        </h2>

        <div className="text-4xl font-bold">
          {totalHours.toFixed(2)} timer
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          Vagter
        </h2>

        <div className="space-y-3">
          {myMonthShifts.map((shift) => {
            const canTrade =
              new Date(shift.startTime) > new Date();

            return (
              <div
                key={shift.id}
                className="border rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-bold text-lg">
                      {new Date(
                        shift.startTime,
                      ).toLocaleDateString("da-DK", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </div>

                    <div className="text-sm text-gray-600">
                      {new Date(
                        shift.startTime,
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(
                        shift.endTime,
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <div className="text-sm mt-1">
                      {shift.workType.name}
                    </div>

                    {shift.note && (
                      <div className="text-sm text-gray-500 mt-1">
                        Note: {shift.note}
                      </div>
                    )}
                  </div>

                  <div
                    className="px-4 py-2 rounded-lg text-white text-sm"
                    style={{
                      backgroundColor:
                        shift.workType.color,
                    }}
                  >
                    {(
                      (new Date(
                        shift.endTime,
                      ).getTime() -
                        new Date(
                          shift.startTime,
                        ).getTime()) /
                      1000 /
                      60 /
                      60
                    ).toFixed(2)}{" "}
                    timer
                  </div>
                </div>

                {canTrade && (
                  <div className="flex flex-col md:flex-row gap-2 mt-4">
                    <button
                      onClick={() =>
                        sendToPool(shift.id)
                      }
                      className="bg-black text-white px-4 py-2 rounded-lg"
                    >
                      Send til fælles pulje
                    </button>

                    <select
                      className="border rounded-lg px-4 py-2"
                      defaultValue=""
                      onChange={(e) =>
                        sendDirect(
                          shift.id,
                          Number(e.target.value),
                        )
                      }
                    >
                      <option value="" disabled>
                        Send direkte til kollega
                      </option>

                      {users
                        .filter(
                          (user) =>
                            user.id !== currentUser?.id,
                        )
                        .map((user) => (
                          <option
                            key={user.id}
                            value={user.id}
                          >
                            {user.firstName}{" "}
                            {user.lastName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}

          {myMonthShifts.length === 0 && (
            <div className="text-gray-500">
              Ingen vagter i denne måned.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}