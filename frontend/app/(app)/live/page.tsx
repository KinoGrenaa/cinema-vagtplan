"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { getTodayLocalDate } from "@/app/utils/dateTime";
import { LiveActiveMoviesSection } from "./components/LiveActiveMoviesSection";
import { LiveActiveShiftsSection } from "./components/LiveActiveShiftsSection";
import { LiveClockedInSection } from "./components/LiveClockedInSection";
import { LiveHeader } from "./components/LiveHeader";
import { isMovieActive, isShiftActive } from "./helpers/liveHelpers";
import type { MovieShowing, Shift, TimeEntry, User } from "./helpers/liveTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function readOptionalJson<T>(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as T;
}

export default function LivePage() {
  const infoDialog = useInfoModal();
  const hasShownLoadError = useRef(false);

  const [users, setUsers] = useState<User[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const today = getTodayLocalDate();

  const fetchData = useCallback(
    async (showError = false) => {
      try {
        const [usersRes, shiftsRes, moviesRes] = await Promise.all([
          apiFetch("/users"),
          apiFetch(`/shifts?date=${today}`),
          apiFetch(`/movie-showings?date=${today}`),
        ]);

        if (!usersRes.ok || !shiftsRes.ok || !moviesRes.ok) {
          throw new Error("Live-data kunne ikke hentes.");
        }

        const usersData: User[] = await usersRes.json();
        const shiftsData: Shift[] = await shiftsRes.json();
        const moviesData: MovieShowing[] = await moviesRes.json();

        const safeUsers = Array.isArray(usersData) ? usersData : [];

        setUsers(safeUsers);
        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
        setMovies(Array.isArray(moviesData) ? moviesData : []);

        const allEntries: TimeEntry[] = [];

        for (const user of safeUsers) {
          const res = await apiFetch(`/time-entries/open?userId=${user.id}`);

          if (!res.ok) continue;

          const entry = await readOptionalJson<TimeEntry>(res);

          if (entry) {
            allEntries.push({
              ...entry,
              userId: user.id,
            });
          }
        }

        setTimeEntries(allEntries);
        hasShownLoadError.current = false;
      } catch (error) {
        setUsers([]);
        setShifts([]);
        setMovies([]);
        setTimeEntries([]);

        if (showError && !hasShownLoadError.current) {
          hasShownLoadError.current = true;

          infoDialog.showError(
            "Live-data kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da live-data skulle hentes.",
          );
        }
      }
    },
    [today],
  );

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => fetchData(false), 30000);

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

  const activeShifts = useMemo(() => {
    return shifts.filter(isShiftActive);
  }, [shifts]);

  const activeMovies = useMemo(() => {
    return movies.filter(isMovieActive);
  }, [movies]);

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <LiveHeader />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <LiveClockedInSection timeEntries={timeEntries} users={users} />
            <LiveActiveShiftsSection activeShifts={activeShifts} />
            <LiveActiveMoviesSection activeMovies={activeMovies} />
          </div>
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
