import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { getTodayLocalDate } from "@/app/utils/dateTime";

import { isMovieActive, isShiftActive } from "../helpers/liveHelpers";
import type { MovieShowing, Shift, TimeEntry, User } from "../helpers/liveTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

function getStoredMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY);
}

async function readOptionalJson<T>(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as T;
}

export function useLivePage() {
  const { user, loading: authLoading } = useAuth();
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(infoDialog.showError);
  const hasShownLoadError = useRef(false);
  const [users, setUsers] = useState<User[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<string | null>(
    () => getStoredMasterCinemaId(),
  );
  const today = getTodayLocalDate();
  const isGlobalMaster = user?.role === "MASTER" && !user.cinemaId;
  const needsMasterCinemaSelection = Boolean(isGlobalMaster && !selectedMasterCinemaId);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    function handleMasterCinemaChange() {
      setSelectedMasterCinemaId(getStoredMasterCinemaId());
    }

    window.addEventListener("masterSelectedCinemaChanged", handleMasterCinemaChange);
    window.addEventListener("storage", handleMasterCinemaChange);

    return () => {
      window.removeEventListener("masterSelectedCinemaChanged", handleMasterCinemaChange);
      window.removeEventListener("storage", handleMasterCinemaChange);
    };
  }, []);

  const fetchData = useCallback(
    async (showError = false) => {
      if (authLoading || !user) {
        return;
      }

      if (needsMasterCinemaSelection) {
        setUsers([]);
        setShifts([]);
        setMovies([]);
        setTimeEntries([]);
        hasShownLoadError.current = false;
        return;
      }

      const masterCinemaQuery = selectedMasterCinemaId
        ? `cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
        : "";
      const dateAndCinemaQuery = masterCinemaQuery
        ? `date=${today}&${masterCinemaQuery}`
        : `date=${today}`;

      try {
        const [usersRes, shiftsRes, moviesRes] = await Promise.all([
          apiFetch(masterCinemaQuery ? `/users?${masterCinemaQuery}` : "/users"),
          apiFetch(`/shifts?${dateAndCinemaQuery}`),
          apiFetch(`/movie-showings?${dateAndCinemaQuery}`),
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

        for (const userItem of safeUsers) {
          const res = await apiFetch(`/time-entries/open?userId=${userItem.id}`);

          if (!res.ok) continue;
          const entry = await readOptionalJson<TimeEntry>(res);

          if (entry) {
            allEntries.push({
              ...entry,
              userId: userItem.id,
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
    [authLoading, needsMasterCinemaSelection, selectedMasterCinemaId, today, user],
  );

  useEffect(() => {
    fetchData(true);

    if (authLoading || needsMasterCinemaSelection) {
      return;
    }

    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [authLoading, fetchData, needsMasterCinemaSelection]);

  useEffect(() => {
    if (authLoading || needsMasterCinemaSelection) {
      return;
    }

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
  }, [authLoading, fetchData, needsMasterCinemaSelection]);

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
    needsMasterCinemaSelection,
    infoDialog,
  };
}
