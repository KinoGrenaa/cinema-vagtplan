"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import type { Shift } from "../../../../../../shared/types";
import type { useSchedule } from "../data/useSchedule";
import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";
import {
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import {
  getShiftConfirmText,
  getShiftUserId,
} from "../../helpers/text/scheduleShiftText";

type ScheduleData = ReturnType<typeof useSchedule>;
type ConfirmDialog = ReturnType<typeof useConfirm>;
type InfoDialog = ReturnType<typeof useInfoModal>;

type UseScheduleShiftFormParams = {
  selectedDate: string;
  users: ScheduleData["users"];
  jobFunctions: ScheduleData["jobFunctions"];
  needsMasterCinemaSelection: boolean;
  showMissingActiveCinemaMessage: () => void;
  createShift: ScheduleData["createShift"];
  updateShift: ScheduleData["updateShift"];
  deleteShift: ScheduleData["deleteShift"];
  offerShiftTrade: ScheduleData["offerShiftTrade"];
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
};

const DEFAULT_START_HOUR = 14;
const DEFAULT_END_HOUR = 22;
const DEFAULT_DURATION_MINUTES =
  (DEFAULT_END_HOUR - DEFAULT_START_HOUR) * 60;
const SNAP_MINUTES = 15;
const LAST_START_MINUTE = 24 * 60 - SNAP_MINUTES;

function snapCreationMinutes(value: number) {
  return Math.max(
    0,
    Math.min(
      LAST_START_MINUTE,
      Math.round(value / SNAP_MINUTES) * SNAP_MINUTES,
    ),
  );
}

function getPresetShiftTimes(
  selectedDate: string,
  presetStartMinutes?: number,
) {
  if (presetStartMinutes === undefined) {
    return {
      startTime: `${selectedDate}T${String(
        DEFAULT_START_HOUR,
      ).padStart(2, "0")}:00`,
      endTime: `${selectedDate}T${String(
        DEFAULT_END_HOUR,
      ).padStart(2, "0")}:00`,
    };
  }

  const start = new Date(`${selectedDate}T00:00:00`);
  start.setMinutes(
    snapCreationMinutes(presetStartMinutes),
  );

  const end = new Date(start);
  end.setMinutes(
    end.getMinutes() + DEFAULT_DURATION_MINUTES,
  );

  return {
    startTime: toInputDateTime(start.toISOString()),
    endTime: toInputDateTime(end.toISOString()),
  };
}

export function useScheduleShiftForm({
  selectedDate,
  users,
  jobFunctions,
  needsMasterCinemaSelection,
  showMissingActiveCinemaMessage,
  createShift,
  updateShift,
  deleteShift,
  offerShiftTrade,
  confirmDialog,
  infoDialog,
}: UseScheduleShiftFormParams) {
  const [selectedShift, setSelectedShift] =
    useState<Shift | null>(null);
  const [showShiftFormModal, setShowShiftFormModal] =
    useState(false);
  const [startTime, setStartTime] = useState(
    `${selectedDate}T14:00`,
  );
  const [endTime, setEndTime] = useState(
    `${selectedDate}T22:00`,
  );
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(0);
  const [jobFunctionId, setJobFunctionId] = useState(0);

  useEffect(() => {
    if (
      userId !== 0 &&
      users.length > 0 &&
      !users.some((user) => user.id === userId)
    ) {
      setUserId(0);
    }
  }, [userId, users]);

  useEffect(() => {
    if (
      jobFunctionId !== 0 &&
      jobFunctions.length > 0 &&
      !jobFunctions.some(
        (jobFunction) => jobFunction.id === jobFunctionId,
      )
    ) {
      setJobFunctionId(0);
    }
  }, [jobFunctionId, jobFunctions]);

  function clearForm(
    presetJobFunctionId = 0,
    presetStartMinutes?: number,
  ) {
    const presetTimes = getPresetShiftTimes(
      selectedDate,
      presetStartMinutes,
    );

    setSelectedShift(null);
    setUserId(0);
    setJobFunctionId(presetJobFunctionId);
    setStartTime(presetTimes.startTime);
    setEndTime(presetTimes.endTime);
    setNote("");
  }

  function resetShiftFormForDate(nextDate: string) {
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function openCreateShiftModal(
    presetJobFunctionId = 0,
    presetStartMinutes?: number,
  ) {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    clearForm(
      presetJobFunctionId,
      presetStartMinutes,
    );
    setShowShiftFormModal(true);
  }

  function hideShiftFormModal() {
    setShowShiftFormModal(false);
  }

  function closeShiftFormModal() {
    clearForm();
    setShowShiftFormModal(false);
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    const body = {
      startTime:
        localDateTimeToISOString(startTime),
      endTime:
        localDateTimeToISOString(endTime),
      note,
      userId: userId > 0 ? userId : null,
      jobFunctionId,
    };

    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, body);
      } else {
        await createShift(body);
      }

      closeShiftFormModal();
    } catch (error) {
      infoDialog.showError(
        selectedShift
          ? "Vagten kunne ikke opdateres"
          : "Vagten kunne ikke oprettes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle gemmes.\nPrøv igen.",
      );
    }
  }

  function handleDelete() {
    if (!selectedShift) {
      return;
    }

    const shiftToDelete = selectedShift;

    confirmDialog.confirm({
      title: "Slet vagt",
      description: `Er du sikker på, at du vil slette denne vagt?\n\n${getShiftConfirmText(
        shiftToDelete,
      )}\n\nHandlingen kan ikke fortrydes.`,
      confirmText: "Slet vagt",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteShift(shiftToDelete.id);
          closeShiftFormModal();
          toast.success("Vagten er slettet");
        } catch (error) {
          infoDialog.showError(
            "Vagten kunne ikke slettes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagten skulle slettes.\nPrøv igen.",
          );
        }
      },
    });
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(
      toInputDateTime(shift.startTime),
    );
    setEndTime(
      toInputDateTime(shift.endTime),
    );
    setNote(shift.note || "");
    setUserId(
      getShiftUserId(shift) ?? 0,
    );
    setJobFunctionId(shift.jobFunctionId);
    setShowShiftFormModal(true);
  }

  function handleOfferTrade() {
    if (!selectedShift) {
      return;
    }

    if (!getShiftUserId(selectedShift)) {
      infoDialog.showError(
        "Vagten er ikke tildelt",
        "Vagten skal tildeles en medarbejder, før den kan sendes i byttepuljen.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Send vagt i byttepulje",
      description: `Er du sikker på, at du vil sende denne vagt i vagtpuljen?\n\n${getShiftConfirmText(
        selectedShift,
      )}`,
      confirmText: "Send i pulje",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await offerShiftTrade(selectedShift);
          toast.success(
            "Vagten er sendt i byttepuljen",
          );
        } catch (error) {
          infoDialog.showError(
            "Vagten kunne ikke sendes i byttepuljen",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagten skulle sendes i byttepuljen.\nPrøv igen.",
          );
        }
      },
    });
  }

  return {
    selectedShift,
    showShiftFormModal,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    note,
    setNote,
    userId,
    setUserId,
    jobFunctionId,
    setJobFunctionId,
    openCreateShiftModal,
    hideShiftFormModal,
    closeShiftFormModal,
    resetShiftFormForDate,
    handleSubmit,
    handleDelete,
    handleSelectShift,
    handleOfferTrade,
  };
}
