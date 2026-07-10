import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useApi } from "@/app/hooks/useApi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import { useAuth } from "@/app/providers/AuthProvider";

import type { ShiftTrade } from "../../helpers/core/shiftTradeTypes";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseShiftTradesDataArgs = {
  infoDialog: InfoDialog;
};

export function useShiftTradesData({ infoDialog }: UseShiftTradesDataArgs) {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const showErrorRef = useRef(infoDialog.showError);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsMasterCinemaSelection, setNeedsMasterCinemaSelection] =
    useState(false);

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
      setNeedsMasterCinemaSelection(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const masterCinemaQuery = getMasterCinemaQuery();
      const shouldSelectMasterCinema =
        user.role === "MASTER" && !user.cinemaId && !masterCinemaQuery;

      setNeedsMasterCinemaSelection(shouldSelectMasterCinema);

      if (shouldSelectMasterCinema) {
        setTrades([]);
        setShifts([]);
        return;
      }

      const response = await apiFetch(`/shift-trades${masterCinemaQuery}`);

      if (!response.ok) {
        setTrades([]);
        showErrorRef.current(
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
      showErrorRef.current(
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

  return {
    user: user ?? null,
    apiFetch,
    loading,
    message,
    setMessage,
    fetchTrades,
    directTrades,
    poolTrades,
    historyTrades,
    hasShiftConflict,
    needsMasterCinemaSelection,
  };
}
