"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useAuth } from "../providers/AuthProvider";
import { localDateTimeToISOString } from "@/app/utils/dateTime";

import type {
  Shift,
  User,
  WorkType,
  LeaveRequest,
} from "../../../shared/types";

type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

type CreateShiftInput = {
  startTime: string;
  endTime: string;
  note?: string;
  userId: number;
  workTypeId: number;
};

type UpdateShiftInput = {
  startTime: string;
  endTime: string;
  note?: string | null;
  userId: number;
  workTypeId: number;
};

type ManualTimeInput = {
  shiftId?: number | null;
  clockIn: string;
  clockOut: string;
  note: string;
};

type OpenTimeEntry = {
  shift?: {
    id: number;
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  } | null;
  id: number;
  clockIn: string;
  clockOut?: string | null;
  shiftId?: number | null;
  userId: number;
  cinemaId: number;
};

type ScheduleTimeEntry = {
  id: number;
  shiftId?: number | null;
  status: "PENDING" | "APPROVED" | "NEEDS_CHANGES" | "VOIDED";
  clockIn: string;
  clockOut?: string | null;
};

type ScheduleErrorHandler = (title: string, description: string) => void;

type UseScheduleOptions = {
  onError?: ScheduleErrorHandler;
};

type BackgroundFetchOptions = {
  reportError?: boolean;
};

type RefreshDayDataOptions = {
  showErrors?: boolean;
  showLoading?: boolean;
};

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;

  const cinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;

  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);

  if (typeof payload?.message === "string") {
    return payload.message;
  }

  return fallback;
}

export function useSchedule(
  selectedDate: string,
  options: UseScheduleOptions = {},
) {
  const { apiFetch } = useApi();
  const onErrorRef = useRef<ScheduleErrorHandler | undefined>(options.onError);

  useEffect(() => {
    onErrorRef.current = options.onError;
  }, [options.onError]);

  const reportBackgroundError = useCallback(
    (title: string, description: string) => {
      onErrorRef.current?.(title, description);
    },
    [],
  );

  const { user, loading: authLoading, isAdmin } = useAuth();
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateSelectedCinema();

    window.addEventListener("storage", updateSelectedCinema);
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener("storage", updateSelectedCinema);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const activeCinemaId = useMemo(() => {
    if (!user) return null;

    if (user.role === "MASTER" && !user.cinemaId) {
      return selectedMasterCinemaId;
    }

    return user.cinemaId ?? null;
  }, [selectedMasterCinemaId, user]);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  const appendActiveCinemaId = useCallback(
    (endpoint: string) => {
      if (user?.role === "MASTER" && !user.cinemaId) {
        return appendCinemaId(endpoint, activeCinemaId);
      }

      return endpoint;
    },
    [activeCinemaId, user],
  );

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [movieShowings, setMovieShowings] = useState<MovieShowing[]>([]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [openTimeEntry, setOpenTimeEntry] = useState<OpenTimeEntry | null>(
    null,
  );
  const [timeEntries, setTimeEntries] = useState<ScheduleTimeEntry[]>([]);

  const [loading, setLoading] = useState(true);

  const canManageShifts = isAdmin;

  const fetchUsers = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (needsMasterCinemaSelection) {
        setUsers([]);
        return true;
      }
      try {
        const response = await apiFetch(appendActiveCinemaId("/users"));

        if (!response.ok) {
          setUsers([]);

          if (reportError) {
            reportBackgroundError(
              "Medarbejdere kunne ikke hentes",
              await readErrorMessage(
                response,
                "Kunne ikke hente medarbejdere.",
              ),
            );
          }

          return false;
        }

        const data = await response.json();

        const usersArray: User[] = Array.isArray(data)
          ? data
          : Array.isArray(data.users)
            ? data.users
            : [];

        setUsers(usersArray);
        return true;
      } catch {
        setUsers([]);

        if (reportError) {
          reportBackgroundError(
            "Medarbejdere kunne ikke hentes",
            "Der opstod en fejl, da medarbejdere skulle hentes.",
          );
        }

        return false;
      }
    },
    [
      apiFetch,
      appendActiveCinemaId,
      needsMasterCinemaSelection,
      reportBackgroundError,
    ],
  );

  const fetchWorkTypes = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (needsMasterCinemaSelection) {
        setWorkTypes([]);
        return true;
      }
      try {
        const response = await apiFetch(appendActiveCinemaId("/work-types"));

        if (!response.ok) {
          setWorkTypes([]);

          if (reportError) {
            reportBackgroundError(
              "Vagttyper kunne ikke hentes",
              await readErrorMessage(response, "Kunne ikke hente vagttyper."),
            );
          }

          return false;
        }

        const data = await response.json();

        const workTypesArray: WorkType[] = Array.isArray(data)
          ? data
          : Array.isArray(data.workTypes)
            ? data.workTypes
            : [];

        setWorkTypes(workTypesArray);
        return true;
      } catch {
        setWorkTypes([]);

        if (reportError) {
          reportBackgroundError(
            "Vagttyper kunne ikke hentes",
            "Der opstod en fejl, da vagttyper skulle hentes.",
          );
        }

        return false;
      }
    },
    [
      apiFetch,
      appendActiveCinemaId,
      needsMasterCinemaSelection,
      reportBackgroundError,
    ],
  );

  const fetchShifts = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (needsMasterCinemaSelection) {
        setShifts([]);
        return true;
      }
      try {
        const response = await apiFetch(
          appendActiveCinemaId(`/shifts?date=${selectedDate}`),
        );

        if (!response.ok) {
          setShifts([]);

          if (reportError) {
            reportBackgroundError(
              "Vagter kunne ikke hentes",
              await readErrorMessage(response, "Kunne ikke hente vagter."),
            );
          }

          return false;
        }

        const data = await response.json();

        const shiftsArray: Shift[] = Array.isArray(data) ? data : [];

        setShifts(shiftsArray);
        return true;
      } catch {
        setShifts([]);

        if (reportError) {
          reportBackgroundError(
            "Vagter kunne ikke hentes",
            "Der opstod en fejl, da vagter skulle hentes.",
          );
        }

        return false;
      }
    },
    [
      apiFetch,
      appendActiveCinemaId,
      needsMasterCinemaSelection,
      reportBackgroundError,
      selectedDate,
    ],
  );

  const fetchMovieShowings = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      try {
        const response = await fetch("/mock/movie-showings.json");

        if (!response.ok) {
          setMovieShowings([]);

          if (reportError) {
            reportBackgroundError(
              "Filmprogram kunne ikke hentes",
              "Kunne ikke hente filmprogrammet.",
            );
          }

          return false;
        }

        const data = await response.json();

        const movieShowingsArray: MovieShowing[] = Array.isArray(data)
          ? data
          : [];

        setMovieShowings(movieShowingsArray);
        return true;
      } catch {
        setMovieShowings([]);

        if (reportError) {
          reportBackgroundError(
            "Filmprogram kunne ikke hentes",
            "Der opstod en fejl, da filmprogrammet skulle hentes.",
          );
        }

        return false;
      }
    },
    [reportBackgroundError],
  );

  const fetchLeaveRequests = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (needsMasterCinemaSelection) {
        setLeaveRequests([]);
        return true;
      }
      try {
        const response = await apiFetch(
          appendActiveCinemaId("/leave-requests"),
        );

        if (!response.ok) {
          setLeaveRequests([]);

          if (reportError) {
            reportBackgroundError(
              "Fravær kunne ikke hentes",
              await readErrorMessage(response, "Kunne ikke hente fravær."),
            );
          }

          return false;
        }

        const data = await response.json();

        const leaveRequestsArray: LeaveRequest[] = Array.isArray(data)
          ? data
          : [];

        setLeaveRequests(leaveRequestsArray);
        return true;
      } catch {
        setLeaveRequests([]);

        if (reportError) {
          reportBackgroundError(
            "Fravær kunne ikke hentes",
            "Der opstod en fejl, da fravær skulle hentes.",
          );
        }

        return false;
      }
    },
    [
      apiFetch,
      appendActiveCinemaId,
      needsMasterCinemaSelection,
      reportBackgroundError,
    ],
  );

  const fetchOpenTimeEntry = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (!user) {
        setOpenTimeEntry(null);
        return true;
      }

      try {
        const response = await apiFetch(`/time-entries/open?userId=${user.id}`);

        if (response.status === 404 || response.status === 204) {
          setOpenTimeEntry(null);
          return true;
        }

        if (!response.ok) {
          setOpenTimeEntry(null);

          if (reportError) {
            reportBackgroundError(
              "Åben tidsregistrering kunne ikke hentes",
              await readErrorMessage(
                response,
                "Kunne ikke hente åben tidsregistrering.",
              ),
            );
          }

          return false;
        }

        const text = await response.text();

        if (!text.trim()) {
          setOpenTimeEntry(null);
          return true;
        }

        const data = JSON.parse(text);
        setOpenTimeEntry(data ?? null);
        return true;
      } catch {
        setOpenTimeEntry(null);

        if (reportError) {
          reportBackgroundError(
            "Åben tidsregistrering kunne ikke hentes",
            "Der opstod en fejl, da åben tidsregistrering skulle hentes.",
          );
        }

        return false;
      }
    },
    [apiFetch, reportBackgroundError, user],
  );

  const fetchMyTimeEntries = useCallback(
    async ({ reportError = true }: BackgroundFetchOptions = {}) => {
      if (!user) {
        setTimeEntries([]);
        return true;
      }

      try {
        const response = await apiFetch("/time-entries/me");

        if (!response.ok) {
          setTimeEntries([]);

          if (reportError) {
            reportBackgroundError(
              "Tidsregistreringer kunne ikke hentes",
              await readErrorMessage(
                response,
                "Kunne ikke hente tidsregistreringer.",
              ),
            );
          }

          return false;
        }

        const data = await response.json();

        const entriesArray: ScheduleTimeEntry[] = Array.isArray(data)
          ? data
          : [];

        setTimeEntries(entriesArray);
        return true;
      } catch {
        setTimeEntries([]);

        if (reportError) {
          reportBackgroundError(
            "Tidsregistreringer kunne ikke hentes",
            "Der opstod en fejl, da tidsregistreringer skulle hentes.",
          );
        }

        return false;
      }
    },
    [apiFetch, reportBackgroundError, user],
  );

  const refreshDayData = useCallback(
    async ({
      showErrors = true,
      showLoading = true,
    }: RefreshDayDataOptions = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const dataFetches = [
          {
            label: "vagter",
            run: () => fetchShifts({ reportError: false }),
          },
          {
            label: "filmprogram",
            run: () => fetchMovieShowings({ reportError: false }),
          },
          {
            label: "fravær",
            run: () => fetchLeaveRequests({ reportError: false }),
          },
          {
            label: "åben tidsregistrering",
            run: () => fetchOpenTimeEntry({ reportError: false }),
          },
          {
            label: "mine tidsregistreringer",
            run: () => fetchMyTimeEntries({ reportError: false }),
          },
        ];

        const results = await Promise.all(
          dataFetches.map((item) => item.run()),
        );

        const failedFetches = dataFetches
          .filter((_, index) => !results[index])
          .map((item) => item.label);

        if (showErrors && failedFetches.length > 0) {
          reportBackgroundError(
            "Vagtplandata kunne ikke hentes",
            `Følgende data kunne ikke hentes: ${failedFetches.join(
              ", ",
            )}. Prøv at opdatere siden.`,
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [
      fetchShifts,
      fetchMovieShowings,
      fetchLeaveRequests,
      fetchOpenTimeEntry,
      fetchMyTimeEntries,
      reportBackgroundError,
    ],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchUsers();
    fetchWorkTypes();
  }, [authLoading, fetchUsers, fetchWorkTypes, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    refreshDayData();
  }, [authLoading, refreshDayData, user]);

  const createShift = useCallback(
    async (input: CreateShiftInput) => {
      const response = await apiFetch("/shifts", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ...(user?.role === "MASTER" && !user.cinemaId
            ? { cinemaId: activeCinemaId }
            : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.message || "Kunne ikke oprette vagt");
      }

      await refreshDayData();
    },
    [activeCinemaId, apiFetch, refreshDayData, user],
  );

  const updateShift = useCallback(
    async (shiftId: number, input: UpdateShiftInput) => {
      const response = await apiFetch(`/shifts/${shiftId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...input,
          ...(user?.role === "MASTER" && !user.cinemaId
            ? { cinemaId: activeCinemaId }
            : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.message || "Kunne ikke opdatere vagt");
      }

      await refreshDayData();
    },
    [activeCinemaId, apiFetch, refreshDayData, user],
  );

  const deleteShift = useCallback(
    async (shiftId: number) => {
      const response = await apiFetch(
        user?.role === "MASTER" && !user.cinemaId
          ? appendCinemaId(`/shifts/${shiftId}`, activeCinemaId)
          : `/shifts/${shiftId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Kunne ikke slette vagt");
      }

      await refreshDayData();
    },
    [activeCinemaId, apiFetch, refreshDayData, user],
  );

  const offerShiftTrade = useCallback(
    async (shift: Shift) => {
      if (!user) return;

      const response = await apiFetch("/shift-trades", {
        method: "POST",
        body: JSON.stringify({
          shiftId: shift.id,
          offeredByUserId: shift.userId,
          cinemaId: user.cinemaId,
          message: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke sende vagten i byttepuljen");
      }

      await refreshDayData();
    },
    [apiFetch, refreshDayData, user],
  );

  const clockIn = useCallback(
    async (shiftId?: number | null, clockInTime?: string, note?: string) => {
      if (!user) return;

      const response = await apiFetch("/time-entries/clock-in", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cinemaId: user.cinemaId,
          shiftId: shiftId ?? null,
          clockIn: clockInTime
            ? localDateTimeToISOString(clockInTime)
            : undefined,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke clocke ind");
      }

      setOpenTimeEntry(data ?? null);
      await refreshDayData();
    },
    [apiFetch, refreshDayData, user],
  );

  const clockOut = useCallback(
    async (clockOutTime?: string, note?: string) => {
      if (!openTimeEntry) {
        throw new Error("Der er ingen åben tidsregistrering");
      }

      const response = await apiFetch(
        `/time-entries/${openTimeEntry.id}/clock-out`,
        {
          method: "PATCH",
          body: JSON.stringify({
            clockOut: clockOutTime
              ? localDateTimeToISOString(clockOutTime)
              : undefined,
            note,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke clocke ud");
      }

      setOpenTimeEntry(null);
      await refreshDayData();
    },
    [apiFetch, openTimeEntry, refreshDayData],
  );

  const submitManualTime = useCallback(
    async (input: ManualTimeInput) => {
      if (!user) return;

      const response = await apiFetch("/time-entries/manual", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cinemaId: user.cinemaId,
          shiftId: input.shiftId ?? null,
          clockIn: localDateTimeToISOString(input.clockIn),
          clockOut: localDateTimeToISOString(input.clockOut),
          note: input.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke registrere timer");
      }

      await refreshDayData();
    },
    [apiFetch, refreshDayData, user],
  );

  return {
    user,
    loading,
    canManageShifts,

    shifts,
    users,
    workTypes,
    movieShowings,
    leaveRequests,

    setUsers,
    setWorkTypes,

    refreshDayData,

    createShift,
    updateShift,
    deleteShift,

    offerShiftTrade,

    openTimeEntry,
    timeEntries,
    clockIn,
    clockOut,

    submitManualTime,
  };
}
