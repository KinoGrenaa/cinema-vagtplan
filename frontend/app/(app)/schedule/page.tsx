"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "./components/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import { useApi } from "../../hooks/useApi";
import type { Shift, User, WorkType } from "../../../../shared/types";

type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

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

type LoggedInUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

export default function SchedulePage() {
  const { apiFetch } = useApi();
  const todayDefault = new Date().toISOString().slice(0, 10);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [movieShowings, setMovieShowings] = useState<MovieShowing[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayDefault);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(2);
  const [workTypeId, setWorkTypeId] = useState(1);
  const [formError, setFormError] = useState("");

  const [showClockModal, setShowClockModal] = useState(false);
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

  function toInputDateTime(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

  function getLoggedInUser(): LoggedInUser | null {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }

  const fetchUsers = useCallback(async () => {
    const response = await apiFetch("/users");

    const data: User[] = await response.json();
    setUsers(data);

    if (data.length > 0) {
      setUserId(data[0].id);
    }
  }, [apiFetch]);

  const fetchWorkTypes = useCallback(async () => {
    const response = await apiFetch("/work-types");

    const data: WorkType[] = await response.json();
    setWorkTypes(data);

    if (data.length > 0) {
      setWorkTypeId(data[0].id);
    }
  }, [apiFetch]);

  const fetchShifts = useCallback(async () => {
    const response = await apiFetch(`/shifts?date=${selectedDate}`);

    const data: Shift[] = await response.json();
    setShifts(data);
    setLoading(false);
  }, [apiFetch, selectedDate]);

  const fetchMovieShowings = useCallback(async () => {
    const response = await apiFetch(`/movie-showings?date=${selectedDate}`);

    const data: MovieShowing[] = await response.json();
    setMovieShowings(data);
  }, [apiFetch, selectedDate]);

  const fetchLeaveRequests = useCallback(async () => {
    const response = await apiFetch("/leave-requests");

    const data: LeaveRequest[] = await response.json();
    setLeaveRequests(data);
  }, [apiFetch]);

  const refreshDayData = useCallback(async () => {
    await fetchShifts();
    await fetchMovieShowings();
    await fetchLeaveRequests();
  }, [fetchShifts, fetchMovieShowings, fetchLeaveRequests]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    fetchUsers();
    fetchWorkTypes();
  }, [fetchUsers, fetchWorkTypes]);

  useEffect(() => {
    refreshDayData();
  }, [refreshDayData]);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("shiftsUpdated", () => {
      refreshDayData();
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshDayData]);

  function leaveIsOnSelectedDate(request: LeaveRequest) {
    const current = new Date(`${selectedDate}T12:00:00`);
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);

    return current >= start && current <= end;
  }

  function getLeaveStyle(status: LeaveRequest["status"]) {
    if (status === "APPROVED") {
      return "bg-green-100 text-green-800 border-green-300";
    }

    if (status === "REJECTED") {
      return "bg-red-100 text-red-800 border-red-300";
    }

    return "bg-yellow-100 text-yellow-800 border-yellow-300";
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

    if (!shift || !currentUser) {
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

    const response = await apiFetch("/time-entries/manual", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.id,
        cinemaId: currentUser.cinemaId,
        shiftId: clockShiftId,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        note: clockNote,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Kunne ikke registrere timer");
      return;
    }

    alert("Timer sendt til godkendelse");
    resetClockModal();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const parsedUser = getLoggedInUser();

    const body = {
      startTime,
      endTime,
      note,
      cinemaId: parsedUser?.cinemaId || 1,
      userId,
      workTypeId,
    };

    const method = selectedShift ? "PATCH" : "POST";

    const response = await apiFetch(
      selectedShift ? `/shifts/${selectedShift.id}` : "/shifts",
      {
        method,
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setFormError(data.message || "Der opstod en fejl");
      return;
    }

    clearForm();
    await refreshDayData();
  }

  async function handleDelete() {
    if (!selectedShift) return;

    await apiFetch(`/shifts/${selectedShift.id}`, {
      method: "DELETE",
    });

    clearForm();
    await refreshDayData();
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(shift.startTime.slice(0, 16));
    setEndTime(shift.endTime.slice(0, 16));
    setNote(shift.note || "");
    setUserId(shift.userId);
    setWorkTypeId(shift.workTypeId);
    setFormError("");
  }

  function changeDate(days: number) {
    const date = new Date(selectedDate);
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

    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: shift.userId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
  }

  async function handleChangeShiftUser(shift: Shift, newUserId: number) {
    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: shift.startTime,
        endTime: shift.endTime,
        note: shift.note,
        userId: newUserId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
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

    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: shift.userId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
  }

  async function handleOfferTrade() {
    if (!selectedShift) return;

    const parsedUser = getLoggedInUser();

    if (!parsedUser) return;

    await apiFetch("/shift-trades", {
      method: "POST",
      body: JSON.stringify({
        shiftId: selectedShift.id,
        offeredByUserId: selectedShift.userId,
        cinemaId: parsedUser.cinemaId,
        message: "",
      }),
    });

    alert("Vagten er sendt i byttepuljen");
  }

  const canManageShifts =
    currentUser?.role === "ADMIN" || currentUser?.role === "MASTER";

  if (loading) {
    return <p className="p-10">Indlæser vagter...</p>;
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vagtplan</h1>
          <p className="text-gray-500">Valgt dato: {selectedDate}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowClockModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Registrer tid
          </button>

          <button
            onClick={() => changeDate(-1)}
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Forrige dag
          </button>

          <button
            onClick={goToToday}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            I dag
          </button>

          <button
            onClick={() => changeDate(1)}
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Næste dag
          </button>
        </div>
      </div>

      {canManageShifts && (
        <>
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Fravær denne dag</h2>

            <div className="space-y-2">
              {selectedDateLeaveRequests.map((request) => (
                <div
                  key={request.id}
                  className={`border rounded-lg p-3 ${getLeaveStyle(
                    request.status,
                  )}`}
                >
                  <div className="font-bold">
                    {request.user.firstName} {request.user.lastName}
                  </div>

                  <div className="text-sm">Status: {request.status}</div>

                  {request.reason && (
                    <div className="text-sm mt-1">Årsag: {request.reason}</div>
                  )}
                </div>
              ))}

              {selectedDateLeaveRequests.length === 0 && (
                <div className="text-gray-500">Ingen fravær denne dag.</div>
              )}
            </div>
          </div>

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
        </>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dagens vagter</h1>
            <p className="text-gray-500">
              {canManageShifts
                ? "Administrer, flyt og resize vagter"
                : "Se dagens vagtplan"}
            </p>
          </div>
        </div>

        <ShiftTimeline
          shifts={shifts}
          users={users}
          selectedDate={selectedDate}
          onSelectShift={canManageShifts ? handleSelectShift : () => {}}
          onMoveShift={canManageShifts ? handleMoveShift : () => {}}
          onChangeShiftUser={canManageShifts ? handleChangeShiftUser : () => {}}
          onResizeShift={canManageShifts ? handleResizeShift : () => {}}
        />
      </div>

      {showClockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Registrer møde- og fyraftstid
              </h2>

              <button onClick={resetClockModal} className="text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Vælg vagt
                </label>

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
                  className="border rounded-lg px-3 py-2 w-full"
                >
                  <option value="">Vælg vagt</option>

                  {shifts
                    .filter((shift) => shift.userId === currentUser?.id)
                    .map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.workType.name} ·{" "}
                        {new Date(shift.startTime).toLocaleTimeString("da-DK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {new Date(shift.endTime).toLocaleTimeString("da-DK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </option>
                    ))}
                </select>
              </div>

              {clockShiftId && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Mødetid
                      </label>

                      <input
                        type="datetime-local"
                        value={clockInTime}
                        onChange={(event) => setClockInTime(event.target.value)}
                        className="border rounded-lg px-3 py-2 w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Fyraften
                      </label>

                      <input
                        type="datetime-local"
                        value={clockOutTime}
                        onChange={(event) =>
                          setClockOutTime(event.target.value)
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Note ved afvigelse
                    </label>

                    <textarea
                      value={clockNote}
                      onChange={(event) => setClockNote(event.target.value)}
                      className="border rounded-lg px-3 py-2 w-full min-h-24"
                      placeholder="Udfyldes kun hvis møde- eller fyraftstid afviger fra vagtplanen"
                    />
                  </div>

                  <button
                    onClick={submitManualTime}
                    className="w-full bg-black text-white py-3 rounded-xl"
                  >
                    Send til godkendelse
                  </button>
                </>
              )}

              {shifts.filter((shift) => shift.userId === currentUser?.id)
                .length === 0 && (
                <div className="text-gray-500">
                  Du har ingen vagter på den valgte dato.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              Konflikt fundet
            </h2>

            <p className="text-gray-700 mb-6">{formError}</p>

            <button
              onClick={() => setFormError("")}
              className="w-full bg-black text-white py-3 rounded-xl"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <MovieProgram movieShowings={movieShowings} />
    </>
  );
}
