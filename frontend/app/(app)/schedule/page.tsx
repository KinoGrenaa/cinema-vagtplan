"use client";

import { useEffect, useState } from "react";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "./components/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import { useSchedule } from "../../hooks/useSchedule";
import { useScheduleAi } from "../../hooks/useScheduleAi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import type { Shift } from "../../../../shared/types";

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

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(1);
  const [workTypeId, setWorkTypeId] = useState(1);
  const [formError, setFormError] = useState("");

  const [showClockModal, setShowClockModal] = useState(false);
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
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

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

  function getLeaveStyle(status: LeaveRequest["status"]) {
    if (status === "APPROVED") {
      return "border-green-300 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
    }

    if (status === "REJECTED") {
      return "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
    }

    return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200";
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
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-2xl font-bold">Fravær denne dag</h2>

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

                    <div className="text-sm">Status: {request.status}</div>

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
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900 dark:bg-green-950">
              <div className="mb-3 flex items-center gap-2">
                <div className="text-2xl">🤖</div>

                <div>
                  <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
                    AI Staffing Optimization
                  </h2>

                  <p className="text-sm text-green-600 dark:text-green-400">
                    Systemet foreslår automatisk medarbejdere med lav
                    belastning.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {shifts.slice(0, 5).map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl border border-green-200 bg-white p-4 dark:border-green-900 dark:bg-gray-900"
                  >
                    <div className="mb-2 text-sm font-semibold">
                      Vagt #{shift.id}
                    </div>

                    <div className="space-y-2">
                      {(recommendedEmployees[shift.id] || []).map(
                        (recommendation, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
                          >
                            {recommendation}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {true && (
              <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🔴</div>

                  <div>
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
                      LIVE Staffing Alerts
                    </h2>

                    <p className="text-sm text-red-600 dark:text-red-400">
                      Realtidsanalyse af biografens aktuelle staffing pressure.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(liveStaffingAlerts.length > 0
                    ? liveStaffingAlerts
                    : ["Ingen LIVE staffing alerts lige nu."]
                  ).map((alert, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-red-200 bg-white p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm dark:border-yellow-900 dark:bg-yellow-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🚨</div>

                  <div>
                    <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                      Emergency AI Staffing Actions
                    </h2>

                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Systemet anbefaler akut staffing intervention.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(emergencyAiActions.length > 0
                    ? emergencyAiActions
                    : ["Ingen emergency AI actions lige nu."]
                  ).map((action, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-yellow-200 bg-white p-4 text-sm font-medium text-yellow-700 dark:border-yellow-900 dark:bg-gray-900 dark:text-yellow-300"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>{action}</div>

                        <button
                          onClick={autoCreateEmergencyShift}
                          disabled={
                            autoCreatingEmergencyShift ||
                            emergencyAiActions.length === 0
                          }
                          className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {autoCreatingEmergencyShift
                            ? "Opretter emergency shift..."
                            : emergencyAiActions.length === 0
                              ? "Ingen AI handling nødvendig"
                              : "🚨 Aktivér AI handling"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-blue-300 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🤖</div>

                  <div>
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      Autonomous Staffing Notifications
                    </h2>

                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      AI-systemet overvåger og reagerer automatisk på
                      driftsbelastning.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(autoStaffingNotifications.length > 0
                    ? autoStaffingNotifications
                    : ["Ingen autonomous staffing notifications lige nu."]
                  ).map((notification, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-blue-200 bg-white p-4 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
                    >
                      {notification}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🤖</div>

                  <div>
                    <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      Suggested Emergency Replacements
                    </h2>

                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      AI-systemet foreslår bedst egnede medarbejdere til akut
                      bemanding.
                      <button
                        onClick={startAutoEscalation}
                        disabled={
                          suggestedEmergencyReplacements.length === 0 ||
                          sendingEmergencyRequest !== null
                        }
                        className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {sendingEmergencyRequest
                          ? `Kontakter ${sendingEmergencyRequest}...`
                          : "🤖 Start Auto Escalation"}
                      </button>
                    </p>
                  </div>
                </div>

                {autoEscalationQueue.length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900">
                    <div className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      AI escalation queue
                      <div className="mb-3">
                        <span
                          className={`rounded-full px-4 py-2 text-xs font-bold ${
                            staffingLoopStatus === "WAITING"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : staffingLoopStatus === "ACCEPTED"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : staffingLoopStatus === "DECLINED"
                                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          }`}
                        >
                          Staffing loop: {staffingLoopStatus}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          autonomousStaffingStatus === "EXECUTING"
                            ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                            : autonomousStaffingStatus === "COMPLETED"
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                      >
                        Autonomous staffing: {autonomousStaffingStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {autoEscalationQueue.map((employee, index) => (
                        <div
                          key={index}
                          className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {employee}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(suggestedEmergencyReplacements.length > 0
                    ? suggestedEmergencyReplacements
                    : [
                        {
                          name: "Ingen replacements nødvendige",
                          score: 100,
                          fatigue: "LOW",
                        },
                      ]
                  ).map((replacement, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {replacement.name}
                          </div>

                          <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                            Staffing score: {replacement.score}
                          </div>
                        </div>

                        <div
                          className={`rounded-full px-4 py-2 text-xs font-bold ${
                            replacement.fatigue === "LOW"
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : replacement.fatigue === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          Fatigue: {replacement.fatigue}
                        </div>
                        <button
                          onClick={() =>
                            sendRealStaffingMessage(replacement.name)
                          }
                          disabled={
                            sendingRealStaffingMessage === replacement.name
                          }
                          className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {sendingRealStaffingMessage === replacement.name
                            ? "Sender staffing request..."
                            : "📨 Send Staffing Request"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {staffingWarnings.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">⚠️</div>

              <div>
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
                  Smart Staffing Warnings
                </h2>

                <p className="text-sm text-red-600 dark:text-red-400">
                  Systemet har fundet potentielle bemandingsproblemer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
                >
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {staffingSuggestions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">🤖</div>

              <div>
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  AI Staffing Suggestions
                </h2>

                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Systemet foreslår optimeringer af bemandingen.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-blue-200 bg-white p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {aiScheduleSuggestions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm dark:border-cyan-900 dark:bg-cyan-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">🤖</div>

              <div>
                <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                  AI Suggested Schedule Blocks
                </h2>

                <p className="text-sm text-cyan-600 dark:text-cyan-400">
                  Systemet foreslår automatiske optimeringer af dagens
                  bemanding.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {aiScheduleSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-cyan-200 bg-white p-4 text-sm text-cyan-700 dark:border-cyan-900 dark:bg-gray-900 dark:text-cyan-300"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>{suggestion}</div>

                    <button
                      onClick={() => createAiSuggestedShift(suggestion, index)}
                      disabled={creatingAiShift === index}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {creatingAiShift === index
                        ? "Opretter..."
                        : "🤖 Opret anbefalet vagt"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <MovieProgram movieShowings={movieShowings} />
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
                    onChange={(event) => setClockInTime(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                  />

                  <input
                    type="datetime-local"
                    value={clockOutTime}
                    onChange={(event) => setClockOutTime(event.target.value)}
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
