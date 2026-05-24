"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AiStaffingHeatmap from "../../components/dashboard/AiStaffingHeatmap";
import AiLearningAnalytics from "../../components/dashboard/AiLearningAnalytics";
import AiPatternInsights from "../../components/dashboard/AiPatternInsights";
import AiOperationsCommandCenter from "../../components/dashboard/AiOperationsCommandCenter";
import OperationsStatus from "../../components/dashboard/OperationsStatus";

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
  user?: {
    firstName: string;
    lastName: string;
  };
  workType?: {
    name: string;
  };
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
  title?: string;
  hall?: string;
  startTime?: string;
  endTime?: string;
  soldSeats: number;
  freeSeats: number;
};

type StaffingHealth = "STABLE" | "HIGH_PRESSURE" | "CRITICAL";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatHours(value: number) {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  async function safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const fetchDashboardData = useCallback(
    async (user: CurrentUser) => {
      try {
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
          fetch(`${API_URL}/shifts?date=${today}`, { headers }),
          fetch(`${API_URL}/time-entries?userId=${user.id}`, { headers }),
          fetch(`${API_URL}/leave-requests`, { headers }),
          fetch(`${API_URL}/shift-trades`, { headers }),
          fetch(`${API_URL}/movie-showings?date=${today}`, { headers }),
        ]);

        const shiftsData = await safeJson(shiftsRes);
        const timeEntriesData = await safeJson(timeEntriesRes);
        const leaveRequestsData = await safeJson(leaveRequestsRes);
        const shiftTradesData = await safeJson(shiftTradesRes);
        const moviesData = await safeJson(moviesRes);

        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
        setTimeEntries(Array.isArray(timeEntriesData) ? timeEntriesData : []);
        setLeaveRequests(
          Array.isArray(leaveRequestsData) ? leaveRequestsData : [],
        );
        setShiftTrades(Array.isArray(shiftTradesData) ? shiftTradesData : []);
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      } catch {
        setShifts([]);
        setTimeEntries([]);
        setLeaveRequests([]);
        setShiftTrades([]);
        setMovies([]);
      }
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

  const seatLoadPercent =
    totalCapacityToday > 0
      ? Math.round((soldSeatsToday / totalCapacityToday) * 100)
      : 0;

  const staffingWarnings = useMemo(() => {
    const warnings: string[] = [];

    const todaysShiftCount = shifts.length;

    const totalSoldSeats = movies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    const averageLoad =
      todaysShiftCount > 0 ? totalSoldSeats / todaysShiftCount : totalSoldSeats;

    if (todaysShiftCount <= 2 && totalSoldSeats >= 150) {
      warnings.push(
        "Høj biografbelastning men meget få medarbejdere på arbejde.",
      );
    }

    if (averageLoad >= 60) {
      warnings.push("Høj belastning pr medarbejder registreret i dag.");
    }

    const overtimeRisk = shifts.some((shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

    if (overtimeRisk) {
      warnings.push("Der er vagter i dag med overtime-risiko.");
    }

    return warnings;
  }, [movies, shifts]);

  const operationsHealth = useMemo(() => {
    const activeShiftCount = shifts.length;

    const highFatigueEmployees = shifts.filter((shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    }).length;

    const moviePressure = movies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    let staffingHealth: StaffingHealth = "STABLE";

    if (moviePressure >= 400 || highFatigueEmployees >= 4) {
      staffingHealth = "HIGH_PRESSURE";
    }

    if (moviePressure >= 600 || highFatigueEmployees >= 6) {
      staffingHealth = "CRITICAL";
    }

    return {
      activeShiftCount,
      highFatigueEmployees,
      moviePressure,
      staffingHealth,
    };
  }, [movies, shifts]);

  const operationalRecommendations = useMemo(() => {
    const recommendations: string[] = [];

    if (operationsHealth.staffingHealth === "HIGH_PRESSURE") {
      recommendations.push(
        "🤖 AI anbefaler ekstra staffing mellem peak-timerne.",
      );
    }

    if (operationsHealth.staffingHealth === "CRITICAL") {
      recommendations.push(
        "🚨 Kritisk staffing pressure registreret — emergency staffing anbefales.",
      );
    }

    if (operationsHealth.highFatigueEmployees >= 3) {
      recommendations.push(
        "🤖 Flere medarbejdere nærmer sig fatigue-grænser — overvej omfordeling.",
      );
    }

    if (operationsHealth.moviePressure >= 500) {
      recommendations.push(
        "🤖 Høj movie pressure registreret — foyer og billetsalg bør styrkes.",
      );
    }

    if (
      operationsHealth.activeShiftCount <= 3 &&
      operationsHealth.moviePressure >= 300
    ) {
      recommendations.push("🚨 Risiko for underbemanding registreret.");
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "✅ AI-systemet vurderer at driften er stabil lige nu.",
      );
    }

    return recommendations;
  }, [operationsHealth]);

  const staffingHeatmap = useMemo(() => {
    return shifts.map((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      let risk = "LOW";

      if (hours >= 8) {
        risk = "MEDIUM";
      }

      if (hours >= 10) {
        risk = "HIGH";
      }

      return {
        id: shift.id,
        employee: shift.user?.firstName + " " + shift.user?.lastName,
        workType: shift.workType?.name,
        risk,
        hours: hours.toFixed(1),
      };
    });
  }, [shifts]);

  const liveOperationsStatus = useMemo(() => {
    const moviePressure = operationsHealth.moviePressure;

    const fatigue = operationsHealth.highFatigueEmployees;

    const staffingHealth = operationsHealth.staffingHealth;

    let status = "NORMAL";

    if (
      staffingHealth === "HIGH_PRESSURE" ||
      fatigue >= 4 ||
      moviePressure >= 400
    ) {
      status = "WARNING";
    }

    if (staffingHealth === "CRITICAL" || fatigue >= 6 || moviePressure >= 600) {
      status = "CRITICAL";
    }

    return status;
  }, [operationsHealth]);

  const predictiveStaffing = useMemo(() => {
    const predictions: string[] = [];

    const eveningMovies = movies.filter((movie) => {
      if (!movie.startTime) return false;

      const hour = new Date(movie.startTime).getHours();

      return hour >= 18 && hour <= 22;
    });

    const eveningSoldSeats = eveningMovies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    const eveningShiftCount = shifts.filter((shift) => {
      const hour = new Date(shift.startTime).getHours();

      return hour >= 18 && hour <= 22;
    }).length;

    if (eveningSoldSeats >= 200 && eveningShiftCount <= 4) {
      predictions.push(
        "📈 Fredag/lørdag aften forventes høj staffing pressure.",
      );
    }

    if (eveningSoldSeats >= 300 && eveningShiftCount <= 5) {
      predictions.push("📈 Risiko for underbemanding i peak timer 18-22.");
    }

    const overtimeRisk = shifts.some((shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

    if (overtimeRisk) {
      predictions.push(
        "📈 Høj sandsynlighed for overtime belastning i denne uge.",
      );
    }

    const totalSoldSeats = movies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    if (totalSoldSeats >= 500) {
      predictions.push("📈 Biografen forventes at få en travl dag.");
    }

    return predictions;
  }, [movies, shifts]);

  const aiLearningAnalytics = useMemo(() => {
    const emergencyEvents = movies.filter(
      (movie) => movie.soldSeats >= 200,
    ).length;

    const fatigueTrend = shifts.filter((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    }).length;

    const overtimeTrend = shifts.filter((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 10;
    }).length;

    const aiInterventions = staffingWarnings.length + predictiveStaffing.length;

    return {
      emergencyEvents,
      fatigueTrend,
      overtimeTrend,
      aiInterventions,
    };
  }, [movies, predictiveStaffing, shifts, staffingWarnings]);

  const aiPatternInsights = useMemo(() => {
    const weekdayMap: Record<string, number> = {};

    const peakHourMap: Record<string, number> = {};

    shifts.forEach((shift) => {
      const start = new Date(shift.startTime);

      const weekday = start.toLocaleDateString("da-DK", {
        weekday: "long",
      });

      const hour = start.getHours();

      weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;

      peakHourMap[hour] = (peakHourMap[hour] || 0) + 1;
    });

    const busiestDay = Object.entries(weekdayMap).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const busiestHour = Object.entries(peakHourMap).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const highFatigueEmployees = staffingHeatmap.filter(
      (item) => item.risk === "HIGH",
    ).length;

    return {
      busiestDay: busiestDay?.[0] || "Ingen data",

      busiestDayCount: busiestDay?.[1] || 0,

      busiestHour: busiestHour?.[0] || "Ingen data",

      busiestHourCount: busiestHour?.[1] || 0,

      highFatigueEmployees,
    };
  }, [shifts, staffingHeatmap]);

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="text-gray-600">Indlæser...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">
            Velkommen, {currentUser.firstName}
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Her er dagens overblik for biografen.
          </p>
        </section>

        <AiOperationsCommandCenter
          operationsHealth={operationsHealth}
          operationalRecommendations={operationalRecommendations}
        />

        <OperationsStatus liveOperationsStatus={liveOperationsStatus} />

        <AiStaffingHeatmap staffingHeatmap={staffingHeatmap} />

        <AiLearningAnalytics aiLearningAnalytics={aiLearningAnalytics} />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Planlagte timer i dag
            </div>

            <div className="mt-2 text-3xl font-bold">
              {formatHours(todayPlannedHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mine registrerede timer
            </div>

            <div className="mt-2 text-3xl font-bold">
              {formatHours(myRegisteredHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Åbne vagtbytter
            </div>

            <div className="mt-2 text-3xl font-bold">{openShiftTrades}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afventer fridage
            </div>

            <div className="mt-2 text-3xl font-bold">
              {pendingLeaveRequests}
            </div>
          </div>
        </section>

        {staffingWarnings.length > 0 && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-orange-900 dark:bg-orange-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">⚠️</div>

              <div>
                <h2 className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  Staffing Intelligence
                </h2>

                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Systemet har fundet potentielle bemandingsproblemer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-orange-200 bg-white p-4 text-sm text-orange-700 dark:border-orange-900 dark:bg-gray-900 dark:text-orange-300"
                >
                  {warning}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm dark:border-purple-900 dark:bg-purple-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">📈</div>

            <div>
              <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                Predictive Staffing
              </h2>

              <p className="text-sm text-purple-600 dark:text-purple-400">
                Systemet forudsiger fremtidig staffing pressure.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(predictiveStaffing.length > 0
              ? predictiveStaffing
              : ["Ingen predictive staffing alerts lige nu."]
            ).map((prediction, index) => (
              <div
                key={index}
                className="rounded-xl border border-purple-200 bg-white p-4 text-sm text-purple-700 dark:border-purple-900 dark:bg-gray-900 dark:text-purple-300"
              >
                {prediction}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold">Biograf i dag</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Forestillinger
                </span>
                <span className="font-medium">{movies.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Solgte billetter
                </span>
                <span className="font-medium">{soldSeatsToday}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Belægning
                </span>
                <span className="font-medium">{seatLoadPercent}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Vagter i dag
                </span>
                <span className="font-medium">{shifts.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold">Genveje</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href="/schedule"
                className="rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
              >
                Vagtplan
              </a>

              <a
                href="/time-entries"
                className="rounded-xl bg-green-600 px-4 py-3 text-center font-medium text-white hover:bg-green-700"
              >
                Tidsregistrering
              </a>

              <a
                href="/shift-trades"
                className="rounded-xl bg-purple-600 px-4 py-3 text-center font-medium text-white hover:bg-purple-700"
              >
                Vagtbytte
              </a>

              <a
                href="/payroll"
                className="rounded-xl bg-gray-800 px-4 py-3 text-center font-medium text-white hover:bg-gray-900"
              >
                Payroll
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
