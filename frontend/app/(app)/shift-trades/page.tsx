"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";

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

type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  message?: string | null;
  offeredByUserId: number;
  acceptedByUserId?: number | null;
  targetUserId?: number | null;
  offeredByUser: User;
  targetUser?: User | null;
  acceptedByUser?: User | null;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: User;
    workType: {
      name: string;
      color: string;
    };
  };
};
type CinemaSettings = {
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
};
export default function ShiftTradesPage() {
  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [message, setMessage] = useState("");

  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings | null>(
    null,
  );

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchTrades = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/shift-trades`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        const user = JSON.parse(savedUser);

        const cinemaResponse = await fetch(
          `${API_URL}/cinemas/${user.cinemaId}`,
          {
            headers: getHeaders(),
          },
        );

        const cinemaData = await cinemaResponse.json();

        setCinemaSettings(cinemaData);
      }

      setTrades(Array.isArray(data) ? data : []);
    } catch {
      setTrades([]);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchTrades();
  }, [fetchTrades]);

  useRealtimeShifts({
    onShiftTradesUpdated: fetchTrades,
  });

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    if (!window.confirm("Er du sikker på, at du vil acceptere denne vagt?")) {
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
    await fetchTrades();
  }

  async function rejectTrade(tradeId: number) {
    if (!window.confirm("Er du sikker på, at du vil afvise denne vagt?")) {
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
    await fetchTrades();
  }

  const openTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (trade.status !== "OPEN") {
        return false;
      }

      if (
        trade.type === "POOL" &&
        cinemaSettings &&
        !cinemaSettings.allowShiftTradePool
      ) {
        return false;
      }

      if (
        trade.type === "DIRECT" &&
        cinemaSettings &&
        !cinemaSettings.allowShiftTradeDirect
      ) {
        return false;
      }

      return true;
    });
  }, [trades, cinemaSettings]);

  const historyTrades = useMemo(() => {
    return trades.filter((trade) => trade.status !== "OPEN");
  }, [trades]);

  function getStatusBadge(status: string) {
    if (status === "ACCEPTED") {
      return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
    }

    if (status === "REJECTED") {
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
    }

    if (status === "CANCELLED") {
      return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }

    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
  }

  function getStatusText(status: string) {
    if (status === "ACCEPTED") return "Accepteret";

    if (status === "REJECTED") return "Afvist";

    if (status === "CANCELLED") return "Annulleret";

    return "Åben";
  }

  function canAcceptTrade(trade: ShiftTrade) {
    if (!currentUser) return false;

    if (trade.offeredByUserId === currentUser.id) return false;

    if (trade.type === "DIRECT" && trade.targetUserId !== currentUser.id) {
      return false;
    }

    return true;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Vagtbytter</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Se åbne vagter og håndter bytteaftaler.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            {message}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Åbne vagter</h2>

            <span className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-semibold text-white">
              {openTrades.length}
            </span>
          </div>

          {openTrades.map((trade) => (
            <div
              key={trade.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className="h-2 w-full"
                style={{
                  backgroundColor: trade.shift.workType.color,
                }}
              />

              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                          trade.status,
                        )}`}
                      >
                        {getStatusText(trade.status)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                          trade.type === "POOL" ? "bg-green-600" : "bg-blue-600"
                        }`}
                      >
                        {trade.type === "POOL"
                          ? "Fælles pulje"
                          : "Direkte bytte"}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold">
                      {trade.shift.workType.name}
                    </h3>

                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {new Date(trade.shift.startTime).toLocaleDateString(
                        "da-DK",
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        },
                      )}
                    </p>

                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(trade.shift.startTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                      {" - "}
                      {new Date(trade.shift.endTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm dark:bg-gray-950">
                    <div>
                      Fra:{" "}
                      <strong>
                        {trade.offeredByUser.firstName}{" "}
                        {trade.offeredByUser.lastName}
                      </strong>
                    </div>

                    {trade.type === "DIRECT" && trade.targetUser && (
                      <div className="mt-1">
                        Til:{" "}
                        <strong>
                          {trade.targetUser.firstName}{" "}
                          {trade.targetUser.lastName}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {trade.message && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                    {trade.message}
                  </div>
                )}

                {canAcceptTrade(trade) && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => acceptTrade(trade.id)}
                      className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
                    >
                      Accepter vagt
                    </button>

                    <button
                      onClick={() => rejectTrade(trade.id)}
                      className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700"
                    >
                      Afvis vagt
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {openTrades.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ingen åbne vagter lige nu.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Historik</h2>

            <span className="rounded-full bg-gray-600 px-3 py-1 text-sm font-semibold text-white">
              {historyTrades.length}
            </span>
          </div>

          {historyTrades.map((trade) => (
            <div
              key={trade.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                        trade.status,
                      )}`}
                    >
                      {getStatusText(trade.status)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold">
                    {trade.shift.workType.name}
                  </h3>

                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {new Date(trade.shift.startTime).toLocaleDateString(
                      "da-DK",
                    )}
                  </p>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Fra {trade.offeredByUser.firstName}{" "}
                  {trade.offeredByUser.lastName}
                </div>
              </div>
            </div>
          ))}

          {historyTrades.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ingen historik endnu.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
