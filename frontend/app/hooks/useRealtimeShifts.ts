"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { showInfo, showSuccess } from "@/app/lib/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type UseRealtimeShiftsProps = {
  onShiftsUpdated?: () => void;
  onShiftTradesUpdated?: () => void;
  enableToasts?: boolean;
};

export function useRealtimeShifts({
  onShiftsUpdated,
  onShiftTradesUpdated,
  enableToasts = true,
}: UseRealtimeShiftsProps) {
  useEffect(() => {
    console.log("useRealtimeShifts hook starter");

    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    const getCurrentUser = () => {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    };

    const formatShiftText = (trade: any) => {
      const start = trade.shift?.startTime
        ? new Date(trade.shift.startTime)
        : null;

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
    };

    socket.on("connect", () => {
      console.log("Realtime connected:", socket.id);
    });

    socket.on("shiftsUpdated", () => {
      onShiftsUpdated?.();
    });

    socket.on("shiftTradesUpdated", () => {
      onShiftTradesUpdated?.();
    });

    socket.on("shiftAccepted", (trade) => {
      onShiftTradesUpdated?.();
      onShiftsUpdated?.();

      const currentUser = getCurrentUser();

      if (
        enableToasts &&
        currentUser &&
        Number(trade.acceptedByUserId) !== Number(currentUser.id)
      ) {
        showSuccess(`En vagt er blevet accepteret: ${formatShiftText(trade)}`);
      }
    });

    socket.on("newShiftTrade", (trade) => {
      onShiftTradesUpdated?.();

      const currentUser = getCurrentUser();

      if (
        enableToasts &&
        currentUser &&
        Number(trade.offeredByUserId) !== Number(currentUser.id)
      ) {
        showInfo(`Ny vagt i vagtpuljen: ${formatShiftText(trade)}`);
      }
    });

    socket.on("newDirectShiftTrade", (trade) => {
      onShiftTradesUpdated?.();

      const currentUser = getCurrentUser();

      if (
        enableToasts &&
        currentUser &&
        Number(trade.targetUserId) === Number(currentUser.id)
      ) {
        const sender = trade.offeredByUser
          ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
          : "En kollega";

        showInfo(`${sender} har tilbudt dig vagten ${formatShiftText(trade)}`);
      }
    });

    socket.on("shiftRejected", (trade) => {
      onShiftTradesUpdated?.();

      const currentUser = getCurrentUser();

      if (
        enableToasts &&
        currentUser &&
        Number(trade.offeredByUserId) === Number(currentUser.id)
      ) {
        const rejectedBy = trade.rejectedByUser
          ? `${trade.rejectedByUser.firstName} ${trade.rejectedByUser.lastName}`
          : "En bruger";

        showInfo(`${rejectedBy} afviste vagten ${formatShiftText(trade)}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onShiftsUpdated, onShiftTradesUpdated, enableToasts]);
}