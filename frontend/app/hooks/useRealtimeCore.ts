"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../providers/AuthProvider";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type RealtimeShiftTradePayload = {
  acceptedByUserId?: number | string | null;
  offeredByUserId?: number | string | null;
  rejectedByUserId?: number | string | null;
  targetUserId?: number | string | null;
  shift?: {
    startTime?: string;
    endTime?: string;
    workType?: {
      name?: string;
    };
  } | null;
  offeredByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  rejectedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
};

type UseRealtimeCoreInput = {
  onShiftUpdated?: () => void;
  onShiftTradeUpdated?: () => void;
  onNotification?: () => void;
  onMessage?: () => void;
  onTimeEntry?: () => void;
  onStaffingRequestUpdated?: () => void;
  onShiftAccepted?: (payload: RealtimeShiftTradePayload) => void;
  onNewShiftTrade?: (payload: RealtimeShiftTradePayload) => void;
  onNewDirectShiftTrade?: (payload: RealtimeShiftTradePayload) => void;
  onShiftRejected?: (payload: RealtimeShiftTradePayload) => void;
};

export function useRealtimeCore(input: UseRealtimeCoreInput) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.emit("joinCinema", user.cinemaId);
    socket.emit("joinUser", user.id);

    const triggerShiftUpdated = () => {
      input.onShiftUpdated?.();
    };

    const triggerShiftTradeUpdated = () => {
      input.onShiftTradeUpdated?.();
    };

    const triggerStaffingRequestUpdated = () => {
      input.onStaffingRequestUpdated?.();
    };

    socket.on("connect", () => {
      console.log("Realtime connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Realtime disconnected");
    });

    socket.on("shiftUpdated", triggerShiftUpdated);
    socket.on("shiftsUpdated", triggerShiftUpdated);

    socket.on("shiftTradeUpdated", triggerShiftTradeUpdated);
    socket.on("shiftTradesUpdated", triggerShiftTradeUpdated);

    socket.on("staffingRequestsUpdated", triggerStaffingRequestUpdated);
    socket.on("staffingRequestAccepted", triggerStaffingRequestUpdated);
    socket.on("staffingRequestRejected", triggerStaffingRequestUpdated);
    socket.on("staffingRequestCancelled", triggerStaffingRequestUpdated);

    socket.on("notificationCreated", () => {
      input.onNotification?.();
    });

    socket.on("messageCreated", () => {
      input.onMessage?.();
    });

    socket.on("timeEntryUpdated", () => {
      input.onTimeEntry?.();
    });

    socket.on("shiftAccepted", (payload: RealtimeShiftTradePayload) => {
      input.onShiftAccepted?.(payload);
      triggerShiftTradeUpdated();
      triggerShiftUpdated();
    });

    socket.on("newShiftTrade", (payload: RealtimeShiftTradePayload) => {
      input.onNewShiftTrade?.(payload);
      triggerShiftTradeUpdated();
    });

    socket.on("newDirectShiftTrade", (payload: RealtimeShiftTradePayload) => {
      input.onNewDirectShiftTrade?.(payload);
      triggerShiftTradeUpdated();
    });

    socket.on("shiftRejected", (payload: RealtimeShiftTradePayload) => {
      input.onShiftRejected?.(payload);
      triggerShiftTradeUpdated();
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    token,
    user,
    input.onShiftUpdated,
    input.onShiftTradeUpdated,
    input.onNotification,
    input.onMessage,
    input.onTimeEntry,
    input.onStaffingRequestUpdated,
    input.onShiftAccepted,
    input.onNewShiftTrade,
    input.onNewDirectShiftTrade,
    input.onShiftRejected,
  ]);

  return {
    socket: socketRef.current,
  };
}
