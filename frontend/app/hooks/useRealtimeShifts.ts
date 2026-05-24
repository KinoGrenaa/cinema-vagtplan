"use client";

import { useCallback } from "react";
import { showInfo, showSuccess } from "@/app/lib/toast";
import { useAuth } from "../providers/AuthProvider";
import { useRealtimeCore } from "./useRealtimeCore";

type UseRealtimeShiftsProps = {
  onShiftsUpdated?: () => void;
  onShiftTradesUpdated?: () => void;
  enableToasts?: boolean;
};

type ShiftTradeEvent = {
  acceptedByUserId?: number;
  offeredByUserId?: number;
  rejectedByUserId?: number;
  targetUserId?: number;
  shift?: {
    startTime?: string;
    endTime?: string;
    workType?: {
      name?: string;
    };
  };
  offeredByUser?: {
    firstName: string;
    lastName: string;
  };
  rejectedByUser?: {
    firstName: string;
    lastName: string;
  };
};

function formatShiftText(trade: ShiftTradeEvent) {
  const start = trade.shift?.startTime ? new Date(trade.shift.startTime) : null;

  const end = trade.shift?.endTime ? new Date(trade.shift.endTime) : null;

  const dateText = start
    ? start.toLocaleDateString("da-DK", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
    : "";

  const timeText =
    start && end
      ? `${start.toLocaleTimeString("da-DK", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${end.toLocaleTimeString("da-DK", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";

  const workType = trade.shift?.workType?.name
    ? ` (${trade.shift.workType.name})`
    : "";

  return `${dateText} ${timeText}${workType}`.trim();
}

export function useRealtimeShifts({
  onShiftsUpdated,
  onShiftTradesUpdated,
  enableToasts = true,
}: UseRealtimeShiftsProps) {
  const { user } = useAuth();

  const handleShiftAccepted = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();
      onShiftsUpdated?.();

      if (
        enableToasts &&
        user &&
        Number(trade.acceptedByUserId) !== Number(user.id)
      ) {
        showSuccess(`En vagt er blevet accepteret: ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, onShiftsUpdated, user],
  );

  const handleNewShiftTrade = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (
        enableToasts &&
        user &&
        Number(trade.offeredByUserId) !== Number(user.id)
      ) {
        showInfo(`Ny vagt i vagtpuljen: ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  const handleNewDirectShiftTrade = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (
        enableToasts &&
        user &&
        Number(trade.targetUserId) === Number(user.id)
      ) {
        const sender = trade.offeredByUser
          ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
          : "En kollega";

        showInfo(`${sender} har tilbudt dig vagten ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  const handleShiftRejected = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (
        enableToasts &&
        user &&
        Number(trade.offeredByUserId) === Number(user.id)
      ) {
        const rejectedBy = trade.rejectedByUser
          ? `${trade.rejectedByUser.firstName} ${trade.rejectedByUser.lastName}`
          : "En bruger";

        showInfo(`${rejectedBy} afviste vagten ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  useRealtimeCore({
    onShiftUpdated: onShiftsUpdated,
    onShiftTradeUpdated: onShiftTradesUpdated,
    onShiftAccepted: handleShiftAccepted,
    onNewShiftTrade: handleNewShiftTrade,
    onNewDirectShiftTrade: handleNewDirectShiftTrade,
    onShiftRejected: handleShiftRejected,
  });
}
