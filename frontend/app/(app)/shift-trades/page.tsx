"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";

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
      color?: string | null;
    };
  };
};

function formatShiftDate(value: string) {
  return new Date(value).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShiftTime(startTime: string, endTime: string) {
  const start = new Date(startTime).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const end = new Date(endTime).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${start} - ${end}`;
}

export default function ShiftTradesPage() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const confirmModal = useConfirm();

  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/shift-trades");

      if (!response.ok) {
        setTrades([]);
        return;
      }

      const data = await response.json();
      setTrades(Array.isArray(data) ? data : []);
      const shiftsResponse = await apiFetch("/shifts");

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      } else {
        setShifts([]);
      }
    } catch (error) {
      console.error("Kunne ikke hente vagtbytter", error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useRealtimeShifts({
    onShiftTradesUpdated: fetchTrades,
    onShiftsUpdated: fetchTrades,
  });

  const poolTrades = useMemo(() => {
    if (!user) return [];

    return trades.filter((trade) => {
      const isFutureShift = new Date(trade.shift.startTime) > new Date();

      return (
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== user.id &&
        isFutureShift
      );
    });
  }, [trades, user]);

  const directTrades = useMemo(() => {
    if (!user) return [];

    return trades.filter((trade) => {
      const isFutureShift = new Date(trade.shift.startTime) > new Date();

      return (
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === user.id &&
        isFutureShift
      );
    });
  }, [trades, user]);

  const historyTrades = useMemo(() => {
    if (!user) return [];

    return trades.filter((trade) => {
      return (
        trade.status !== "OPEN" &&
        (trade.offeredByUserId === user.id ||
          trade.acceptedByUserId === user.id ||
          trade.targetUserId === user.id)
      );
    });
  }, [trades, user]);

  function hasShiftConflict(trade: ShiftTrade) {
    if (!user) return false;

    const tradeStart = new Date(trade.shift.startTime).getTime();
    const tradeEnd = new Date(trade.shift.endTime).getTime();

    return shifts.some((shift) => {
      if (shift.userId !== user.id) return false;
      if (shift.id === trade.shift.id) return false;

      const ownStart = new Date(shift.startTime).getTime();
      const ownEnd = new Date(shift.endTime).getTime();

      return tradeStart < ownEnd && tradeEnd > ownStart;
    });
  }

  function acceptTrade(trade: ShiftTrade) {
    if (!user) return;

    const offeredBy = `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`;
    const shiftInfo = `${trade.shift.workType.name} - ${formatShiftDate(
      trade.shift.startTime,
    )} kl. ${formatShiftTime(trade.shift.startTime, trade.shift.endTime)}`;

    confirmModal.confirm({
      title: "Accepter vagt",
      description: `Er du sikker på, at du vil acceptere denne vagt fra ${offeredBy}?\n\n${shiftInfo}`,
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${trade.id}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            acceptedByUserId: user.id,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setMessage(data?.message || "Kunne ikke acceptere vagten");
          return;
        }

        setMessage("Vagten er accepteret.");
        await fetchTrades();
      },
    });
  }

  function rejectTrade(trade: ShiftTrade) {
    const shiftInfo = `${trade.shift.workType.name} - ${formatShiftDate(
      trade.shift.startTime,
    )} kl. ${formatShiftTime(trade.shift.startTime, trade.shift.endTime)}`;

    confirmModal.confirm({
      title: "Afvis vagt",
      description: `Er du sikker på, at du vil afvise denne vagt?\n\n${shiftInfo}`,
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${trade.id}/reject`, {
          method: "PATCH",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setMessage(data?.message || "Kunne ikke afvise vagten");
          return;
        }

        setMessage("Vagten er afvist.");
        await fetchTrades();
      },
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Henter vagtbytter...
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Vagtpulje</h1>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Se åbne vagter som andre medarbejdere har lagt i puljen.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="rounded-xl bg-black px-4 py-2 text-center font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Dashboard
              </Link>
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                {message}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold">
              Direkte tilbud ({directTrades.length})
            </h2>

            <div className="space-y-4">
              {directTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onAccept={() => acceptTrade(trade)}
                  onReject={() => rejectTrade(trade)}
                  actionLabel="Accepter vagt"
                  acceptDisabled={hasShiftConflict(trade)}
                  acceptTooltip={
                    hasShiftConflict(trade)
                      ? "Du har allerede en vagt i dette tidsrum"
                      : undefined
                  }
                />
              ))}

              {directTrades.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400">
                  Du har ingen direkte vagtbytter lige nu.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold">
              Åbne vagter i puljen ({poolTrades.length})
            </h2>

            <div className="space-y-4">
              {poolTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onAccept={() => acceptTrade(trade)}
                  actionLabel="Accepter vagt"
                  acceptDisabled={hasShiftConflict(trade)}
                  acceptTooltip={
                    hasShiftConflict(trade)
                      ? "Du har allerede en vagt i dette tidsrum"
                      : undefined
                  }
                />
              ))}

              {poolTrades.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400">
                  Der er ingen åbne vagter i vagtpuljen lige nu.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold">
              Historik ({historyTrades.length})
            </h2>

            <div className="space-y-4">
              {historyTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white">
                      {trade.type === "POOL" ? "Vagtpulje" : "Direkte"}
                    </span>

                    <span className="rounded-full bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
                      {trade.status}
                    </span>
                  </div>

                  <div className="font-bold">{trade.shift.workType.name}</div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatShiftDate(trade.shift.startTime)} ·{" "}
                    {formatShiftTime(
                      trade.shift.startTime,
                      trade.shift.endTime,
                    )}
                  </div>
                </div>
              ))}

              {historyTrades.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400">
                  Ingen historik endnu.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        loading={confirmModal.loading}
        confirmText="Ja"
        cancelText="Nej"
        confirmVariant="success"
        onConfirm={confirmModal.handleConfirm}
        onCancel={confirmModal.handleCancel}
      />
    </>
  );
}

type TradeCardProps = {
  trade: ShiftTrade;
  actionLabel: string;
  onAccept: () => void;
  onReject?: () => void;
  acceptDisabled?: boolean;
  acceptTooltip?: string;
};

function TradeCard({
  trade,
  actionLabel,
  onAccept,
  onReject,
  acceptDisabled,
  acceptTooltip,
}: TradeCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
          {trade.type === "POOL" ? "Vagtpulje" : "Direkte"}
        </span>

        <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">
          Åben
        </span>
      </div>

      <h3 className="text-xl font-bold">{trade.shift.workType.name}</h3>

      <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <div>{formatShiftDate(trade.shift.startTime)}</div>
        <div>{formatShiftTime(trade.shift.startTime, trade.shift.endTime)}</div>
        <div>
          Udbydes af: {trade.offeredByUser.firstName}{" "}
          {trade.offeredByUser.lastName}
        </div>

        {trade.targetUser && (
          <div>
            Tilbudt til: {trade.targetUser.firstName}{" "}
            {trade.targetUser.lastName}
          </div>
        )}
      </div>

      {trade.message && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Besked: {trade.message}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptDisabled}
          title={acceptTooltip}
          className={`rounded-xl px-4 py-2 font-semibold transition ${
            acceptDisabled
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {actionLabel}
        </button>

        {onReject && (
          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Afvis vagt
          </button>
        )}
      </div>
    </div>
  );
}
