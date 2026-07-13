"use client";

import type { Shift } from "../../../../../../shared/types";
import type { useSchedule } from "../data/useSchedule";
import type { useInfoModal } from "@/app/hooks/useInfoModal";
import { getShiftUserId } from "../../helpers/text/scheduleShiftText";
import {
  getMovedShiftTimes,
  getResizedShiftTimes,
} from "../../helpers/time/scheduleShiftTime";

type ScheduleData = ReturnType<typeof useSchedule>;
type InfoDialog = ReturnType<typeof useInfoModal>;

type UseScheduleShiftTimelineActionsParams = {
  selectedDate: string;
  updateShift: ScheduleData["updateShift"];
  infoDialog: InfoDialog;
};

export function useScheduleShiftTimelineActions({
  selectedDate,
  updateShift,
  infoDialog,
}: UseScheduleShiftTimelineActionsParams) {
  async function handleMoveShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) {
    const { newStart, newEnd } = getMovedShiftTimes({
      shift,
      selectedDate,
      newStartHour,
      newStartMinute,
    });

    try {
      await updateShift(shift.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: getShiftUserId(shift),
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Vagten kunne ikke flyttes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle flyttes. Prøv igen.",
      );
    }
  }

  async function handleChangeShiftUser(shift: Shift, newUserId: number | null) {
    try {
      await updateShift(shift.id, {
        startTime: shift.startTime,
        endTime: shift.endTime,
        note: shift.note,
        userId: newUserId,
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Medarbejder kunne ikke ændres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle tildeles en anden medarbejder. Prøv igen.",
      );
    }
  }

  async function handleResizeShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) {
    const { newStart, newEnd } = getResizedShiftTimes({
      shift,
      selectedDate,
      newStartHour,
      newStartMinute,
      newEndHour,
      newEndMinute,
    });

    try {
      await updateShift(shift.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: getShiftUserId(shift),
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Vagten kunne ikke ændres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtens tidspunkt skulle ændres. Prøv igen.",
      );
    }
  }

  return { handleMoveShift, handleChangeShiftUser, handleResizeShift };
}
