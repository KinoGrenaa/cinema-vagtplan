"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

type RealtimeShiftOptions = {
  onShiftsUpdated?: () => void;
  onShiftTradesUpdated?: () => void;
};

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    socket = io(apiUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  return socket;
}

export function useRealtimeShifts({
  onShiftsUpdated,
  onShiftTradesUpdated,
}: RealtimeShiftOptions) {
  useEffect(() => {
    const s = getSocket();

    const handleShiftsUpdated = () => {
      onShiftsUpdated?.();
    };

    const handleShiftTradesUpdated = () => {
      onShiftTradesUpdated?.();
    };

    s.on("shiftsUpdated", handleShiftsUpdated);
    s.on("shiftTradesUpdated", handleShiftTradesUpdated);

    return () => {
      s.off("shiftsUpdated", handleShiftsUpdated);
      s.off("shiftTradesUpdated", handleShiftTradesUpdated);
    };
  }, [onShiftsUpdated, onShiftTradesUpdated]);
}