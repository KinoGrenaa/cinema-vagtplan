import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { getTodayLocalDate } from "@/app/utils/dateTime";
import { isMovieActive, isShiftActive } from "../helpers/liveHelpers";
import type { MovieShowing, Shift, TimeEntry, User } from "../helpers/liveTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function readOptionalJson<T>(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as T;
}

export function useLivePage() {
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(infoDialog.showError);
  const hasShownLoadError = useRef(false);

  const [users, setUsers] = useState<User[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const today = getTodayLocalDate();

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

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

          showErrorRef.current(
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

  return {
    users,
    timeEntries,
    activeShifts,
    activeMovies,
    infoDialog,
  };
}
