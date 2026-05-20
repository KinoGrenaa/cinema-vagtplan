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

type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  shiftId: number;
  offeredByUserId: number;
  targetUserId?: number | null;

  offeredByUser?: User | null;

  targetUser?: User | null;

  shift?: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  };
};

export default function MyShiftsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);

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
        : []
    );
  }, []);

  const fetchUsers = useCallback(async () => {
    const response = await fetch("http://localhost:3001/users", {
      headers: getHeaders(),
    });

    const data = await response.json();

    setUsers(Array.isArray(data) ? data : []);
  }, []);

  const fetchShiftTrades = useCallback(async () => {
    const response = await fetch("http://localhost:3001/shift-trades", {
      headers: getHeaders(),
    });

    const data = await response.json();

    setShiftTrades(Array.isArray(data) ? data : []);
  }, []);

  async function refreshData() {
    await Promise.all([
      fetchShifts(),
      fetchUsers(),
      fetchShiftTrades(),
    ]);
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    refreshData();
  }, [fetchShifts, fetchUsers, fetchShiftTrades]);

  function getOpenTradeForShift(shiftId: number) {
    return shiftTrades.find(
      (trade) =>
        trade.shiftId === shiftId &&
        trade.status === "OPEN"
    );
  }

  const directTradesForMe = useMemo(() => {
    if (!currentUser) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === currentUser.id
    );
  }, [shiftTrades, currentUser]);

  async function sendToPool(shiftId: number) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "Er du sikker på, at du vil sende denne vagt i vagtpuljen?"
    );

    if (!confirmed) return;

    const response = await fetch(
      "http://localhost:3001/shift-trades",
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          shiftId,
          offeredByUserId: currentUser.id,
          cinemaId: currentUser.cinemaId,
          type: "POOL",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message ||
          "Kunne ikke sende vagten til puljen"
      );

      return;
    }

    setMessage("Vagten er sendt til fælles pulje.");

    await refreshData();
  }

  async function sendDirect(
    shiftId: number,
    targetUserId: number
  ) {
    if (!currentUser || !targetUserId) return;

    const targetUser = users.find(
      (user) => user.id === targetUserId
    );

    const targetName = targetUser
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : "den valgte kollega";

    const confirmed = window.confirm(
      `Er du sikker på, at du vil sende denne vagt direkte til ${targetName}?`
    );

    if (!confirmed) return;

    const response = await fetch(
      "http://localhost:3001/shift-trades",
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          shiftId,
          offeredByUserId: currentUser.id,
          cinemaId: currentUser.cinemaId,
          type: "DIRECT",
          targetUserId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message ||
          "Kunne ikke sende vagten til kollegaen"
      );

      return;
    }

    setMessage(
      `Vagten er sendt direkte til ${targetName}.`
    );

    await refreshData();
  }

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "Er du sikker på, at du vil acceptere denne vagt?"
    );

    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/accept`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          acceptedByUserId: currentUser.id,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message ||
          "Kunne ikke acceptere vagten"
      );

      return;
    }

    setMessage("Vagten er accepteret.");

    await refreshData();
  }

  async function rejectTrade(tradeId: number) {
    const confirmed = window.confirm(
      "Er du sikker på, at du vil afvise denne vagt?"
    );

    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/reject`,
      {
        method: "PATCH",
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message ||
          "Kunne ikke afvise vagten"
      );

      return;
    }

    setMessage("Vagten er afvist.");

    await refreshData();
  }

  async function cancelTrade(tradeId: number) {
    const confirmed = window.confirm(
      "Er du sikker på, at du vil annullere udsendelsen af denne vagt?"
    );

    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/cancel`,
      {
        method: "PATCH",
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message ||
          "Kunne ikke annullere udsendelsen"
      );

      return;
    }

    setMessage("Udsendelsen er annulleret.");

    await refreshData();
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
    const date = new Date(
      `${selectedMonth}-01T12:00:00`
    );

    date.setMonth(date.getMonth() + direction);

    setSelectedMonth(
      date.toISOString().slice(0, 7)
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Mine vagter
        </h1>

        <p className="text-gray-600">
          Oversigt over dine vagter pr. måned
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => changeMonth(-1)}
          className="bg-gray-200 px-4 py-2 rounded-lg"
        >
          Forrige måned
        </button>

        <span className="font-bold">
          {selectedMonth}
        </span>

        <button
          onClick={() => changeMonth(1)}
          className="bg-gray-200 px-4 py-2 rounded-lg"
        >
          Næste måned
        </button>
      </div>

      {message && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          {message}
        </div>
      )}

      {directTradesForMe.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">
            Direkte tilbudte vagter
          </h2>

          {directTradesForMe.map((trade) => (
            <div
              key={trade.id}
              className="bg-blue-50 border border-blue-300 rounded-xl p-4 shadow-sm space-y-3"
            >
              <div>
                <p className="font-bold">
                  Du har fået tilbudt en vagt direkte
                </p>

                <p>
                  Fra:{" "}
                  {trade.offeredByUser
                    ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                    : "Ukendt"}
                </p>

                {trade.shift && (
                  <>
                    <p>
                      {new Date(
                        trade.shift.startTime
                      ).toLocaleDateString("da-DK", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>

                    <p>
                      {new Date(
                        trade.shift.startTime
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(
                        trade.shift.endTime
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    <p>
                      {trade.shift.workType?.name}
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    acceptTrade(trade.id)
                  }
                  className="bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  Accepter vagt
                </button>

                <button
                  onClick={() =>
                    rejectTrade(trade.id)
                  }
                  className="bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Afvis vagt
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-bold">
          Samlet timer
        </h2>

        <p>
          {totalHours.toFixed(2)} timer
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          Vagter
        </h2>

        {myMonthShifts.map((shift) => {
          const canTrade =
            new Date(shift.startTime) >
            new Date();

          const openTrade =
            getOpenTradeForShift(shift.id);

          const isSent = Boolean(openTrade);

          return (
            <div
              key={shift.id}
              className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
            >
              <div>
                <h3 className="font-bold">
                  {new Date(
                    shift.startTime
                  ).toLocaleDateString("da-DK", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </h3>

                <p>
                  {new Date(
                    shift.startTime
                  ).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(
                    shift.endTime
                  ).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <p>
                  {shift.workType.name}
                </p>

                {shift.note && (
                  <p className="text-sm">
                    Note: {shift.note}
                  </p>
                )}

                <p className="text-sm text-gray-600">
                  {(
                    (new Date(
                      shift.endTime
                    ).getTime() -
                      new Date(
                        shift.startTime
                      ).getTime()) /
                    1000 /
                    60 /
                    60
                  ).toFixed(2)}{" "}
                  timer
                </p>
              </div>

              {openTrade && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 text-sm">
                  {openTrade.type ===
                    "POOL" && (
                    <p>
                      Denne vagt er sendt i vagtpuljen.
                    </p>
                  )}

                  {openTrade.type ===
                    "DIRECT" && (
                    <p>
                      Denne vagt er sendt direkte til{" "}
                      <strong>
                        {openTrade.targetUser
                          ? `${openTrade.targetUser.firstName} ${openTrade.targetUser.lastName}`
                          : "en kollega"}
                      </strong>
                      .
                    </p>
                  )}
                </div>
              )}

              {canTrade && (
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() =>
                      sendToPool(shift.id)
                    }
                    disabled={isSent}
                    className={
                      isSent
                        ? "bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
                        : "bg-black text-white px-4 py-2 rounded-lg"
                    }
                  >
                    Send til fælles pulje
                  </button>

                  <select
                    disabled={isSent}
                    defaultValue=""
                    onChange={(e) => {
                      const targetUserId =
                        Number(
                          e.target.value
                        );

                      if (
                        targetUserId
                      ) {
                        sendDirect(
                          shift.id,
                          targetUserId
                        );

                        e.target.value =
                          "";
                      }
                    }}
                    className={
                      isSent
                        ? "border rounded-lg p-2 bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "border rounded-lg p-2"
                    }
                  >
                    <option value="">
                      Send direkte til kollega
                    </option>

                    {users
                      .filter(
                        (user) =>
                          user.id !==
                          currentUser?.id
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

                  {openTrade &&
                    openTrade.offeredByUserId ===
                      currentUser?.id && (
                      <button
                        onClick={() =>
                          cancelTrade(
                            openTrade.id
                          )
                        }
                        className="bg-red-600 text-white px-4 py-2 rounded-lg"
                      >
                        Annuller udsendelse
                      </button>
                    )}
                </div>
              )}
            </div>
          );
        })}

        {myMonthShifts.length === 0 && (
          <p>
            Ingen vagter i denne måned.
          </p>
        )}
      </section>
    </main>
  );
}