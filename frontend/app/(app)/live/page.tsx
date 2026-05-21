"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  userId: number;
};

type Shift = {
  id: number;
  startTime: string;
  endTime: string;
  userId: number;
  user: User;
  workType: {
    name: string;
    color: string;
  };
};

type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

export default function LivePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchData = useCallback(async () => {
    try {
      const headers = {
        Authorization: `Bearer ${getToken()}`,
      };

      const [usersRes, shiftsRes, moviesRes] = await Promise.all([
        fetch(`${API_URL}/users`, { headers }),

        fetch(`${API_URL}/shifts?date=${today}`, {
          headers,
        }),

        fetch(`${API_URL}/movie-showings?date=${today}`, {
          headers,
        }),
      ]);

      const usersData: User[] = await usersRes.json();

      const shiftsData: Shift[] = await shiftsRes.json();

      const moviesData: MovieShowing[] =
        await moviesRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);

      setShifts(
        Array.isArray(shiftsData) ? shiftsData : [],
      );

      setMovies(
        Array.isArray(moviesData) ? moviesData : [],
      );

      const allEntries: TimeEntry[] = [];

      for (const user of usersData) {
        const res = await fetch(
          `${API_URL}/time-entries/open?userId=${user.id}`,
          { headers },
        );

        const entry: TimeEntry | null =
          await res.json();

        if (entry) {
          allEntries.push({
            ...entry,
            userId: user.id,
          });
        }
      }

      setTimeEntries(allEntries);
    } catch {
      setUsers([]);
      setShifts([]);
      setMovies([]);
      setTimeEntries([]);
    }
  }, [today]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const socket = io(API_URL);

    socket.on("timeEntriesUpdated", () => {
      fetchData();
    });

    socket.on("shiftsUpdated", () => {
      fetchData();
    });

    socket.on("movieShowingsUpdated", () => {
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  function getUserName(userId: number) {
    const user = users.find(
      (item) => item.id === userId,
    );

    return user
      ? `${user.firstName} ${user.lastName}`
      : "Ukendt";
  }

  function isShiftActive(shift: Shift) {
    const now = new Date();

    const start = new Date(shift.startTime);

    const end = new Date(shift.endTime);

    return now >= start && now <= end;
  }

  function isMovieActive(movie: MovieShowing) {
    const now = new Date();

    const start = new Date(movie.startTime);

    const end = new Date(movie.endTime);

    return now >= start && now <= end;
  }

  const activeShifts = useMemo(() => {
    return shifts.filter(isShiftActive);
  }, [shifts]);

  const activeMovies = useMemo(() => {
    return movies.filter(isMovieActive);
  }, [movies]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">
            Live driftsskærm
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Overblik over bemanding, clock-ins og film
            lige nu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Clocked ind nu
              </h2>

              <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-semibold text-white">
                {timeEntries.length}
              </span>
            </div>

            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-green-200 bg-green-50 p-4 transition-colors dark:border-green-900 dark:bg-green-950/40"
                >
                  <div className="font-bold">
                    {getUserName(entry.userId)}
                  </div>

                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Clocked ind siden{" "}
                    {new Date(
                      entry.clockIn,
                    ).toLocaleTimeString("da-DK")}
                  </div>
                </div>
              ))}

              {timeEntries.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                  Ingen er clocked ind lige nu.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Aktive vagter
              </h2>

              <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
                {activeShifts.length}
              </span>
            </div>

            <div className="space-y-3">
              {activeShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 transition-colors dark:border-gray-800"
                >
                  <div
                    className="h-2"
                    style={{
                      backgroundColor:
                        shift.workType.color,
                    }}
                  />

                  <div className="p-4">
                    <div className="font-bold">
                      {shift.user.firstName}{" "}
                      {shift.user.lastName}
                    </div>

                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {shift.workType.name}
                    </div>

                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(
                        shift.startTime,
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(
                        shift.endTime,
                      ).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {activeShifts.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                  Ingen aktive vagter lige nu.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Film lige nu
              </h2>

              <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
                {activeMovies.length}
              </span>
            </div>

            <div className="space-y-3">
              {activeMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-gray-800 dark:bg-gray-950"
                >
                  <div className="font-bold">
                    {movie.title}
                  </div>

                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {movie.hall}
                  </div>

                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {movie.soldSeats} solgt ·{" "}
                    {movie.freeSeats} ledige
                  </div>
                </div>
              ))}

              {activeMovies.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                  Ingen film kører lige nu.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}