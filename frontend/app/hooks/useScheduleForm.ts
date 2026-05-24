"use client";

import { useState } from "react";

export function useScheduleForm() {
  const [selectedShift, setSelectedShift] = useState<any>(null);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(
    null,
  );

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [note, setNote] = useState("");

  const [formError, setFormError] = useState("");

  const [showClockModal, setShowClockModal] = useState(false);

  const [clockShiftId, setClockShiftId] = useState<number | null>(null);

  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

  function resetShiftForm() {
    setSelectedShift(null);
    setSelectedUserId(null);
    setSelectedWorkTypeId(null);
    setStartTime("");
    setEndTime("");
    setNote("");
    setFormError("");
  }

  function resetClockForm() {
    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setClockNote("");
  }

  function openClockModal(shiftId?: number) {
    if (shiftId) {
      setClockShiftId(shiftId);
    }

    setShowClockModal(true);
  }

  function closeClockModal() {
    setShowClockModal(false);
  }

  return {
    selectedShift,
    setSelectedShift,

    selectedUserId,
    setSelectedUserId,

    selectedWorkTypeId,
    setSelectedWorkTypeId,

    startTime,
    setStartTime,

    endTime,
    setEndTime,

    note,
    setNote,

    formError,
    setFormError,

    showClockModal,
    setShowClockModal,

    clockShiftId,
    setClockShiftId,

    clockInTime,
    setClockInTime,

    clockOutTime,
    setClockOutTime,

    clockNote,
    setClockNote,

    resetShiftForm,
    resetClockForm,

    openClockModal,
    closeClockModal,
  };
}

export default useScheduleForm;
