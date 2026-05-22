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

    socket.on("connect", () => {
      console.log("Realtime connected:", socket.id);
    });

    socket.on("shiftsUpdated", () => {
      onShiftsUpdated?.();

      if (enableToasts) {
        showInfo("Vagtplanen er opdateret");
      }
    });

    socket.on("shiftTradesUpdated", () => {
      onShiftTradesUpdated?.();

      if (enableToasts) {
        showInfo("Vagtbytte er opdateret");
      }
    });

    socket.on("shiftAccepted", () => {
      onShiftTradesUpdated?.();
      onShiftsUpdated?.();

      if (enableToasts) {
        showSuccess("En vagt er blevet accepteret");
      }
    });

    socket.on("newShiftTrade", () => {
      onShiftTradesUpdated?.();

      if (enableToasts) {
        showInfo("Ny vagt i vagtpuljen");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onShiftsUpdated, onShiftTradesUpdated, enableToasts]);
}