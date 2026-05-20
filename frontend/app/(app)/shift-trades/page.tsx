"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type ShiftTrade = {
  id: number;
  type: "POOL" | "DIRECT";
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  message?: string | null;
  offeredByUserId: number;
  acceptedByUserId?: number | null;
  targetUserId?: number | null;
  offeredByUser: {
    firstName: string;
    lastName: string;
  };
  acceptedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  targetUser?: {
    firstName: string;
    lastName: string;
  } | null;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: {
      firstName: string;
      lastName: string;
    };
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

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchTrades = useCallback(async () => {
    const response = await fetch("http://localhost:3001/shift-trades", {
      headers: getHeaders(),
    });

    const data = await response.json();
    setTrades(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchTrades();
  }, [fetchTrades]);

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/accept`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          acceptedByUserId: currentUser.id,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke acceptere vagten");
      return;
    }

    setMessage("Vagten er accepteret.");
    await fetchTrades();
  }

  async function rejectTrade(tradeId: number) {
    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/reject`,
      {
        method: "PATCH",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.message || "Kunne ikke afvise vagten");
      return;
    }

    setMessage("Vagten er afvist.");
    await fetchTrades();
  }

  async function cancelTrade(tradeId: number) {
    const response = await fetch(
      `http://localhost:3001/shift-trades/${tradeId}/cancel`,
      {
        method: "PATCH",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.message || "Kunne ikke annullere vagtbyttet");
      return;
    }

    setMessage("Vagtbyttet er annulleret.");
    await fetchTrades();
  }

  function hasConflict(trade: ShiftTrade) {
    if (!currentUser) return false;

    const tradeStart = new Date(trade.shift.startTime).getTime();
    const tradeEnd = new Date(trade.shift.endTime).getTime();

    return trades.some((otherTrade) => {
      if (otherTrade.shift.id === trade.shift.id) return false;
      if (otherTrade.shift.userId !== currentUser.id) return false;

      const otherStart = new Date(otherTrade.shift.startTime).getTime();
      const otherEnd = new Date(otherTrade.shift.endTime).getTime();

      return otherStart < tradeEnd && otherEnd > tradeStart;
    });
  }

  const poolTrades = useMemo(() => {
    return trades.filter(
      (trade) => trade.type === "POOL" && trade.status === "OPEN",
    );
  }, [trades]);

  const directTradesForMe = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.type === "DIRECT" &&
        trade.status === "OPEN" &&
        trade.targetUserId === currentUser.id,
    );
  }, [trades, currentUser]);

  const myActiveTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.offeredByUserId === currentUser.id,
    );
  }, [trades, currentUser]);

  function renderTradeCard(
    trade: ShiftTrade,
    options: {
      canAccept?: boolean;
      canReject?: boolean;
      canCancel?: boolean;
    },
  ) {
    const conflict = hasConflict(trade);
    const isOwnTrade = currentUser?.id === trade.offeredByUserId;
    const canAccept =
      options.canAccept && !conflict && !isOwnTrade && trade.status === "OPEN";

    return (
      <div
        key={trade.id}
        className={`border rounded-xl p-4 ${
          conflict ? "bg-gray-100 opacity-70" : "bg-white"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="font-bold text-lg">{trade.shift.workType.name}</div>

            <div className="text-sm text-gray-600 mt-1">
              {new Date(trade.shift.startTime).toLocaleDateString("da-DK", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              kl.{" "}
              {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" - "}
              {new Date(trade.shift.endTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="text-sm mt-2">
              Udbydes af:{" "}
              <strong>
                {trade.offeredByUser.firstName} {trade.offeredByUser.lastName}
              </strong>
            </div>

            {trade.type === "DIRECT" && trade.targetUser && (
              <div className="text-sm mt-1">
                Sendt til:{" "}
                <strong>
                  {trade.targetUser.firstName} {trade.targetUser.lastName}
                </strong>
              </div>
            )}

            {trade.message && (
              <div className="text-sm text-gray-500 mt-2">
                Besked: {trade.message}
              </div>
            )}

            {conflict && (
              <div className="text-sm text-red-600 mt-3">
                Du har allerede vagt i dette tidsrum
              </div>
            )}

            {isOwnTrade && (
              <div className="text-sm text-gray-500 mt-3">
                Dette er din egen udsendte vagt
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-40">
            {canAccept && (
              <button
  onClick={() => {
    const confirmed = window.confirm(
  `Er du sikker på, at du vil acceptere vagten:\n\n${trade.shift.workType.name}\n${new Date(
    trade.shift.startTime,
  ).toLocaleDateString("da-DK")} kl. ${new Date(
    trade.shift.startTime,
  ).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(trade.shift.endTime).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  })}?`,
);

    if (confirmed) {
      acceptTrade(trade.id);
    }
  }}
  className="bg-green-600 text-white px-4 py-2 rounded-lg"
>
  Accepter vagt
</button>
            )}

            {options.canReject && (
              <button
                onClick={() => rejectTrade(trade.id)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Afvis
              </button>
            )}

            {options.canCancel && (
              <button
                onClick={() => cancelTrade(trade.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Annuller
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Vagtbytte</h1>
        <p className="text-gray-500">
          Se fælles pulje, direkte tilbud og dine egne udsendte vagter.
        </p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          {message}
        </div>
      )}

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Fælles pulje</h2>

        <div className="space-y-3">
          {poolTrades.map((trade) =>
            renderTradeCard(trade, {
              canAccept: true,
            }),
          )}

          {poolTrades.length === 0 && (
            <div className="text-gray-500">
              Der er ingen åbne vagter i fælles pulje.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Direkte tilbud til mig</h2>

        <div className="space-y-3">
          {directTradesForMe.map((trade) =>
            renderTradeCard(trade, {
              canAccept: true,
              canReject: true,
            }),
          )}

          {directTradesForMe.length === 0 && (
            <div className="text-gray-500">
              Du har ingen direkte vagt-tilbud.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Mine aktive bytter</h2>

        <div className="space-y-3">
          {myActiveTrades.map((trade) =>
            renderTradeCard(trade, {
              canCancel: true,
            }),
          )}

          {myActiveTrades.length === 0 && (
            <div className="text-gray-500">
              Du har ingen aktive udsendte vagter.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}