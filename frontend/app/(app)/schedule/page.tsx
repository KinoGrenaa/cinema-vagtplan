"use client";

import { useEffect, useState } from "react";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "./components/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import AiSuggestionsPanel from "../../components/schedule/AiSuggestionsPanel";
import { useSchedule } from "../../hooks/useSchedule";
import { useScheduleAi } from "../../hooks/useScheduleAi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import type { Shift } from "../../../../shared/types";
import ClockModal from "../../components/schedule/ClockModal";
import LeaveRequestsPanel from "../../components/schedule/LeaveRequestsPanel";

type LeaveRequest = {
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

export default function SchedulePage() {
  const todayDefault = new Date().toISOString().slice(0, 10);

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

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const [userId, setUserId] = useState(1);
  const [workTypeId, setWorkTypeId] = useState(1);

  const {
    staffingWarnings,
    staffingSuggestions,
    recommendedEmployees,
    aiScheduleSuggestions,
    creatingAiShift,
    generatingAiSchedule,
    liveStaffingAlerts,
    emergencyAiActions,
    autoCreatingEmergencyShift,
    autoStaffingNotifications,
    suggestedEmergencyReplacements,
    sendingEmergencyRequest,
    autoEscalationQueue,
    sendingRealStaffingMessage,
    staffingLoopStatus,
    autonomousStaffingStatus,
    createAiSuggestedShift,
    generateAiDaySchedule,
    autoCreateEmergencyShift,
    startAutoEscalation,
    sendRealStaffingMessage,
  } = useScheduleAi({
    selectedDate,
    shifts,
    users,
    workTypes,
    movieShowings,
    createShift,
  });

  useEffect(() => {
    if (users.length > 0 && !users.some((user) => user.id === userId)) {
      setUserId(users[0].id);
    }
  }, [userId, users]);

  useEffect(() => {
    if (
      workTypes.length > 0 &&
      !workTypes.some((workType) => workType.id === workTypeId)
    ) {
      setWorkTypeId(workTypes[0].id);
    }
  }, [workTypeId, workTypes]);

  function toInputDateTime(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

  function localDateTimeToISOString(value: string) {
    return new Date(value).toISOString();
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

  const selectedDateLeaveRequests = leaveRequests.filter(leaveIsOnSelectedDate);

  function clearForm() {
    setSelectedShift(null);
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

    const nextDate = date.toISOString().slice(0, 10);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setFormError("");
  }

  function goToToday() {
    const today = new Date().toISOString().slice(0, 10);

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
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

  async function handleOfferTrade() {
    if (!selectedShift) return;

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
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser vagter...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vagtplan</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Valgt dato: {selectedDate}
              </p>
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={generateAiDaySchedule}
                  disabled={generatingAiSchedule}
                  className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                  {generatingAiSchedule
                    ? "Genererer AI dagsplan..."
                    : "🤖 Generate AI Day Schedule"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowClockModal(true)}
                className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
              >
                Registrer tid
              </button>

              <button
                onClick={() => changeDate(-1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Forrige dag
              </button>

              <button
                onClick={goToToday}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                I dag
              </button>

              <button
                onClick={() => changeDate(1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Næste dag
              </button>
            </div>
          </div>
        </div>

        {canManageShifts && (
          <>
            <LeaveRequestsPanel leaveRequests={selectedDateLeaveRequests} />

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
            <AiSuggestionsPanel
              shifts={shifts}
              staffingWarnings={staffingWarnings}
              staffingSuggestions={staffingSuggestions}
              recommendedEmployees={recommendedEmployees}
              aiScheduleSuggestions={aiScheduleSuggestions}
              creatingAiShift={creatingAiShift}
              liveStaffingAlerts={liveStaffingAlerts}
              emergencyAiActions={emergencyAiActions}
              autoCreatingEmergencyShift={autoCreatingEmergencyShift}
              autoStaffingNotifications={autoStaffingNotifications}
              suggestedEmergencyReplacements={suggestedEmergencyReplacements}
              sendingEmergencyRequest={sendingEmergencyRequest}
              autoEscalationQueue={autoEscalationQueue}
              sendingRealStaffingMessage={sendingRealStaffingMessage}
              staffingLoopStatus={staffingLoopStatus}
              autonomousStaffingStatus={autonomousStaffingStatus}
              createAiSuggestedShift={createAiSuggestedShift}
              autoCreateEmergencyShift={autoCreateEmergencyShift}
              startAutoEscalation={startAutoEscalation}
              sendRealStaffingMessage={sendRealStaffingMessage}
            />

            <ShiftTimeline
              shifts={shifts}
              users={users}
              selectedDate={selectedDate}
              onSelectShift={canManageShifts ? handleSelectShift : () => {}}
              onMoveShift={canManageShifts ? handleMoveShift : () => {}}
              onChangeShiftUser={
                canManageShifts ? handleChangeShiftUser : () => {}
              }
              onResizeShift={canManageShifts ? handleResizeShift : () => {}}
            />
          </div>
        </div>

        <MovieProgram movieShowings={movieShowings} />
      </div>

      <ClockModal
        open={showClockModal}
        onClose={() => setShowClockModal(false)}
        clockShiftId={clockShiftId}
        setClockShiftId={setClockShiftId}
        clockInTime={clockInTime}
        setClockInTime={setClockInTime}
        clockOutTime={clockOutTime}
        setClockOutTime={setClockOutTime}
        clockNote={clockNote}
        setClockNote={setClockNote}
        submitManualTimeEntry={submitManualTimeEntry}
      />

      {formError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
              Konflikt fundet
            </h2>

            <p className="mb-6 text-gray-700 dark:text-gray-300">{formError}</p>

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
  );
}
