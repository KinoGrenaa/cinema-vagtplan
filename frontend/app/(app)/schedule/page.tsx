"use client";

import { useEffect, useMemo, useState } from "react";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "../../components/schedule/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import AiSuggestionsPanel from "../../components/schedule/AiSuggestionsPanel";
import { useSchedule } from "../../hooks/useSchedule";
import { useScheduleAi } from "../../hooks/useScheduleAi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
  getTodayLocalDate,
  localDateTimeToISOString,
} from "@/app/utils/dateTime";
import type { Shift, User, WorkType } from "../../../../shared/types";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";

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
  movieShowings: any[];
  createShift: (...args: any[]) => any;
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
  children,
}: Omit<AiScheduleFeatureProps, "enabled">) {
  const ai = useScheduleAi({
    selectedDate,
    shifts,
    users,
    workTypes,
    movieShowings,
    createShift,
  });

  return <>{children(ai)}</>;
}

export default function SchedulePage() {
  const confirmDialog = useConfirm();
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
    submitManualTime: submitManualTimeEntry,
  } = useSchedule(selectedDate);

  const filteredMovieShowings = useMemo(() => {
    return movieShowings.filter((movie) => {
      const movieDate = dateToLocalDateString(new Date(movie.startTime));

      return movieDate === selectedDate;
    });
  }, [movieShowings, selectedDate]);

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(0);
  const [workTypeId, setWorkTypeId] = useState(0);
  const [formError, setFormError] = useState("");

  const [showClockModal, setShowClockModal] = useState(false);
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

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

  function toInputDateTime(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

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

  function clearForm() {
    setSelectedShift(null);

    setUserId(0);
    setWorkTypeId(0);

    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);

    setNote("");
    setFormError("");
  }

  function resetClockModal() {
    setShowClockModal(false);
    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setClockNote("");
  }

  async function submitManualTime() {
    const shift = shifts.find((s) => s.id === clockShiftId);

    if (!shift || !currentUser || !clockShiftId) {
      alert("Vælg en vagt først");
      return;
    }

    const plannedStart = toInputDateTime(shift.startTime);
    const plannedEnd = toInputDateTime(shift.endTime);

    const hasDeviation =
      plannedStart !== clockInTime || plannedEnd !== clockOutTime;

    if (hasDeviation && !clockNote.trim()) {
      alert("Du skal skrive en note ved afvigelse fra vagtplanen");
      return;
    }

    try {
      await submitManualTimeEntry({
        shiftId: clockShiftId,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        note: clockNote,
      });

      alert("Timer sendt til godkendelse");
      resetClockModal();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Kunne ikke registrere timer",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

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
      setFormError(
        error instanceof Error ? error.message : "Der opstod en fejl",
      );
    }
  }

  async function handleDelete() {
    if (!selectedShift) return;

    try {
      await deleteShift(selectedShift.id);
      clearForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Kunne ikke slette vagt",
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
    setFormError("");
  }

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const nextDate = dateToLocalDateString(date);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setFormError("");
  }

  function goToToday() {
    const today = getTodayLocalDate();

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
    setSelectedShift(null);
    setFormError("");
  }

  function goToDate(nextDate: string) {
    if (!nextDate) return;

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setFormError("");
  }

  async function handleMoveShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) {
    const oldStart = new Date(shift.startTime);
    const oldEnd = new Date(shift.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(oldStart);
    newStart.setHours(newStartHour, newStartMinute, 0, 0);

    const newEnd = new Date(newStart.getTime() + durationMs);

    await updateShift(shift.id, {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      note: shift.note,
      userId: shift.userId,
      workTypeId: shift.workTypeId,
    });
  }

  async function handleChangeShiftUser(shift: Shift, newUserId: number) {
    await updateShift(shift.id, {
      startTime: shift.startTime,
      endTime: shift.endTime,
      note: shift.note,
      userId: newUserId,
      workTypeId: shift.workTypeId,
    });
  }

  async function handleResizeShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) {
    const oldStart = new Date(shift.startTime);

    const newStart = new Date(oldStart);
    newStart.setHours(newStartHour, newStartMinute, 0, 0);

    const newEnd = new Date(oldStart);
    newEnd.setHours(newEndHour, newEndMinute, 0, 0);

    await updateShift(shift.id, {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      note: shift.note,
      userId: shift.userId,
      workTypeId: shift.workTypeId,
    });
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
          alert("Vagten er sendt i byttepuljen");
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : "Kunne ikke sende vagten i byttepuljen",
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
                      onClick={() => setShowClockModal(true)}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                    >
                      Registrer tid
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

              <MovieProgram movieShowings={filteredMovieShowings} />
            </div>

            {showClockModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                      Registrer møde- og fyraftstid
                    </h2>

                    <button onClick={resetClockModal} className="text-2xl">
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
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

                      {shifts
                        .filter((shift) => shift.userId === currentUser?.id)
                        .map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.workType.name}
                          </option>
                        ))}
                    </select>

                    {clockShiftId && (
                      <>
                        <input
                          type="datetime-local"
                          value={clockInTime}
                          onChange={(event) =>
                            setClockInTime(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                        />

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
                          placeholder="Note ved afvigelse"
                        />

                        <button
                          onClick={submitManualTime}
                          className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                          Send til godkendelse
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {formError && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
                    Konflikt fundet
                  </h2>

                  <p className="mb-6 text-gray-700 dark:text-gray-300">
                    {formError}
                  </p>

                  <button
                    onClick={() => setFormError("")}
                    className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  >
                    OK
                  </button>
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
        </>
      )}
    </AiScheduleFeatures>
  );
}
