"use client";

import { useCallback } from "react";
import type { Shift } from "../../../shared/types";

export type ScheduleLeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    firstName: string;
    lastName: string;
  };
};

type UseScheduleHelpersParams = {
  selectedDate: string;
  setSelectedShift: (shift: Shift | null) => void;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setNote: (value: string) => void;
  setFormError: (value: string) => void;
  setShowClockModal: (value: boolean) => void;
  setClockShiftId: (value: number | null) => void;
  setClockInTime: (value: string) => void;
  setClockOutTime: (value: string) => void;
  setClockNote: (value: string) => void;
};

export function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function localDateTimeToISOString(value: string) {
  return new Date(value).toISOString();
}

export function useScheduleHelpers({
  selectedDate,
  setSelectedShift,
  setStartTime,
  setEndTime,
  setNote,
  setFormError,
  setShowClockModal,
  setClockShiftId,
  setClockInTime,
  setClockOutTime,
  setClockNote,
}: UseScheduleHelpersParams) {
  const leaveIsOnSelectedDate = useCallback(
    (request: ScheduleLeaveRequest) => {
      const current = new Date(`${selectedDate}T12:00:00`);
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      return current >= start && current <= end;
    },
    [selectedDate],
  );

  const clearForm = useCallback(() => {
    setSelectedShift(null);
    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);
    setNote("");
    setFormError("");
  }, [
    selectedDate,
    setEndTime,
    setFormError,
    setNote,
    setSelectedShift,
    setStartTime,
  ]);

  const resetClockModal = useCallback(() => {
    setShowClockModal(false);
    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setClockNote("");
  }, [
    setClockInTime,
    setClockNote,
    setClockOutTime,
    setClockShiftId,
    setShowClockModal,
  ]);

  return {
    clearForm,
    leaveIsOnSelectedDate,
    localDateTimeToISOString,
    resetClockModal,
    toInputDateTime,
  };
}

export default useScheduleHelpers;
