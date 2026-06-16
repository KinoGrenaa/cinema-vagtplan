"use client";

import { useEffect, useMemo, useState } from "react";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "../../components/schedule/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import AiSuggestionsPanel from "../../components/schedule/AiSuggestionsPanel";
import { useSchedule } from "../../hooks/useSchedule";
import {
  useScheduleAi,
  type MovieShowing,
  type UseScheduleAiInput,
} from "../../hooks/useScheduleAi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
  getTodayLocalDate,
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import type { Shift, User, WorkType } from "../../../../shared/types";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { toast } from "sonner";

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  user: {
    firstName: string;
    lastName: string;
  };
};

type AiScheduleData = ReturnType<typeof useScheduleAi>;

type AiScheduleFeatureProps = {
  enabled: boolean;
  selectedDate: string;
  shifts: Shift[];
  users: User[];
  workTypes: WorkType[];
  movieShowings: MovieShowing[];
  createShift: UseScheduleAiInput["createShift"];
  showError: UseScheduleAiInput["showError"];
  children: (ai: AiScheduleData | null) => React.ReactNode;
};

function AiScheduleFeatures({
  enabled,
  selectedDate,
  shifts,
  users,
  workTypes,
  movieShowings,
  createShift,
  showError,
  children,
}: AiScheduleFeatureProps) {
  if (!enabled) {
    return <>{children(null)}</>;
  }

  return (
    <AiScheduleFeaturesEnabled
      selectedDate={selectedDate}
      shifts={shifts}
      users={users}
      workTypes={workTypes}
      movieShowings={movieShowings}
      createShift={createShift}
      showError={showError}
    >
      {children}
    </AiScheduleFeaturesEnabled>
  );
}

function AiScheduleFeaturesEnabled({
  selectedDate,
  shifts,
  users,
  workTypes,
  movieShowings,
  createShift,
  showError,
  children,
}: Omit<AiScheduleFeatureProps, "enabled">) {
  const ai = useScheduleAi({
    selectedDate,
    shifts,
    users,
    workTypes,
    movieShowings,
    createShift,
    showError,
  });

  return <>{children(ai)}</>;
}

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

    openTimeEntry,
    timeEntries,
    clockIn,
    clockOut,

    submitManualTime: submitManualTimeEntry,
  } = useSchedule(selectedDate);

  const shiftsForTimeRegistration = useMemo(() => {
    const entriesByShiftId = new Map(
      timeEntries
        .filter((entry) => entry.shiftId && entry.status !== "VOIDED")
        .map((entry) => [entry.shiftId, entry]),
    );

    return shifts
      .filter((shift) => shift.userId === currentUser?.id)
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

  useRealtimeShifts({
    onShiftsUpdated: refreshDayData,
    onShiftTradesUpdated: refreshDayData,
    enableToasts: false,
  });

  function leaveIsOnSelectedDate(request: LeaveRequest) {
    const current = new Date(`${selectedDate}T12:00:00`);
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);

    return current >= start && current <= end;
  }

  function getLeaveStyle(status: LeaveRequest["status"]) {
    if (status === "APPROVED") {
      return "border-green-300 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
    }

    if (status === "REJECTED") {
      return "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
    }

    return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200";
  }

  const selectedDateLeaveRequests = leaveRequests.filter(
    (request) =>
      (request.status === "PENDING" || request.status === "APPROVED") &&
      leaveIsOnSelectedDate(request),
  );

  const selectedClockShift = shifts.find((shift) => shift.id === clockShiftId);

  function clearForm() {
    setSelectedShift(null);

    setUserId(0);
    setWorkTypeId(0);

    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);

    setNote("");
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
      userId,
      workTypeId,
    };

    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, body);
      } else {
        await createShift(body);
      }

      clearForm();
    } catch (error) {
      infoDialog.showError(
        selectedShift ? "Vagten kunne ikke opdateres" : "Vagten kunne ikke oprettes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle gemmes. Prøv igen.",
      );
    }
  }

  async function handleDelete() {
    if (!selectedShift) return;

    try {
      await deleteShift(selectedShift.id);
      clearForm();
    } catch (error) {
      infoDialog.showError(
        "Vagten kunne ikke slettes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle slettes. Prøv igen.",
      );
    }
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(toInputDateTime(shift.startTime));
    setEndTime(toInputDateTime(shift.endTime));
    setNote(shift.note || "");
    setUserId(shift.userId);
    setWorkTypeId(shift.workTypeId);
  }

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const nextDate = dateToLocalDateString(date);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
  }

  function goToToday() {
    const today = getTodayLocalDate();

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
    setSelectedShift(null);
  }

  function goToDate(nextDate: string) {
    if (!nextDate) return;

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
  }

  function openRegisterTimeModal() {
    setClockNote("");

    if (openTimeEntry?.shiftId) {
      setClockShiftId(openTimeEntry.shiftId);
      setClockInTime(toInputDateTime(openTimeEntry.clockIn));

      if (openTimeEntry.shift?.endTime) {
        const value = toInputDateTime(openTimeEntry.shift.endTime);

        console.log("FYRAFTEN DEBUG");
        console.log("endTime:", openTimeEntry.shift.endTime);
        console.log("converted:", value);

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
    setManualClockInTime(`${selectedDate}T14:00`);
    setManualClockOutTime(`${selectedDate}T22:00`);
    setManualNote("");
    setShowManualTimeModal(true);
  }

  async function handleSubmitManualTimeWithoutShift() {
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
        userId: shift.userId,
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

  async function handleChangeShiftUser(shift: Shift, newUserId: number) {
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
        userId: shift.userId,
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

  function formatShiftDate(value: string) {
    return formatDateDK(value);
  }

  function formatShiftTimeRange(shift: Shift) {
    return `${formatTimeDK(shift.startTime)} - ${formatTimeDK(shift.endTime)}`;
  }

  function getShiftWorkTypeName(shift: Shift) {
    const maybeShift = shift as Shift & {
      workType?: {
        name?: string;
      };
    };

    return maybeShift.workType?.name ?? `Arbejdstype #${shift.workTypeId}`;
  }

  function getShiftConfirmText(shift: Shift) {
    return `${getShiftWorkTypeName(shift)}
${formatShiftDate(shift.startTime)}
${formatShiftTimeRange(shift)}`;
  }

  function handleOfferTrade() {
    if (!selectedShift) return;

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
            <div className="mx-auto space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Vagtplan</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                      Overblik over vagter, bemanding og dagens program
                    </p>

                    {ai && (
                      <div className="mb-6 flex flex-wrap gap-3">
                        <button
                          onClick={ai.generateAiDaySchedule}
                          disabled={ai.generatingAiSchedule}
                          className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
                        >
                          {ai.generatingAiSchedule
                            ? "Genererer AI dagsplan..."
                            : "🤖 Generate AI Day Schedule"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={openRegisterTimeModal}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                    >
                      Registrer tid
                    </button>

                    <button
                      onClick={openManualTimeModal}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      Manuel registrering
                    </button>
                  </div>
                </div>
              </div>

              {canManageShifts && (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 text-2xl font-bold">
                      Fravær denne dag
                    </h2>

                    <div className="space-y-2">
                      {selectedDateLeaveRequests.map((request) => (
                        <div
                          key={request.id}
                          className={`rounded-xl border p-3 ${getLeaveStyle(
                            request.status,
                          )}`}
                        >
                          <div className="font-bold">
                            {request.user.firstName} {request.user.lastName}
                          </div>

                          <div className="text-sm">
                            Status: {request.status}
                          </div>

                          {request.reason && (
                            <div className="mt-1 text-sm">
                              Årsag: {request.reason}
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedDateLeaveRequests.length === 0 && (
                        <div className="text-gray-500 dark:text-gray-400">
                          Ingen fravær denne dag.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                    <ShiftForm
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
                      selectedShift={selectedShift}
                      onSubmit={handleSubmit}
                      onDelete={handleDelete}
                      onCancel={clearForm}
                      onOfferTrade={handleOfferTrade}
                      leaveRequests={leaveRequests}
                    />
                  </div>
                </>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold">Dagens vagter</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {canManageShifts
                      ? "Administrer, flyt og resize vagter"
                      : "Se dagens vagtplan"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
                  {ai && (
                    <AiSuggestionsPanel
                      shifts={shifts}
                      staffingWarnings={ai.staffingWarnings}
                      staffingSuggestions={ai.staffingSuggestions}
                      recommendedEmployees={ai.recommendedEmployees}
                      aiScheduleSuggestions={ai.aiScheduleSuggestions}
                      creatingAiShift={ai.creatingAiShift}
                      liveStaffingAlerts={ai.liveStaffingAlerts}
                      emergencyAiActions={ai.emergencyAiActions}
                      autoCreatingEmergencyShift={ai.autoCreatingEmergencyShift}
                      autoStaffingNotifications={ai.autoStaffingNotifications}
                      suggestedEmergencyReplacements={
                        ai.suggestedEmergencyReplacements
                      }
                      sendingEmergencyRequest={ai.sendingEmergencyRequest}
                      autoEscalationQueue={ai.autoEscalationQueue}
                      sendingRealStaffingMessage={ai.sendingRealStaffingMessage}
                      staffingLoopStatus={ai.staffingLoopStatus}
                      autonomousStaffingStatus={ai.autonomousStaffingStatus}
                      createAiSuggestedShift={ai.createAiSuggestedShift}
                      autoCreateEmergencyShift={ai.autoCreateEmergencyShift}
                      startAutoEscalation={ai.startAutoEscalation}
                      sendRealStaffingMessage={ai.sendRealStaffingMessage}
                    />
                  )}

                  <div className="mt-4 mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Dato for vagtplan
                        </div>
                        <div className="text-2xl font-bold">
                          {selectedDate.split("-").reverse().join("-")}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => changeDate(-1)}
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                        >
                          ← Forrige dag
                        </button>

                        <button
                          onClick={goToToday}
                          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                          I dag
                        </button>

                        <label className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-lg shadow-sm transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950">
                          <span aria-hidden="true">📅</span>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => goToDate(event.target.value)}
                            className="absolute inset-0 cursor-pointer opacity-0"
                            aria-label="Vælg dato"
                          />
                        </label>

                        <button
                          onClick={() => changeDate(1)}
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                        >
                          Næste dag →
                        </button>
                      </div>
                    </div>
                  </div>

                  <ShiftTimeline
                    shifts={shifts}
                    users={users}
                    selectedDate={selectedDate}
                    onSelectShift={
                      canManageShifts ? handleSelectShift : () => {}
                    }
                    onMoveShift={canManageShifts ? handleMoveShift : () => {}}
                    onChangeShiftUser={
                      canManageShifts ? handleChangeShiftUser : () => {}
                    }
                    onResizeShift={
                      canManageShifts ? handleResizeShift : () => {}
                    }
                  />
                </div>
              </div>

              <MovieProgram
                movieShowings={filteredMovieShowings}
                selectedDate={selectedDate}
              />
            </div>

            {showClockModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Registrer tid</h2>

                    <button onClick={resetClockModal} className="text-2xl">
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    {!openTimeEntry && (
                      <select
                        value={clockShiftId || ""}
                        onChange={(event) => {
                          const shiftId = Number(event.target.value);
                          setClockShiftId(shiftId);

                          const shift = shifts.find((s) => s.id === shiftId);
                          if (!shift) return;

                          setClockInTime(toInputDateTime(shift.startTime));
                          setClockOutTime(toInputDateTime(shift.endTime));
                          setClockNote("");
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="">Vælg vagt</option>

                        {shiftsForTimeRegistration.map(
                          ({ shift, timeEntry }) => {
                            const isDisabled = Boolean(timeEntry);

                            const statusText =
                              timeEntry?.status === "APPROVED"
                                ? "Godkendt"
                                : timeEntry?.status === "PENDING"
                                  ? "Afventer godkendelse"
                                  : timeEntry?.status === "NEEDS_CHANGES"
                                    ? "Kræver rettelse"
                                    : "";

                            return (
                              <option
                                key={shift.id}
                                value={shift.id}
                                disabled={isDisabled}
                              >
                                {formatTimeDK(shift.startTime)} -{" "}
                                {formatTimeDK(shift.endTime)}
                                {" · "}
                                {shift.workType.name}
                                {statusText ? ` · ${statusText}` : ""}
                              </option>
                            );
                          },
                        )}
                      </select>
                    )}

                    {selectedClockShift && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                        <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          Planlagt vagt
                        </div>

                        <div className="mt-1 text-lg font-bold">
                          {formatTimeDK(selectedClockShift.startTime)} -{" "}
                          {formatTimeDK(selectedClockShift.endTime)}
                        </div>

                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          {selectedClockShift.workType.name}
                        </div>
                      </div>
                    )}

                    {!openTimeEntry && clockShiftId && (
                      <>
                        <label className="block text-sm font-semibold">
                          Faktisk mødetid
                        </label>

                        <input
                          type="datetime-local"
                          value={clockInTime}
                          onChange={(event) =>
                            setClockInTime(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                        />

                        <textarea
                          value={clockNote}
                          onChange={(event) => setClockNote(event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                          placeholder="Forklar eventuel ændret mødetid"
                        />

                        <button
                          onClick={handleRegisterClockIn}
                          className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                          Registrer mødetid
                        </button>
                      </>
                    )}

                    {openTimeEntry && (
                      <>
                        <label className="block text-sm font-semibold">
                          Faktisk fyraften
                        </label>

                        <input
                          type="datetime-local"
                          value={clockOutTime}
                          onChange={(event) =>
                            setClockOutTime(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                        />

                        <textarea
                          value={clockNote}
                          onChange={(event) => setClockNote(event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                          placeholder="Forklar eventuel ændret fyraften"
                        />

                        <button
                          onClick={handleRegisterClockOut}
                          className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                          Registrer fyraften
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showManualTimeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Manuel registrering
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Bruges til arbejde uden planlagt vagt. Registreringen
                        sendes til godkendelse.
                      </p>
                    </div>

                    <button onClick={resetManualTimeModal} className="text-2xl">
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        Mødetid
                      </label>

                      <input
                        type="datetime-local"
                        value={manualClockInTime}
                        onChange={(event) =>
                          setManualClockInTime(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        Fyraften
                      </label>

                      <input
                        type="datetime-local"
                        value={manualClockOutTime}
                        onChange={(event) =>
                          setManualClockOutTime(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">
                        Note / begrundelse
                      </label>

                      <textarea
                        value={manualNote}
                        onChange={(event) => setManualNote(event.target.value)}
                        className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                        placeholder="Skriv hvorfor timerne registreres uden planlagt vagt"
                      />
                    </div>

                    <button
                      onClick={handleSubmitManualTimeWithoutShift}
                      className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      Send til godkendelse
                    </button>
                  </div>
                </div>
              </div>
            )}

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
