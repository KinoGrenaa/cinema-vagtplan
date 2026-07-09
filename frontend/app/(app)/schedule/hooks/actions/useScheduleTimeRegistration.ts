import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import type { Shift } from "../../../../../../shared/types";
import { getShiftsForTimeRegistration } from "../../helpers/derived/scheduleDerivedData";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type TimeEntriesForRegistration = Parameters<
  typeof getShiftsForTimeRegistration
>[1];

type OpenTimeEntry = {
  shiftId?: number | null;
  clockIn: string;
  shift?: {
    id: number;
    startTime: string;
    endTime: string;
    workType?: { name: string };
  } | null;
} | null;

type SubmitManualTimeEntry = (payload: {
  shiftId: number | null;
  clockIn: string;
  clockOut: string;
  note: string;
}) => Promise<void>;

type UseScheduleTimeRegistrationOptions = {
  selectedDate: string;
  shifts: Shift[];
  timeEntries: TimeEntriesForRegistration;
  currentUser: unknown;
  currentUserId?: number;
  openTimeEntry: OpenTimeEntry;
  needsMasterCinemaSelection: boolean;
  showMissingActiveCinemaMessage: () => void;
  infoDialog: InfoDialog;
  clockIn: (
    shiftId: number,
    clockInTime: string,
    note: string,
  ) => Promise<void>;
  clockOut: (clockOutTime: string, note: string) => Promise<void>;
  submitManualTimeEntry: SubmitManualTimeEntry;
};

const requireNoteOnTimeDeviation = true;

export function useScheduleTimeRegistration({
  selectedDate,
  shifts,
  timeEntries,
  currentUser,
  currentUserId,
  openTimeEntry,
  needsMasterCinemaSelection,
  showMissingActiveCinemaMessage,
  infoDialog,
  clockIn,
  clockOut,
  submitManualTimeEntry,
}: UseScheduleTimeRegistrationOptions) {
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");
  const [showManualTimeModal, setShowManualTimeModal] = useState(false);
  const [manualClockInTime, setManualClockInTime] = useState(
    `${selectedDate}T14:00`,
  );
  const [manualClockOutTime, setManualClockOutTime] = useState(
    `${selectedDate}T22:00`,
  );
  const [manualNote, setManualNote] = useState("");

  const shiftsForTimeRegistration = useMemo(
    () => getShiftsForTimeRegistration(shifts, timeEntries, currentUserId),
    [currentUserId, shifts, timeEntries],
  );

  const selectedClockShift = shifts.find((shift) => shift.id === clockShiftId);

  function resetClockModal() {
    setShowClockModal(false);
    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setClockNote("");
  }

  function resetManualTimeModal() {
    setShowManualTimeModal(false);
    setManualClockInTime(`${selectedDate}T14:00`);
    setManualClockOutTime(`${selectedDate}T22:00`);
    setManualNote("");
  }

  async function submitManualTime() {
    const shift = shifts.find((s) => s.id === clockShiftId);
    if (!shift || !currentUser || !clockShiftId) {
      infoDialog.showError(
        "Vælg en vagt",
        "Du skal vælge en vagt, før tiden kan registreres.",
      );
      return;
    }

    const plannedStart = toInputDateTime(shift.startTime);
    const plannedEnd = toInputDateTime(shift.endTime);
    const hasDeviation =
      localDateTimeToISOString(plannedStart) !==
        localDateTimeToISOString(clockInTime) ||
      localDateTimeToISOString(plannedEnd) !==
        localDateTimeToISOString(clockOutTime);

    if (requireNoteOnTimeDeviation && hasDeviation && !clockNote.trim()) {
      infoDialog.showError(
        "Note er påkrævet",
        "Du skal skrive en note ved afvigelse fra vagtplanen.",
      );
      return;
    }

    try {
      await submitManualTimeEntry({
        shiftId: clockShiftId,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        note: clockNote,
      });
      toast.success("Timer sendt til godkendelse");
      resetClockModal();
    } catch (error) {
      infoDialog.showError(
        "Timerne kunne ikke registreres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da timerne skulle registreres. Prøv igen.",
      );
    }
  }

  async function handleRegisterClockIn() {
    if (!selectedClockShift || !currentUser || !clockShiftId) {
      infoDialog.showError(
        "Vælg en vagt",
        "Du skal vælge en vagt, før mødetid kan registreres.",
      );
      return;
    }

    const plannedStart = toInputDateTime(selectedClockShift.startTime);
    const hasDeviation =
      localDateTimeToISOString(plannedStart) !==
      localDateTimeToISOString(clockInTime);

    if (requireNoteOnTimeDeviation && hasDeviation && !clockNote.trim()) {
      infoDialog.showError(
        "Note er påkrævet",
        "Du skal skrive en note ved ændret mødetid.",
      );
      return;
    }

    try {
      await clockIn(clockShiftId, clockInTime, clockNote);
      toast.success("Mødetid registreret");
      resetClockModal();
    } catch (error) {
      infoDialog.showError(
        "Mødetid kunne ikke registreres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da mødetid skulle registreres. Prøv igen.",
      );
    }
  }

  async function handleRegisterClockOut() {
    if (!openTimeEntry) {
      infoDialog.showError(
        "Ingen åben tidsregistrering",
        "Der blev ikke fundet en åben tidsregistrering.",
      );
      return;
    }

    const shift =
      openTimeEntry.shift || shifts.find((s) => s.id === openTimeEntry.shiftId);

    if (!shift) {
      infoDialog.showError(
        "Vagten kunne ikke findes",
        "Kunne ikke finde vagten for den åbne tidsregistrering.",
      );
      return;
    }

    const plannedEnd = toInputDateTime(shift.endTime);
    const hasDeviation =
      localDateTimeToISOString(plannedEnd) !==
      localDateTimeToISOString(clockOutTime);

    if (requireNoteOnTimeDeviation && hasDeviation && !clockNote.trim()) {
      infoDialog.showError(
        "Note er påkrævet",
        "Du skal skrive en note ved ændret fyraften.",
      );
      return;
    }

    try {
      await clockOut(clockOutTime, clockNote);
      toast.success("Fyraften registreret");
      resetClockModal();
    } catch (error) {
      infoDialog.showError(
        "Fyraften kunne ikke registreres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da fyraften skulle registreres. Prøv igen.",
      );
    }
  }

  function openRegisterTimeModal() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    setClockNote("");

    if (openTimeEntry?.shiftId) {
      setClockShiftId(openTimeEntry.shiftId);
      setClockInTime(toInputDateTime(openTimeEntry.clockIn));
      if (openTimeEntry.shift?.endTime) {
        const value = toInputDateTime(openTimeEntry.shift.endTime);
        setClockOutTime(value);
      } else {
        const shift = shifts.find((s) => s.id === openTimeEntry.shiftId);
        setClockOutTime(shift ? toInputDateTime(shift.endTime) : "");
      }
      setShowClockModal(true);
      return;
    }

    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setShowClockModal(true);
  }

  function openManualTimeModal() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    setManualClockInTime(`${selectedDate}T14:00`);
    setManualClockOutTime(`${selectedDate}T22:00`);
    setManualNote("");
    setShowManualTimeModal(true);
  }

  async function handleSubmitManualTimeWithoutShift() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    if (!currentUser) {
      infoDialog.showError(
        "Du er ikke logget ind",
        "Du skal være logget ind for at registrere tid.",
      );
      return;
    }

    if (!manualClockInTime || !manualClockOutTime) {
      infoDialog.showError("Udfyld tider", "Udfyld både mødetid og fyraften.");
      return;
    }

    const clockInDate = new Date(localDateTimeToISOString(manualClockInTime));
    const clockOutDate = new Date(localDateTimeToISOString(manualClockOutTime));

    if (
      Number.isNaN(clockInDate.getTime()) ||
      Number.isNaN(clockOutDate.getTime())
    ) {
      infoDialog.showError(
        "Ugyldigt tidsrum",
        "Mødetid eller fyraften er ikke en gyldig dato eller tid.",
      );
      return;
    }

    if (clockOutDate <= clockInDate) {
      infoDialog.showError(
        "Ugyldigt tidsrum",
        "Fyraften skal være efter mødetid.",
      );
      return;
    }

    if (!manualNote.trim()) {
      infoDialog.showError(
        "Note er påkrævet",
        "Du skal skrive en note ved manuel registrering uden vagt.",
      );
      return;
    }

    try {
      await submitManualTimeEntry({
        shiftId: null,
        clockIn: manualClockInTime,
        clockOut: manualClockOutTime,
        note: manualNote,
      });
      toast.success("Manuel tidsregistrering sendt til godkendelse");
      resetManualTimeModal();
    } catch (error) {
      infoDialog.showError(
        "Timerne kunne ikke registreres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da timerne skulle registreres. Prøv igen.",
      );
    }
  }

  return {
    showClockModal,
    resetClockModal,
    clockShiftId,
    setClockShiftId,
    clockInTime,
    setClockInTime,
    clockOutTime,
    setClockOutTime,
    clockNote,
    setClockNote,
    showManualTimeModal,
    resetManualTimeModal,
    manualClockInTime,
    setManualClockInTime,
    manualClockOutTime,
    setManualClockOutTime,
    manualNote,
    setManualNote,
    selectedClockShift,
    shiftsForTimeRegistration,
    submitManualTime,
    handleRegisterClockIn,
    handleRegisterClockOut,
    openRegisterTimeModal,
    openManualTimeModal,
    handleSubmitManualTimeWithoutShift,
  };
}
