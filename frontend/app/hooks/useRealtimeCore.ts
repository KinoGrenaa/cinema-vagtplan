"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../providers/AuthProvider";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type UseRealtimeCoreInput = {
  onShiftUpdated?: () => void;
  onShiftTradeUpdated?: () => void;
  onNotification?: () => void;
  onMessage?: () => void;
  onTimeEntry?: () => void;
};

export function useRealtimeCore(input: UseRealtimeCoreInput) {
  const { token, user } = useAuth();

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],

      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.emit("joinCinema", {
      cinemaId: user.cinemaId,
    });

    socket.emit("joinUser", {
      userId: user.id,
    });

    socket.on("shiftUpdated", () => {
      input.onShiftUpdated?.();
    });

    socket.on("shiftTradeUpdated", () => {
      input.onShiftTradeUpdated?.();
    });

    socket.on("notificationCreated", () => {
      input.onNotification?.();
    });

    socket.on("messageCreated", () => {
      input.onMessage?.();
    });

    socket.on("timeEntryUpdated", () => {
      input.onTimeEntry?.();
    });

    socket.on("connect", () => {
      console.log("Realtime connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Realtime disconnected");
    });

    socket.on("shiftsUpdated", () => {
      input.onShiftUpdated?.();
    });

    socket.on("shiftTradesUpdated", () => {
      input.onShiftTradeUpdated?.();
    });

    socket.on("shiftAccepted", (payload) => {
      input.onShiftAccepted?.(payload);
      input.onShiftTradeUpdated?.();
      input.onShiftUpdated?.();
    });

    socket.on("newShiftTrade", (payload) => {
      input.onNewShiftTrade?.(payload);
      input.onShiftTradeUpdated?.();
    });

    socket.on("newDirectShiftTrade", (payload) => {
      input.onNewDirectShiftTrade?.(payload);
      input.onShiftTradeUpdated?.();
    });

    socket.on("shiftRejected", (payload) => {
      input.onShiftRejected?.(payload);
      input.onShiftTradeUpdated?.();
    });

    return () => {
      socket.disconnect();
    };
  }, [
    token,
    user,

    input.onShiftUpdated,
    input.onShiftTradeUpdated,
    input.onNotification,
    input.onMessage,
    input.onTimeEntry,
  ]);

  return {
    socket: socketRef.current,
  };
}
