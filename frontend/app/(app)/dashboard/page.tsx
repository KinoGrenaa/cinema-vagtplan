"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppMenu from "../../components/AppMenu";

type CurrentUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  userId: number;
};

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
};

type LeaveRequest = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "CANCELLED";
};

type MovieShowing = {
  id: number;
  soldSeats: number;
  freeSeats: number;
};

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchDashboardData = useCallback(
    async (user: CurrentUser) => {
      const headers = {
        Authorization: `Bearer ${getToken()}`,
      };

      const [
        shiftsRes,
        timeEntriesRes,
        leaveRequestsRes,
        shiftTradesRes,
        moviesRes,
      ] = await Promise.all([
        fetch(`http://localhost:3001/shifts?date=${today}`, { headers }),
        fetch(`http://localhost:3001/time-entries?userId=${user.id}`, {
          headers,
        }),
        fetch("http://localhost:3001/leave-requests", { headers }),
        fetch("http://localhost:3001/shift-trades", { headers }),
        fetch(`http://localhost:3001/movie-showings?date=${today}`, {
          headers,
        }),
      ]);

      const shiftsData = await shiftsRes.json();
      const timeEntriesData = await timeEntriesRes.json();
      const leaveRequestsData = await leaveRequestsRes.json();
      const shiftTradesData = await shiftTradesRes.json();
      const moviesData = await moviesRes.json();

      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      setTimeEntries(Array.isArray(timeEntriesData) ? timeEntriesData : []);
      setLeaveRequests(Array.isArray(leaveRequestsData) ? leaveRequestsData : []);
      setShiftTrades(Array.isArray(shiftTradesData) ? shiftTradesData : []);
      setMovies(Array.isArray(moviesData) ? moviesData : []);
      },
      [today],
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);
    setCurrentUser(parsedUser);
    fetchDashboardData(parsedUser);
  }, [fetchDashboardData]);

  const todayPlannedHours = useMemo(() => {
    return shifts.reduce((total, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    }, 0);
  }, [shifts]);

  const myRegisteredHours = useMemo(() => {
    return timeEntries.reduce((total, entry) => {
      if (!entry.clockOut) return total;

      const start = new Date(entry.clockIn);
      const end = new Date(entry.clockOut);

      return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    }, 0);
  }, [timeEntries]);

  const pendingLeaveRequests = leaveRequests.filter(
    (request) => request.status === "PENDING",
  ).length;

  const openShiftTrades = shiftTrades.filter(
    (trade) => trade.status === "OPEN",
  ).length;

  const soldSeatsToday = movies.reduce(
    (total, movie) => total + movie.soldSeats,
    0,
  );

  const totalCapacityToday = movies.reduce(
    (total, movie) => total + movie.soldSeats + movie.freeSeats,
    0,
  );

  const occupancy =
    totalCapacityToday > 0
      ? ((soldSeatsToday / totalCapacityToday) * 100).toFixed(1)
      : "0.0";

  if (!currentUser) {
    return <p className="p-10">Indlæser...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">
          Velkommen, {currentUser.firstName}
        </h1>

        <p className="text-gray-500">
          Rolle: {currentUser.role} · Dagens overblik
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-500">Planlagte timer i dag</div>
          <div className="text-4xl font-bold mt-2">
            {todayPlannedHours.toFixed(1)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-500">Mine registrerede timer</div>
          <div className="text-4xl font-bold mt-2">
            {myRegisteredHours.toFixed(1)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-500">Afventende fridage</div>
          <div className="text-4xl font-bold mt-2">{pendingLeaveRequests}</div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-500">Åbne vagtbytter</div>
          <div className="text-4xl font-bold mt-2">{openShiftTrades}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Biograf i dag</h2>

          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span>Filmvisninger</span>
              <strong>{movies.length}</strong>
            </div>

            <div className="flex justify-between border-b pb-2">
              <span>Solgte billetter</span>
              <strong>{soldSeatsToday}</strong>
            </div>

            <div className="flex justify-between border-b pb-2">
              <span>Belægning</span>
              <strong>{occupancy}%</strong>
            </div>

            <div className="flex justify-between">
              <span>Vagter i dag</span>
              <strong>{shifts.length}</strong>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Genveje</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/schedule" className="bg-gray-100 rounded-lg p-4">
              Vagtplan
            </a>

            <a href="/my-shifts" className="bg-gray-100 rounded-lg p-4">
              Mine vagter
            </a>

            <a href="/clock" className="bg-gray-100 rounded-lg p-4">
              Clock ind/ud
            </a>

            <a href="/live" className="bg-gray-100 rounded-lg p-4">
              Live drift
            </a>

            <a href="/leave-requests" className="bg-gray-100 rounded-lg p-4">
              Fridage
            </a>

            <a href="/shift-trades" className="bg-gray-100 rounded-lg p-4">
              Vagtpulje
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
