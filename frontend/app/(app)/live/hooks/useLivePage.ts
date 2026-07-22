import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCinemaModules } from "@/app/providers/CinemaModulesProvider";
import { getTodayLocalDate } from "@/app/utils/dateTime";

import {
  isMovieActive,
  isShiftActive,
} from "../helpers/core/liveHelpers";
import type {
  MovieShowing,
  Shift,
  TimeEntry,
  User,
} from "../helpers/core/liveTypes";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

function getStoredMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    MASTER_SELECTED_CINEMA_ID_KEY,
  );
}

async function readOptionalJson<T>(
  response: Response,
): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as T;
}

function getSafeArray<T>(
  value: unknown,
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

export function useLivePage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const {
    loading: modulesLoading,
    hasCinemaContext,
    isModuleEnabled,
  } = useCinemaModules();
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(
    infoDialog.showError,
  );
  const hasShownLoadError =
    useRef(false);
  const requestVersionRef =
    useRef(0);

  const [users, setUsers] =
    useState<User[]>([]);
  const [
    timeEntries,
    setTimeEntries,
  ] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] =
    useState<Shift[]>([]);
  const [movies, setMovies] =
    useState<MovieShowing[]>([]);
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] = useState<string | null>(
    () =>
      getStoredMasterCinemaId(),
  );

  const today = useMemo(
    () => getTodayLocalDate(),
    [],
  );
  const isGlobalMaster =
    user?.role === "MASTER" &&
    !user.cinemaId;
  const needsMasterCinemaSelection =
    Boolean(
      isGlobalMaster &&
        !selectedMasterCinemaId,
    );

  const scheduleEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled("SCHEDULE");
  const timeTrackingEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled(
      "TIME_TRACKING",
    );
  const hasLiveDataModules =
    scheduleEnabled ||
    timeTrackingEnabled;

  const clearData = useCallback(
    () => {
      setUsers([]);
      setTimeEntries([]);
      setShifts([]);
      setMovies([]);
    },
    [],
  );

  useEffect(() => {
    showErrorRef.current =
      infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    function handleMasterCinemaChange() {
      requestVersionRef.current += 1;
      setSelectedMasterCinemaId(
        getStoredMasterCinemaId(),
      );
    }

    window.addEventListener(
      "masterSelectedCinemaChanged",
      handleMasterCinemaChange,
    );
    window.addEventListener(
      "storage",
      handleMasterCinemaChange,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        handleMasterCinemaChange,
      );
      window.removeEventListener(
        "storage",
        handleMasterCinemaChange,
      );
    };
  }, []);

  const fetchData = useCallback(
    async (
      showError = false,
    ) => {
      const requestVersion =
        ++requestVersionRef.current;

      if (
        authLoading ||
        modulesLoading ||
        !user
      ) {
        return;
      }

      if (
        needsMasterCinemaSelection ||
        !hasLiveDataModules
      ) {
        clearData();
        hasShownLoadError.current =
          false;
        return;
      }

      const masterCinemaQuery =
        selectedMasterCinemaId
          ? `cinemaId=${encodeURIComponent(
              selectedMasterCinemaId,
            )}`
          : "";
      const dateAndCinemaQuery =
        masterCinemaQuery
          ? `date=${today}&${masterCinemaQuery}`
          : `date=${today}`;

      try {
        const [
          usersResponse,
          shiftsResponse,
          moviesResponse,
        ] = await Promise.all([
          timeTrackingEnabled
            ? apiFetch(
                masterCinemaQuery
                  ? `/users?${masterCinemaQuery}`
                  : "/users",
              )
            : Promise.resolve(null),
          scheduleEnabled
            ? apiFetch(
                `/shifts?${dateAndCinemaQuery}`,
              )
            : Promise.resolve(null),
          scheduleEnabled
            ? apiFetch(
                `/movie-showings?${dateAndCinemaQuery}`,
              )
            : Promise.resolve(null),
        ]);

        if (
          usersResponse &&
          !usersResponse.ok
        ) {
          throw new Error(
            "Medarbejdere kunne ikke hentes.",
          );
        }

        if (
          shiftsResponse &&
          !shiftsResponse.ok
        ) {
          throw new Error(
            "Aktive vagter kunne ikke hentes.",
          );
        }

        if (
          moviesResponse &&
          !moviesResponse.ok
        ) {
          throw new Error(
            "Aktuelle filmvisninger kunne ikke hentes.",
          );
        }

        const [
          usersData,
          shiftsData,
          moviesData,
        ] = await Promise.all([
          usersResponse
            ? usersResponse.json()
            : Promise.resolve([]),
          shiftsResponse
            ? shiftsResponse.json()
            : Promise.resolve([]),
          moviesResponse
            ? moviesResponse.json()
            : Promise.resolve([]),
        ]);

        const safeUsers =
          getSafeArray<User>(
            usersData,
          );
        const safeShifts =
          getSafeArray<Shift>(
            shiftsData,
          );
        const safeMovies =
          getSafeArray<MovieShowing>(
            moviesData,
          );

        const entries =
          timeTrackingEnabled
            ? await Promise.all(
                safeUsers.map(
                  async (
                    userItem,
                  ) => {
                    const response =
                      await apiFetch(
                        `/time-entries/open?userId=${userItem.id}`,
                      );

                    if (!response.ok) {
                      return null;
                    }

                    const entry =
                      await readOptionalJson<TimeEntry>(
                        response,
                      );

                    return entry
                      ? {
                          ...entry,
                          userId:
                            userItem.id,
                        }
                      : null;
                  },
                ),
              )
            : [];

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        setUsers(
          timeTrackingEnabled
            ? safeUsers
            : [],
        );
        setTimeEntries(
          entries.filter(
            (
              entry,
            ): entry is TimeEntry =>
              entry !== null,
          ),
        );
        setShifts(
          scheduleEnabled
            ? safeShifts
            : [],
        );
        setMovies(
          scheduleEnabled
            ? safeMovies
            : [],
        );
        hasShownLoadError.current =
          false;
      } catch (error) {
        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        clearData();

        if (
          showError &&
          !hasShownLoadError.current
        ) {
          hasShownLoadError.current =
            true;
          showErrorRef.current(
            "Live-data kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da live-data skulle hentes.",
          );
        }
      }
    },
    [
      authLoading,
      clearData,
      hasLiveDataModules,
      modulesLoading,
      needsMasterCinemaSelection,
      scheduleEnabled,
      selectedMasterCinemaId,
      timeTrackingEnabled,
      today,
      user,
    ],
  );

  useEffect(() => {
    if (
      authLoading ||
      modulesLoading ||
      !user
    ) {
      return;
    }

    void fetchData(true);

    if (
      needsMasterCinemaSelection ||
      !hasLiveDataModules
    ) {
      return;
    }

    const interval = setInterval(
      () => {
        void fetchData(false);
      },
      30_000,
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    authLoading,
    fetchData,
    hasLiveDataModules,
    modulesLoading,
    needsMasterCinemaSelection,
    user,
  ]);

  const refreshSilently =
    useCallback(() => {
      void fetchData(false);
    }, [fetchData]);

  useRealtimeCore({
    enabled:
      hasLiveDataModules &&
      !modulesLoading &&
      !needsMasterCinemaSelection,
    onTimeEntry:
      timeTrackingEnabled
        ? refreshSilently
        : undefined,
    onShiftUpdated:
      scheduleEnabled
        ? refreshSilently
        : undefined,
    onMovieShowingUpdated:
      scheduleEnabled
        ? refreshSilently
        : undefined,
  });

  const activeShifts = useMemo(
    () =>
      shifts.filter(
        isShiftActive,
      ),
    [shifts],
  );
  const activeMovies = useMemo(
    () =>
      movies.filter(
        isMovieActive,
      ),
    [movies],
  );

  return {
    loading:
      authLoading ||
      modulesLoading,
    users,
    timeEntries,
    activeShifts,
    activeMovies,
    needsMasterCinemaSelection,
    moduleAccess: {
      schedule: scheduleEnabled,
      timeTracking:
        timeTrackingEnabled,
    },
    infoDialog,
  };
}
