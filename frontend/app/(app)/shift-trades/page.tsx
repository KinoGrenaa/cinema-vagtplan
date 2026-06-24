"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import ShiftTradesHeader from "./components/ShiftTradesHeader";
import ShiftTradesHistorySection from "./components/ShiftTradesHistorySection";
import ShiftTradesOpenSection from "./components/ShiftTradesOpenSection";
import { formatShiftDate, formatShiftTime } from "./helpers/shiftTradeHelpers";
import type { ShiftTrade } from "./helpers/shiftTradeTypes";

export default function ShiftTradesPage() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const confirmModal = useConfirm();
  const infoDialog = useInfoModal();

  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const getMasterCinemaQuery = useCallback(() => {
    if (typeof window === "undefined") return "";
    if (user?.role !== "MASTER" || user.cinemaId) return "";

    const selectedCinemaId = window.localStorage.getItem(
      "masterSelectedCinemaId",
    );

    return selectedCinemaId
      ? `?cinemaId=${encodeURIComponent(selectedCinemaId)}`
      : "";
  }, [user]);

  const fetchTrades = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setShifts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const masterCinemaQuery = getMasterCinemaQuery();

      if (user.role === "MASTER" && !user.cinemaId && !masterCinemaQuery) {
        setTrades([]);
        setShifts([]);
        return;
      }

      const response = await apiFetch(`/shift-trades${masterCinemaQuery}`);

      if (!response.ok) {
        setTrades([]);

        infoDialog.showError(
          "Kunne ikke hente vagtbytter",
          "Der opstod en fejl, da vagtbytter skulle hentes. Prøv igen.",
        );

        return;
      }

      const data = await response.json();
      setTrades(Array.isArray(data) ? data : []);
      const shiftsResponse = await apiFetch(`/shifts${masterCinemaQuery}`);

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      } else {
        setShifts([]);
      }
    } catch {
      setTrades([]);

      infoDialog.showError(
        "Kunne ikke hente vagtbytter",
        "Der opstod en fejl, da vagtbytter skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, getMasterCinemaQuery, user]);

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
      title: "Acceptér vagt",
      description: `Er du sikker på, at du vil acceptere denne vagt fra ${offeredBy}?

${shiftInfo}`,
      confirmText: "Acceptér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${trade.id}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            acceptedByUserId: user.id,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          infoDialog.showError(
            "Kunne ikke acceptere vagt",
            data?.message || "Vagten kunne ikke accepteres. Prøv igen.",
          );
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
      description: `Er du sikker på, at du vil afvise denne vagt?

${shiftInfo}`,
      confirmText: "Afvis",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${trade.id}/reject`, {
          method: "PATCH",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          infoDialog.showError(
            "Kunne ikke afvise vagt",
            data?.message || "Vagten kunne ikke afvises. Prøv igen.",
          );
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
          <ShiftTradesHeader message={message} />

          <ShiftTradesOpenSection
            title="Direkte tilbud"
            trades={directTrades}
            emptyText="Du har ingen direkte vagtbytter lige nu."
            onAccept={acceptTrade}
            onReject={rejectTrade}
            hasShiftConflict={hasShiftConflict}
          />

          <ShiftTradesOpenSection
            title="Åbne vagter i puljen"
            trades={poolTrades}
            emptyText="Der er ingen åbne vagter i vagtpuljen lige nu."
            onAccept={acceptTrade}
            hasShiftConflict={hasShiftConflict}
          />

          <ShiftTradesHistorySection trades={historyTrades} />
        </div>
      </main>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmVariant={confirmModal.confirmVariant}
        loading={confirmModal.loading}
        onConfirm={confirmModal.handleConfirm}
        onCancel={confirmModal.handleCancel}
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
