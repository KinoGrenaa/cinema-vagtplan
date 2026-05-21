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

export default function ShiftTradesPage() {
  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState("");

  const getHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }, []);

  const fetchTrades = useCallback(async () => {
    const response = await fetch(`${API_URL}/shift-trades`, {
      headers: getHeaders(),
    });

    const data = await response.json();
    setTrades(Array.isArray(data) ? data : []);
  }, [getHeaders]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchTrades();
  }, [fetchTrades]);

  useRealtimeShifts({
    onShiftTradesUpdated: fetchTrades,
    onShiftsUpdated: fetchTrades,
  });

  const poolTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter((trade) => {
      const isFutureShift = new Date(trade.shift.startTime) > new Date();

      return (
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== currentUser.id &&
        isFutureShift
      );
    });
  }, [trades, currentUser]);

  async function acceptTrade(trade: ShiftTrade) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      `Er du sikker på, at du vil acceptere vagten fra ${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}?`,
    );

    if (!confirmed) return;

    const response = await fetch(`${API_URL}/shift-trades/${trade.id}/accept`, {
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

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vagtpulje</h1>
        <p className="text-gray-600">
          Se åbne vagter som andre medarbejdere har lagt i puljen.
        </p>
      </div>

      <a
        href="/dashboard"
        className="inline-block bg-gray-200 px-4 py-2 rounded-lg"
      >
        Dashboard
      </a>

      {message && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          {message}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          Åbne vagter i puljen ({poolTrades.length})
        </h2>

        {poolTrades.map((trade) => (
          <div
            key={trade.id}
            className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
          >
            <div>
              <div className="flex gap-2 mb-2">
                <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                  Vagtpulje
                </span>

                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  Åben
                </span>
              </div>

              <h3 className="text-lg font-bold">{trade.shift.workType.name}</h3>

              <p>
                {new Date(trade.shift.startTime).toLocaleDateString("da-DK", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>

              <p>
                {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(trade.shift.endTime).toLocaleTimeString("da-DK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <p className="text-sm text-gray-600">
                Udbydes af:{" "}
                <strong>
                  {trade.offeredByUser.firstName} {trade.offeredByUser.lastName}
                </strong>
              </p>

              {trade.message && (
                <p className="bg-gray-100 rounded-lg p-3 text-sm">
                  Besked: {trade.message}
                </p>
              )}
            </div>

            <button
              onClick={() => acceptTrade(trade)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Accepter vagt
            </button>
          </div>
        ))}

        {poolTrades.length === 0 && (
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            Der er ingen åbne vagter i vagtpuljen lige nu.
          </div>
        )}
      </section>
    </main>
  );
}