"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalMonthString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

type CinemaSettings = {
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
};

export default function MyShiftsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return dateToLocalMonthString(new Date());
  });
  const [message, setMessage] = useState("");
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings | null>(
    null,
  );

  const getHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }, []);

  const fetchShifts = useCallback(async () => {
    const response = await fetch(`${API_URL}/shifts`, {
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
  }, [getHeaders]);

  const fetchUsers = useCallback(async () => {
    const response = await fetch(`${API_URL}/users`, {
      headers: getHeaders(),
    });

    const data = await response.json();
    setUsers(Array.isArray(data) ? data : []);
  }, [getHeaders]);

  const fetchShiftTrades = useCallback(async () => {
    const response = await fetch(`${API_URL}/shift-trades`, {
      headers: getHeaders(),
    });

    const data = await response.json();
    setShiftTrades(Array.isArray(data) ? data : []);
  }, [getHeaders]);

  const fetchCinemaSettings = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    const user = JSON.parse(savedUser);

    const response = await fetch(`${API_URL}/cinemas/${user.cinemaId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) return;

    const data = await response.json();

    setCinemaSettings({
      allowShiftTradePool: Boolean(data.allowShiftTradePool),
      allowShiftTradeDirect: Boolean(data.allowShiftTradeDirect),
    });
  }, [getHeaders]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchShifts(),
      fetchUsers(),
      fetchShiftTrades(),
      fetchCinemaSettings(),
    ]);
  }, [fetchShifts, fetchUsers, fetchShiftTrades, fetchCinemaSettings]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    refreshData();
  }, [refreshData]);

  useRealtimeShifts({
    onShiftsUpdated: refreshData,
    onShiftTradesUpdated: refreshData,
  });

  function getOpenTradeForShift(shiftId: number) {
    return shiftTrades.find(
      (trade) => trade.shiftId === shiftId && trade.status === "OPEN",
    );
  }

  const directTradesForMe = useMemo(() => {
    if (!currentUser) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === currentUser.id,
    );
  }, [shiftTrades, currentUser]);

  const myMonthShifts = useMemo(() => {
    if (!currentUser) return [];

    return shifts.filter((shift) => {
      const shiftMonth = dateToLocalMonthString(new Date(shift.startTime));
      return shift.userId === currentUser.id && shiftMonth === selectedMonth;
    });
  }, [shifts, currentUser, selectedMonth]);

  const totalHours = useMemo(() => {
    return myMonthShifts.reduce((total, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    }, 0);
  }, [myMonthShifts]);

  function formatShiftDate(value: string) {
    return formatDateDK(value);
  }

  function formatShiftTimeRange(shift: { startTime: string; endTime: string }) {
    return `${formatTimeDK(shift.startTime)} - ${formatTimeDK(shift.endTime)}`;
  }

  function getShiftWorkTypeName(shift: {
    workType?: {
      name: string;
    };
  }) {
    return shift.workType?.name ?? "Ukendt arbejdstype";
  }

  function getShiftConfirmText(shift: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  }) {
    return `${getShiftWorkTypeName(shift)}
${formatShiftDate(shift.startTime)}
${formatShiftTimeRange(shift)}`;
  }

  async function sendToPool(shiftId: number) {
    if (!currentUser) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      setMessage("Vagten blev ikke fundet");
      return;
    }

    if (
      !window.confirm(
        `Er du sikker på, at du vil sende denne vagt i vagtpuljen?

${getShiftConfirmText(shift)}`,
      )
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades`, {
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
    await refreshData();
  }

  async function sendDirect(shiftId: number, targetUserId: number) {
    if (!currentUser || !targetUserId) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      setMessage("Vagten blev ikke fundet");
      return;
    }

    const targetUser = users.find((user) => user.id === targetUserId);

    const targetName = targetUser
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : "den valgte kollega";

    if (
      !window.confirm(
        `Er du sikker på, at du vil sende denne vagt direkte til ${targetName}?

${getShiftConfirmText(shift)}`,
      )
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades`, {
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

    setMessage(`Vagten er sendt direkte til ${targetName}.`);
    await refreshData();
  }

  function getTradeShift(tradeId: number) {
    const trade = shiftTrades.find((item) => item.id === tradeId);

    return trade?.shift ?? null;
  }

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    const shift = getTradeShift(tradeId);

    if (!shift) {
      setMessage("Vagten blev ikke fundet");
      return;
    }

    if (
      !window.confirm(
        `Er du sikker på, at du vil acceptere denne vagt?

${getShiftConfirmText(shift)}`,
      )
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades/${tradeId}/accept`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        acceptedByUserId: currentUser.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke acceptere vagten");
      return;
    }

    setMessage("Vagten er accepteret.");
    await refreshData();
  }

  async function rejectTrade(tradeId: number) {
    const shift = getTradeShift(tradeId);

    if (!shift) {
      setMessage("Vagten blev ikke fundet");
      return;
    }

    if (
      !window.confirm(
        `Er du sikker på, at du vil afvise denne vagt?

${getShiftConfirmText(shift)}`,
      )
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades/${tradeId}/reject`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke afvise vagten");
      return;
    }

    setMessage("Vagten er afvist.");
    await refreshData();
  }

  async function cancelTrade(tradeId: number) {
    if (
      !window.confirm(
        "Er du sikker på, at du vil annullere udsendelsen af denne vagt?",
      )
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades/${tradeId}/cancel`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke annullere udsendelsen");
      return;
    }

    setMessage("Udsendelsen er annulleret.");
    await refreshData();
  }

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);
    setSelectedMonth(dateToLocalMonthString(date));
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Mine vagter</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Oversigt over dine vagter pr. måned.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Forrige måned
          </button>

          <span className="rounded-xl bg-gray-100 px-4 py-2 font-bold dark:bg-gray-950">
            {selectedMonth}
          </span>

          <button
            onClick={() => changeMonth(1)}
            className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Næste måned
          </button>
        </div>

        {message && (
          <div className="rounded-xl border border-yellow-300 bg-yellow-100 p-4 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
            {message}
          </div>
        )}

        {directTradesForMe.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Direkte tilbudte vagter</h2>

            {directTradesForMe.map((trade) => (
              <div
                key={trade.id}
                className="rounded-2xl border border-blue-300 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/40"
              >
                <p className="font-bold">Du har fået tilbudt en vagt direkte</p>

                <p className="mt-1 text-gray-700 dark:text-gray-300">
                  Fra:{" "}
                  {trade.offeredByUser
                    ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                    : "Ukendt"}
                </p>

                {trade.shift && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-white/70 p-3 text-sm dark:border-blue-900 dark:bg-gray-950/50">
                    <p>
                      {new Date(trade.shift.startTime).toLocaleDateString(
                        "da-DK",
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        },
                      )}
                    </p>

                    <p>
                      {new Date(trade.shift.startTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      -{" "}
                      {new Date(trade.shift.endTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>

                    <p>{trade.shift.workType?.name}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => acceptTrade(trade.id)}
                    className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                  >
                    Accepter vagt
                  </button>

                  <button
                    onClick={() => rejectTrade(trade.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                  >
                    Afvis vagt
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold">Samlet timer</h2>
          <p className="mt-2 text-4xl font-bold">{totalHours.toFixed(2)}</p>
          <p className="text-gray-500 dark:text-gray-400">
            timer i valgt måned
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Vagter</h2>

          {myMonthShifts.map((shift) => {
            const canTrade = new Date(shift.startTime) > new Date();
            const openTrade = getOpenTradeForShift(shift.id);
            const isSent = Boolean(openTrade);

            return (
              <div
                key={shift.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: shift.workType.color }}
                />

                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-xl font-bold">
                      {new Date(shift.startTime).toLocaleDateString("da-DK", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </h3>

                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      {new Date(shift.startTime).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(shift.endTime).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    <p className="font-medium">{shift.workType.name}</p>

                    {shift.note && (
                      <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-950">
                        Note: {shift.note}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {(
                        (new Date(shift.endTime).getTime() -
                          new Date(shift.startTime).getTime()) /
                        1000 /
                        60 /
                        60
                      ).toFixed(2)}{" "}
                      timer
                    </p>
                  </div>

                  {openTrade && (
                    <div className="rounded-xl border border-orange-300 bg-orange-100 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/40">
                      {openTrade.type === "POOL" && (
                        <p>Denne vagt er sendt i vagtpuljen.</p>
                      )}

                      {openTrade.type === "DIRECT" && (
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
                    <div className="flex flex-wrap items-center gap-3">
                      {cinemaSettings?.allowShiftTradePool ? (
                        <button
                          onClick={() => sendToPool(shift.id)}
                          disabled={isSent}
                          className={
                            isSent
                              ? "cursor-not-allowed rounded-xl bg-gray-300 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              : "rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                          }
                        >
                          Send til fælles pulje
                        </button>
                      ) : (
                        <button
                          disabled
                          title="Vagtpulje er slået fra i biografindstillinger"
                          className="cursor-not-allowed rounded-xl bg-gray-300 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        >
                          Vagtpulje deaktiveret
                        </button>
                      )}

                      <select
                        disabled={
                          isSent || !cinemaSettings?.allowShiftTradeDirect
                        }
                        defaultValue=""
                        onChange={(e) => {
                          const targetUserId = Number(e.target.value);

                          if (targetUserId) {
                            sendDirect(shift.id, targetUserId);
                            e.target.value = "";
                          }
                        }}
                        className={
                          isSent || !cinemaSettings?.allowShiftTradeDirect
                            ? "cursor-not-allowed rounded-xl border border-gray-300 bg-gray-200 p-2 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            : "rounded-xl border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        }
                      >
                        <option value="">
                          {cinemaSettings?.allowShiftTradeDirect
                            ? "Send direkte til kollega"
                            : "Direkte vagtbytte deaktiveret"}
                        </option>

                        {users
                          .filter((user) => user.id !== currentUser?.id)
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                      </select>

                      {openTrade &&
                        openTrade.offeredByUserId === currentUser?.id && (
                          <button
                            onClick={() => cancelTrade(openTrade.id)}
                            className="rounded-xl bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                          >
                            Annuller udsendelse
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {myMonthShifts.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ingen vagter i denne måned.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
