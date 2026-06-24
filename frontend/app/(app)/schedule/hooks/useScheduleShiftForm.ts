"use client";

import { useEffect, useState } from "react";
import type { Shift } from "../../../../../shared/types";
import type { useSchedule } from "../../../hooks/useSchedule";
import { localDateTimeToISOString, toInputDateTime } from "@/app/utils/dateTime";
import { getShiftConfirmText, getShiftUserId } from "../helpers/scheduleShiftText";
import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";
import { toast } from "sonner";

type ScheduleData = ReturnType<typeof useSchedule>;
type ConfirmDialog = ReturnType<typeof useConfirm>;
type InfoDialog = ReturnType<typeof useInfoModal>;

type UseScheduleShiftFormParams = {
  selectedDate: string;
  users: ScheduleData["users"];
  workTypes: ScheduleData["workTypes"];
  needsMasterCinemaSelection: boolean;
  showMissingActiveCinemaMessage: () => void;
  createShift: ScheduleData["createShift"];
  updateShift: ScheduleData["updateShift"];
  deleteShift: ScheduleData["deleteShift"];
  offerShiftTrade: ScheduleData["offerShiftTrade"];
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
};

export function useScheduleShiftForm({
  selectedDate,
  users,
  workTypes,
  needsMasterCinemaSelection,
  showMissingActiveCinemaMessage,
  createShift,
  updateShift,
  deleteShift,
  offerShiftTrade,
  confirmDialog,
  infoDialog,
}: UseScheduleShiftFormParams) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftFormModal, setShowShiftFormModal] = useState(false);

  const [startTime, setStartTime] = useState(`${selectedDate}T14:00`);
  const [endTime, setEndTime] = useState(`${selectedDate}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(0);
  const [workTypeId, setWorkTypeId] = useState(0);

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
      workTypeId !== 0 &&
      workTypes.length > 0 &&
      !workTypes.some((workType) => workType.id === workTypeId)
    ) {
      setWorkTypeId(0);
    }
  }, [workTypeId, workTypes]);

  function clearForm() {
    setSelectedShift(null);

    setUserId(0);
    setWorkTypeId(0);

    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);

    setNote("");
  }

  function resetShiftFormForDate(nextDate: string) {
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function openCreateShiftModal() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    clearForm();
    setShowShiftFormModal(true);
  }

  function hideShiftFormModal() {
    setShowShiftFormModal(false);
  }

  function closeShiftFormModal() {
    clearForm();
    setShowShiftFormModal(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = {
      startTime: localDateTimeToISOString(startTime),
      endTime: localDateTimeToISOString(endTime),
      note,
      userId: userId > 0 ? userId : null,
      workTypeId,
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
          : "Der opstod en fejl, da vagten skulle gemmes. Prøv igen.",
      );
    }
  }

  function handleDelete() {
    if (!selectedShift) return;

    const shiftToDelete = selectedShift;

    confirmDialog.confirm({
      title: "Slet vagt",
      description: `Er du sikker på, at du vil slette denne vagt?

${getShiftConfirmText(shiftToDelete)}

Handlingen kan ikke fortrydes.`,
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
              : "Der opstod en fejl, da vagten skulle slettes. Prøv igen.",
          );
        }
      },
    });
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(toInputDateTime(shift.startTime));
    setEndTime(toInputDateTime(shift.endTime));
    setNote(shift.note || "");
    setUserId(getShiftUserId(shift) ?? 0);
    setWorkTypeId(shift.workTypeId);
    setShowShiftFormModal(true);
  }

  function handleOfferTrade() {
    if (!selectedShift) return;

    if (!getShiftUserId(selectedShift)) {
      infoDialog.showError(
        "Vagten er ikke tildelt",
        "Vagten skal tildeles en medarbejder, før den kan sendes i byttepuljen.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Send vagt i byttepulje",
      description: `Er du sikker på, at du vil sende denne vagt i vagtpuljen?

${getShiftConfirmText(selectedShift)}`,
      confirmText: "Send i pulje",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await offerShiftTrade(selectedShift);
          toast.success("Vagten er sendt i byttepuljen");
        } catch (error) {
          infoDialog.showError(
            "Vagten kunne ikke sendes i byttepuljen",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagten skulle sendes i byttepuljen. Prøv igen.",
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
    workTypeId,
    setWorkTypeId,
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
