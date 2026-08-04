"use client";

import { useCallback } from "react";
import { showInfo, showSuccess } from "@/app/lib/toast";
import { useAuth } from "../providers/AuthProvider";
import { useRealtimeCore } from "./useRealtimeCore";

type UseRealtimeShiftsProps = {
  onShiftsUpdated?: () => void;
  onShiftTradesUpdated?: () => void;
  onStaffingRequestsUpdated?: () => void;
  enableToasts?: boolean;
};

type RealtimeShiftTradeUser = {
  firstName: string;
  lastName: string;
};

type RealtimeShiftTradeShift = {
  startTime?: string;
  endTime?: string;
  jobFunction?: {
    name?: string;
  };
};

type ShiftTradeEvent = {
  acceptedByUserId?: number | string | null;
  offeredByUserId?: number | string | null;
  rejectedByUserId?: number | string | null;
  targetUserId?: number | string | null;
  shift?: RealtimeShiftTradeShift | null;
  offeredByUser?: RealtimeShiftTradeUser | null;
  rejectedByUser?: RealtimeShiftTradeUser | null;
};

function isSameUser(
  leftUserId?: number | string | null,
  rightUserId?: number | string | null,
) {
  if (!leftUserId || !rightUserId) return false;

  return Number(leftUserId) === Number(rightUserId);
}

function formatUserName(user?: RealtimeShiftTradeUser | null) {
  if (!user) return null;

  return `${user.firstName} ${user.lastName}`.trim();
}

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

  const jobFunction = trade.shift?.jobFunction?.name
    ? ` (${trade.shift.jobFunction.name})`
    : "";

  return `${dateText} ${timeText}${jobFunction}`.trim();
}

export function useRealtimeShifts({
  onShiftsUpdated,
  onShiftTradesUpdated,
  onStaffingRequestsUpdated,
  enableToasts = true,
}: UseRealtimeShiftsProps) {
  const { user } = useAuth();

  const handleStaffingRequestsUpdated = useCallback(() => {
    onStaffingRequestsUpdated?.();
    onShiftsUpdated?.();
  }, [onShiftsUpdated, onStaffingRequestsUpdated]);

  const handleShiftAccepted = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();
      onShiftsUpdated?.();

      if (
        enableToasts &&
        user &&
        !isSameUser(trade.acceptedByUserId, user.id)
      ) {
        showSuccess(`En vagt er blevet accepteret: ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, onShiftsUpdated, user],
  );

  const handleNewShiftTrade = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (enableToasts && user && !isSameUser(trade.offeredByUserId, user.id)) {
        showInfo(`Ny vagt i vagtpuljen: ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  const handleNewDirectShiftTrade = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (enableToasts && user && isSameUser(trade.targetUserId, user.id)) {
        const sender = formatUserName(trade.offeredByUser) || "En kollega";

        showInfo(`${sender} har tilbudt dig vagten ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  const handleShiftRejected = useCallback(
    (trade: ShiftTradeEvent) => {
      onShiftTradesUpdated?.();

      if (enableToasts && user && isSameUser(trade.offeredByUserId, user.id)) {
        const rejectedBy = formatUserName(trade.rejectedByUser) || "En bruger";

        showInfo(`${rejectedBy} afviste vagten ${formatShiftText(trade)}`);
      }
    },
    [enableToasts, onShiftTradesUpdated, user],
  );

  useRealtimeCore({
    onShiftUpdated: onShiftsUpdated,
    onShiftTradeUpdated: onShiftTradesUpdated,
    onStaffingRequestUpdated: handleStaffingRequestsUpdated,
    onShiftAccepted: handleShiftAccepted,
    onNewShiftTrade: handleNewShiftTrade,
    onNewDirectShiftTrade: handleNewDirectShiftTrade,
    onShiftRejected: handleShiftRejected,
  });
}
