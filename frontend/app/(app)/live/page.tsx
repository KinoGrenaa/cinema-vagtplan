"use client";

import { useCallback, useEffect, useState } from "react";
import AppMenu from "../../components/AppMenu";
import { io } from "socket.io-client";

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
    const headers = {
      Authorization: `Bearer ${getToken()}`,
    };

    const [usersRes, shiftsRes, moviesRes] = await Promise.all([
      fetch("${process.env.NEXT_PUBLIC_API_URL}/users", { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/shifts?date=${today}`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/movie-showings?date=${today}`, { headers }),
    ]);

    const usersData: User[] = await usersRes.json();
    const shiftsData: Shift[] = await shiftsRes.json();
    const moviesData: MovieShowing[] = await moviesRes.json();

    setUsers(usersData);
    setShifts(shiftsData);
    setMovies(moviesData);

    const allEntries: TimeEntry[] = [];

    for (const user of usersData) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/time-entries/open?userId=${user.id}`,
        { headers },
      );

      const entry: TimeEntry | null = await res.json();

      if (entry) {
        allEntries.push({
          ...entry,
          userId: user.id,
        });
      }
    }

    setTimeEntries(allEntries);
  }, [today]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const socket = io("${process.env.NEXT_PUBLIC_API_URL}");

    socket.on("timeEntriesUpdated", () => {
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  function getUserName(userId: number) {
    const user = users.find((item) => item.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Ukendt";
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

  const activeShifts = shifts.filter(isShiftActive);
  const activeMovies = movies.filter(isMovieActive);

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Live driftsskærm</h1>
        <p className="text-gray-500">
          Overblik over bemanding, clock-ins og film lige nu.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Clocked ind nu</h2>

          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-green-50">
                <div className="font-bold">{getUserName(entry.userId)}</div>
                <div className="text-sm text-gray-600">
                  Siden {new Date(entry.clockIn).toLocaleTimeString("da-DK")}
                </div>
              </div>
            ))}

            {timeEntries.length === 0 && (
              <div className="text-gray-500">Ingen er clocked ind.</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Aktive vagter</h2>

          <div className="space-y-3">
            {activeShifts.map((shift) => (
              <div key={shift.id} className="border rounded-lg p-4">
                <div className="font-bold">
                  {shift.user.firstName} {shift.user.lastName}
                </div>

                <div className="text-sm">{shift.workType.name}</div>

                <div className="text-sm text-gray-600">
                  {new Date(shift.startTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(shift.endTime).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}

            {activeShifts.length === 0 && (
              <div className="text-gray-500">Ingen aktive vagter.</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Film lige nu</h2>

          <div className="space-y-3">
            {activeMovies.map((movie) => (
              <div key={movie.id} className="border rounded-lg p-4">
                <div className="font-bold">{movie.title}</div>
                <div className="text-sm">{movie.hall}</div>
                <div className="text-sm text-gray-600">
                  {movie.soldSeats} solgt / {movie.freeSeats} ledige
                </div>
              </div>
            ))}

            {activeMovies.length === 0 && (
              <div className="text-gray-500">Ingen film kører lige nu.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
