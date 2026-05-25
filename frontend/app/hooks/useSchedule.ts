"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "./useApi";
import { useAuth } from "../providers/AuthProvider";

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
  shiftId: number;
  clockIn: string;
  clockOut: string;
  note: string;
};

export function useSchedule(selectedDate: string) {
  const { apiFetch } = useApi();

  const { user, loading: authLoading, isAdmin } = useAuth();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [movieShowings, setMovieShowings] = useState<MovieShowing[]>([]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [loading, setLoading] = useState(true);

  const canManageShifts = isAdmin;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);
        return;
      }

      const data = await response.json();

      const usersArray: User[] = Array.isArray(data)
        ? data
        : Array.isArray(data.users)
          ? data.users
          : [];

      setUsers(usersArray);
    } catch {
      setUsers([]);
    }
  }, [apiFetch]);

  const fetchWorkTypes = useCallback(async () => {
    try {
      const response = await apiFetch("/work-types");

      if (!response.ok) {
        setWorkTypes([]);
        return;
      }

      const data = await response.json();

      const workTypesArray: WorkType[] = Array.isArray(data)
        ? data
        : Array.isArray(data.workTypes)
          ? data.workTypes
          : [];

      setWorkTypes(workTypesArray);
    } catch {
      setWorkTypes([]);
    }
  }, [apiFetch]);

  const fetchShifts = useCallback(async () => {
    try {
      const response = await apiFetch(`/shifts?date=${selectedDate}`);

      if (!response.ok) {
        setShifts([]);
        return;
      }

      const data = await response.json();

      const shiftsArray: Shift[] = Array.isArray(data) ? data : [];

      setShifts(shiftsArray);
    } catch {
      setShifts([]);
    }
  }, [apiFetch, selectedDate]);

  const fetchMovieShowings = useCallback(async () => {
    try {
      const response = await fetch("/mock/movie-showings.json");

      if (!response.ok) {
        setMovieShowings([]);
        return;
      }

      const data = await response.json();

      const movieShowingsArray: MovieShowing[] = Array.isArray(data)
        ? data
        : [];

      setMovieShowings(movieShowingsArray);
    } catch {
      setMovieShowings([]);
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const response = await apiFetch("/leave-requests");

      if (!response.ok) {
        setLeaveRequests([]);
        return;
      }

      const data = await response.json();

      const leaveRequestsArray: LeaveRequest[] = Array.isArray(data)
        ? data
        : [];

      setLeaveRequests(leaveRequestsArray);
    } catch {
      setLeaveRequests([]);
    }
  }, [apiFetch]);

  const refreshDayData = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([
        fetchShifts(),
        fetchMovieShowings(),
        fetchLeaveRequests(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchShifts, fetchMovieShowings, fetchLeaveRequests]);

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
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.message || "Kunne ikke oprette vagt");
      }

      await refreshDayData();
    },
    [apiFetch, refreshDayData],
  );

  const updateShift = useCallback(
    async (shiftId: number, input: UpdateShiftInput) => {
      const response = await apiFetch(`/shifts/${shiftId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.message || "Kunne ikke opdatere vagt");
      }

      await refreshDayData();
    },
    [apiFetch, refreshDayData],
  );

  const deleteShift = useCallback(
    async (shiftId: number) => {
      const response = await apiFetch(`/shifts/${shiftId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke slette vagt");
      }

      await refreshDayData();
    },
    [apiFetch, refreshDayData],
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

  const submitManualTime = useCallback(
    async (input: ManualTimeInput) => {
      if (!user) return;

      const response = await apiFetch("/time-entries/manual", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cinemaId: user.cinemaId,
          shiftId: input.shiftId,
          clockIn: input.clockIn,
          clockOut: input.clockOut,
          note: input.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Kunne ikke registrere timer");
      }
    },
    [apiFetch, user],
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

    submitManualTime,
  };
}
