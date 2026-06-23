"use client";

import { useEffect, useMemo, useState } from "react";
import StaffingRequestModal, {
  type StaffingRequestType,
  type StaffingTargetMode,
} from "./components/StaffingRequestModal";
import {
  ManualTimeRegistrationModal,
  TimeRegistrationModal,
} from "./components/TimeRegistrationModals";
import ScheduleShiftFormModal from "./components/ScheduleShiftFormModal";
import ScheduleMainContent from "./components/ScheduleMainContent";
import { useSchedule } from "../../hooks/useSchedule";
import AiScheduleFeatures from "./components/AiScheduleFeatures";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalDateString,
  getTodayLocalDate,
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import type { Shift, User, WorkType } from "../../../../shared/types";
import {
  getDefaultStaffingMessage,
  getShiftConfirmText,
  getShiftUserId,
  getStaffingShiftOptionText,
  getUserDisplayName,
} from "./helpers/scheduleShiftText";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { toast } from "sonner";

export default function SchedulePage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  const todayDefault = getTodayLocalDate();

  const [selectedDate, setSelectedDate] = useState(todayDefault);

  const {
    user: currentUser,
    loading,
    canManageShifts,
    needsMasterCinemaSelection,
    shifts,
    users,
    workTypes,
    movieShowings,
    leaveRequests,
    refreshDayData,
    createShift,
    updateShift,
    deleteShift,
    offerShiftTrade,
    createStaffingRequest,

    openTimeEntry,
    timeEntries,
    clockIn,
    clockOut,

    submitManualTime: submitManualTimeEntry,
  } = useSchedule(selectedDate, {
    onError: infoDialog.showError,
  });

  function showMissingActiveCinemaMessage() {
    infoDialog.showError(
      "Ingen aktiv biograf valgt",
      "Vælg en biograf i MASTER-panelet, før du bruger vagtplanen.",
    );
  }

  const shiftsForTimeRegistration = useMemo(() => {
    const entriesByShiftId = new Map(
      timeEntries
        .filter((entry) => entry.shiftId && entry.status !== "VOIDED")
        .map((entry) => [entry.shiftId, entry]),
    );

    return shifts
      .filter((shift) => getShiftUserId(shift) === currentUser?.id)
      .map((shift) => ({
        shift,
        timeEntry: entriesByShiftId.get(shift.id) ?? null,
      }));
  }, [currentUser?.id, shifts, timeEntries]);

  const filteredMovieShowings = useMemo(() => {
    const dayStart = new Date(`${selectedDate}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return movieShowings.filter((movie) => {
      const movieStart = new Date(movie.startTime);
      const movieEnd = new Date(movie.endTime);

      return movieStart < dayEnd && movieEnd > dayStart;
    });
  }, [movieShowings, selectedDate]);

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftFormModal, setShowShiftFormModal] = useState(false);

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(0);
  const [workTypeId, setWorkTypeId] = useState(0);
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

  const [showManualTimeModal, setShowManualTimeModal] = useState(false);
  const [manualClockInTime, setManualClockInTime] = useState(
    `${todayDefault}T14:00`,
  );
  const [manualClockOutTime, setManualClockOutTime] = useState(
    `${todayDefault}T22:00`,
  );
  const [manualNote, setManualNote] = useState("");

  const [showStaffingRequestModal, setShowStaffingRequestModal] =
    useState(false);
  const [staffingRequestShiftId, setStaffingRequestShiftId] = useState<
    number | null
  >(null);
  const [staffingRequestTargetMode, setStaffingRequestTargetMode] =
    useState<StaffingTargetMode>("ALL");
  const [staffingRequestTargetUserId, setStaffingRequestTargetUserId] =
    useState(0);
  const [staffingRequestType, setStaffingRequestType] =
    useState<StaffingRequestType>("EXTRA_SHIFT");
  const [staffingRequestPriority, setStaffingRequestPriority] = useState(2);
  const [staffingRequestMessage, setStaffingRequestMessage] = useState("");
  const [staffingRequestStartTime, setStaffingRequestStartTime] = useState(
    `${todayDefault}T14:00`,
  );
  const [staffingRequestEndTime, setStaffingRequestEndTime] = useState(
    `${todayDefault}T22:00`,
  );
  const [staffingRequestWorkTypeId, setStaffingRequestWorkTypeId] = useState(0);

  const staffingTargetUsers = useMemo(() => {
    return users.filter((candidate) => {
      const userWithMeta = candidate as User & {
        isActive?: boolean;
        role?: string;
      };

      return userWithMeta.isActive !== false && userWithMeta.role !== "MASTER";
    });
  }, [users]);

  const selectedStaffingRequestShift = useMemo(() => {
    if (!staffingRequestShiftId) return null;

    return shifts.find((shift) => shift.id === staffingRequestShiftId) ?? null;
  }, [shifts, staffingRequestShiftId]);

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

  useEffect(() => {
    if (
      staffingRequestTargetUserId !== 0 &&
      !staffingTargetUsers.some(
        (targetUser) => targetUser.id === staffingRequestTargetUserId,
      )
    ) {
      setStaffingRequestTargetUserId(0);
    }
  }, [staffingRequestTargetUserId, staffingTargetUsers]);

  useRealtimeShifts({
    onShiftsUpdated: () =>
      refreshDayData({ showErrors: false, showLoading: false }),
    onShiftTradesUpdated: () =>
      refreshDayData({ showErrors: false, showLoading: false }),
    enableToasts: false,
  });

  const selectedClockShift = shifts.find((shift) => shift.id === clockShiftId);

  function clearForm() {
    setSelectedShift(null);

    setUserId(0);
    setWorkTypeId(0);

    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);

    setNote("");
  }

  function openCreateShiftModal() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    clearForm();
    setShowShiftFormModal(true);
  }

  function closeShiftFormModal() {
    clearForm();
    setShowShiftFormModal(false);
  }

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

  function resetStaffingRequestModal() {
    setShowStaffingRequestModal(false);
    setStaffingRequestShiftId(null);
    setStaffingRequestTargetMode("ALL");
    setStaffingRequestTargetUserId(0);
    setStaffingRequestType("EXTRA_SHIFT");
    setStaffingRequestPriority(2);
    setStaffingRequestMessage("");
    setStaffingRequestStartTime(`${selectedDate}T14:00`);
    setStaffingRequestEndTime(`${selectedDate}T22:00`);
    setStaffingRequestWorkTypeId(0);
  }

  const requireNoteOnTimeDeviation = true;

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

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const nextDate = dateToLocalDateString(date);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function goToToday() {
    const today = getTodayLocalDate();

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function goToDate(nextDate: string) {
    if (!nextDate) return;

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
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

    const clockIn = new Date(localDateTimeToISOString(manualClockInTime));
    const clockOut = new Date(localDateTimeToISOString(manualClockOutTime));

    if (Number.isNaN(clockIn.getTime()) || Number.isNaN(clockOut.getTime())) {
      infoDialog.showError(
        "Ugyldigt tidsrum",
        "Mødetid eller fyraften er ikke en gyldig dato eller tid.",
      );
      return;
    }

    if (clockOut <= clockIn) {
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

  function createDateTimeFromSelectedDate(hour: number, minute: number) {
    const date = new Date(`${selectedDate}T00:00:00`);

    date.setHours(hour, minute, 0, 0);

    return date;
  }

  function getSelectedDayRange() {
    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(start);

    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  async function handleMoveShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) {
    const oldStart = new Date(shift.startTime);
    const oldEnd = new Date(shift.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const { start: dayStart } = getSelectedDayRange();

    const visibleStart =
      oldStart.getTime() > dayStart.getTime() ? oldStart : dayStart;

    const visibleOffsetMs = visibleStart.getTime() - oldStart.getTime();

    const newVisibleStart = createDateTimeFromSelectedDate(
      newStartHour,
      newStartMinute,
    );

    const newStart = new Date(newVisibleStart.getTime() - visibleOffsetMs);
    const newEnd = new Date(newStart.getTime() + durationMs);

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
    const oldStart = new Date(shift.startTime);
    const oldEnd = new Date(shift.endTime);

    const { start: dayStart, end: dayEnd } = getSelectedDayRange();

    const visibleStart =
      oldStart.getTime() > dayStart.getTime() ? oldStart : dayStart;

    const visibleEnd = oldEnd.getTime() < dayEnd.getTime() ? oldEnd : dayEnd;

    const hiddenBeforeMs = visibleStart.getTime() - oldStart.getTime();

    const hiddenAfterMs = oldEnd.getTime() - visibleEnd.getTime();

    const newVisibleStart = createDateTimeFromSelectedDate(
      newStartHour,
      newStartMinute,
    );

    const newVisibleEnd = createDateTimeFromSelectedDate(
      newEndHour,
      newEndMinute,
    );

    const newStart = new Date(newVisibleStart.getTime() - hiddenBeforeMs);

    const newEnd = new Date(newVisibleEnd.getTime() + hiddenAfterMs);

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

  function applyStaffingRequestShift(shift: Shift | null) {
    setStaffingRequestShiftId(shift?.id ?? null);

    if (shift) {
      setStaffingRequestStartTime(toInputDateTime(shift.startTime));
      setStaffingRequestEndTime(toInputDateTime(shift.endTime));
      setStaffingRequestWorkTypeId(shift.workTypeId ?? 0);
      return;
    }

    setStaffingRequestStartTime(`${selectedDate}T14:00`);
    setStaffingRequestEndTime(`${selectedDate}T22:00`);
    setStaffingRequestWorkTypeId(workTypes[0]?.id ?? 0);
  }

  function openStaffingRequestModal(shift: Shift | null = null) {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    const defaultType: StaffingRequestType = shift
      ? "REPLACEMENT"
      : "EXTRA_SHIFT";

    applyStaffingRequestShift(shift);
    setStaffingRequestTargetMode("ALL");
    setStaffingRequestTargetUserId(0);
    setStaffingRequestType(defaultType);
    setStaffingRequestPriority(shift ? 3 : 2);
    setStaffingRequestMessage(getDefaultStaffingMessage(shift, defaultType));
    setShowShiftFormModal(false);
    setShowStaffingRequestModal(true);
  }

  function handleOpenStaffingRequestForSelectedShift() {
    if (!selectedShift) return;

    openStaffingRequestModal(selectedShift);
  }

  async function handleSubmitStaffingRequest(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    if (
      staffingRequestTargetMode === "USER" &&
      (!staffingRequestTargetUserId || staffingRequestTargetUserId <= 0)
    ) {
      infoDialog.showError(
        "Vælg medarbejder",
        "Vælg hvilken medarbejder forespørgslen skal sendes til.",
      );
      return;
    }

    if (!staffingRequestShiftId) {
      if (!staffingRequestStartTime || !staffingRequestEndTime) {
        infoDialog.showError(
          "Vælg tidsinterval",
          "Vælg hvornår bemandingsbehovet starter og slutter.",
        );
        return;
      }

      const requestStart = new Date(staffingRequestStartTime);
      const requestEnd = new Date(staffingRequestEndTime);

      if (requestEnd <= requestStart) {
        infoDialog.showError(
          "Tidsintervallet er ikke gyldigt",
          "Sluttidspunktet skal være efter starttidspunktet.",
        );
        return;
      }

      if (!staffingRequestWorkTypeId || staffingRequestWorkTypeId <= 0) {
        infoDialog.showError(
          "Vælg jobfunktion",
          "Vælg hvilken jobfunktion bemandingsbehovet gælder.",
        );
        return;
      }
    }

    if (!staffingRequestMessage.trim()) {
      infoDialog.showError(
        "Skriv en besked",
        "Skriv hvad medarbejderne skal svare på.",
      );
      return;
    }

    try {
      await createStaffingRequest({
        shiftId: staffingRequestShiftId,
        targetUserId:
          staffingRequestTargetMode === "USER"
            ? staffingRequestTargetUserId
            : null,
        type: staffingRequestType,
        priority: staffingRequestPriority,
        message: staffingRequestMessage,
        requestStartTime: staffingRequestShiftId
          ? null
          : localDateTimeToISOString(staffingRequestStartTime),
        requestEndTime: staffingRequestShiftId
          ? null
          : localDateTimeToISOString(staffingRequestEndTime),
        workTypeId: staffingRequestShiftId
          ? null
          : staffingRequestWorkTypeId || null,
      });

      toast.success("Bemandingsforespørgslen er sendt");
      resetStaffingRequestModal();
    } catch (error) {
      infoDialog.showError(
        "Bemandingsforespørgslen kunne ikke sendes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgslen skulle sendes. Prøv igen.",
      );
    }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser vagter...
      </main>
    );
  }

  return (
    <AiScheduleFeatures
      enabled={aiEnabled}
      selectedDate={selectedDate}
      shifts={shifts}
      users={users}
      workTypes={workTypes}
      movieShowings={filteredMovieShowings}
      createShift={createShift}
      showError={infoDialog.showError}
    >
      {(ai) => (
        <>
          <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
            <ScheduleMainContent
              ai={ai}
              shifts={shifts}
              users={users}
              selectedDate={selectedDate}
              canManageShifts={canManageShifts}
              needsMasterCinemaSelection={needsMasterCinemaSelection}
              leaveRequests={leaveRequests}
              movieShowings={filteredMovieShowings}
              onOpenRegisterTimeModal={openRegisterTimeModal}
              onOpenManualTimeModal={openManualTimeModal}
              onOpenStaffingRequest={() => openStaffingRequestModal(null)}
              onOpenCreateShiftModal={openCreateShiftModal}
              onPreviousDay={() => changeDate(-1)}
              onToday={goToToday}
              onDateChange={goToDate}
              onNextDay={() => changeDate(1)}
              onSelectShift={handleSelectShift}
              onMoveShift={handleMoveShift}
              onChangeShiftUser={handleChangeShiftUser}
              onResizeShift={handleResizeShift}
            />

            <ScheduleShiftFormModal
              open={showShiftFormModal}
              selectedShift={selectedShift}
              users={users}
              workTypes={workTypes}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              note={note}
              setNote={setNote}
              userId={userId}
              setUserId={setUserId}
              workTypeId={workTypeId}
              setWorkTypeId={setWorkTypeId}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              onCancel={closeShiftFormModal}
              onOfferTrade={handleOfferTrade}
              onSendStaffingRequest={handleOpenStaffingRequestForSelectedShift}
              leaveRequests={leaveRequests}
            />

            <StaffingRequestModal
              open={showStaffingRequestModal}
              onClose={resetStaffingRequestModal}
              onSubmit={handleSubmitStaffingRequest}
              shifts={shifts}
              workTypes={workTypes}
              staffingTargetUsers={staffingTargetUsers}
              selectedShift={selectedStaffingRequestShift}
              selectedShiftId={staffingRequestShiftId}
              onShiftChange={(nextShift) => {
                applyStaffingRequestShift(nextShift);
                setStaffingRequestMessage(
                  getDefaultStaffingMessage(nextShift, staffingRequestType),
                );
              }}
              targetMode={staffingRequestTargetMode}
              onTargetModeChange={(nextMode) => {
                setStaffingRequestTargetMode(nextMode);

                if (nextMode === "ALL") {
                  setStaffingRequestTargetUserId(0);
                }
              }}
              targetUserId={staffingRequestTargetUserId}
              onTargetUserIdChange={setStaffingRequestTargetUserId}
              requestType={staffingRequestType}
              onRequestTypeChange={setStaffingRequestType}
              priority={staffingRequestPriority}
              onPriorityChange={setStaffingRequestPriority}
              message={staffingRequestMessage}
              onMessageChange={setStaffingRequestMessage}
              startTime={staffingRequestStartTime}
              onStartTimeChange={setStaffingRequestStartTime}
              endTime={staffingRequestEndTime}
              onEndTimeChange={setStaffingRequestEndTime}
              workTypeId={staffingRequestWorkTypeId}
              onWorkTypeIdChange={setStaffingRequestWorkTypeId}
              getShiftOptionText={(shift) =>
                getStaffingShiftOptionText(shift, users)
              }
              getUserDisplayName={getUserDisplayName}
            />

            <TimeRegistrationModal
              open={showClockModal}
              onClose={resetClockModal}
              openTimeEntry={openTimeEntry}
              clockShiftId={clockShiftId}
              setClockShiftId={setClockShiftId}
              shifts={shifts}
              shiftsForTimeRegistration={shiftsForTimeRegistration}
              selectedClockShift={selectedClockShift}
              clockInTime={clockInTime}
              setClockInTime={setClockInTime}
              clockOutTime={clockOutTime}
              setClockOutTime={setClockOutTime}
              clockNote={clockNote}
              setClockNote={setClockNote}
              onRegisterClockIn={handleRegisterClockIn}
              onRegisterClockOut={handleRegisterClockOut}
            />

            <ManualTimeRegistrationModal
              open={showManualTimeModal}
              onClose={resetManualTimeModal}
              clockInTime={manualClockInTime}
              setClockInTime={setManualClockInTime}
              clockOutTime={manualClockOutTime}
              setClockOutTime={setManualClockOutTime}
              note={manualNote}
              setNote={setManualNote}
              onSubmit={handleSubmitManualTimeWithoutShift}
            />
          </main>

          <ConfirmModal
            open={confirmDialog.open}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmText={confirmDialog.confirmText}
            cancelText={confirmDialog.cancelText}
            confirmVariant={confirmDialog.confirmVariant}
            loading={confirmDialog.loading}
            onConfirm={confirmDialog.handleConfirm}
            onCancel={confirmDialog.handleCancel}
          />

          <InfoModal
            open={infoDialog.open}
            title={infoDialog.title}
            description={infoDialog.description}
            buttonText={infoDialog.buttonText}
            variant={infoDialog.variant}
            onClose={infoDialog.close}
          />
        </>
      )}
    </AiScheduleFeatures>
  );
}
