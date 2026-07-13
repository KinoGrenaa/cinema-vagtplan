"use client";

import { getTodayLocalDate } from "@/app/utils/dateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboardOverview } from "../services/dashboardService";
import type {
  CurrentUser,
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types";
import {
  calculateAiLearningAnalytics,
  calculateAiPatternInsights,
  calculateLiveOperationsStatus,
  calculateOperationsHealth,
  calculateOperationalRecommendations,
  calculatePlannedHours,
  calculatePredictiveStaffing,
  calculateRegisteredHours,
  calculateSeatLoadPercent,
  calculateSoldSeats,
  calculateStaffingHeatmap,
  calculateStaffingWarnings,
} from "../helpers/dashboardAnalytics";

type UseDashboardInput = {
  onError?: (message: string) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = localStorage.getItem("masterSelectedCinemaId");
  const selectedCinemaId = Number(value);

  if (!Number.isInteger(selectedCinemaId) || selectedCinemaId <= 0) {
    return undefined;
  }

  return selectedCinemaId;
}

export function useDashboard(input: UseDashboardInput = {}) {
  const { onError } = input;
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsMasterCinemaSelection, setNeedsMasterCinemaSelection] =
    useState(false);
  const today = useMemo(() => getTodayLocalDate(), []);

  const clearDashboardData = useCallback(() => {
    setShifts([]);
    setTimeEntries([]);
    setLeaveRequests([]);
    setShiftTrades([]);
    setMovies([]);
  }, []);

  const loadDashboard = useCallback(
    async (user: CurrentUser, selectedCinemaId?: number) => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const dashboardData = await fetchDashboardOverview({
          userId: user.id,
          date: today,
          cinemaId: selectedCinemaId,
        });

        setShifts(Array.isArray(dashboardData.shifts) ? dashboardData.shifts : []);
        setTimeEntries(
          Array.isArray(dashboardData.timeEntries)
            ? dashboardData.timeEntries
            : [],
        );
        setLeaveRequests(
          Array.isArray(dashboardData.leaveRequests)
            ? dashboardData.leaveRequests
            : [],
        );
        setShiftTrades(
          Array.isArray(dashboardData.shiftTrades)
            ? dashboardData.shiftTrades
            : [],
        );
        setMovies(Array.isArray(dashboardData.movies) ? dashboardData.movies : []);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Der opstod en fejl under hentning af dashboard.",
        );
        setErrorMessage(message);
        onError?.(message);
        clearDashboardData();
      } finally {
        setLoading(false);
      }
    },
    [clearDashboardData, onError, today],
  );

  useEffect(() => {
    function loadFromStorage() {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        window.location.href = "/";
        return;
      }

      try {
        const parsedUser: CurrentUser = JSON.parse(savedUser);
        const selectedCinemaId =
          parsedUser.role === "MASTER" ? getSelectedMasterCinemaId() : undefined;
        const requiresMasterCinemaSelection =
          parsedUser.role === "MASTER" && !selectedCinemaId;

        setCurrentUser(parsedUser);
        setNeedsMasterCinemaSelection(requiresMasterCinemaSelection);

        if (requiresMasterCinemaSelection) {
          setErrorMessage(null);
          clearDashboardData();
          setLoading(false);
          return;
        }

        loadDashboard(parsedUser, selectedCinemaId);
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }

    loadFromStorage();

    window.addEventListener("masterSelectedCinemaChanged", loadFromStorage);
    window.addEventListener("storage", loadFromStorage);

    return () => {
      window.removeEventListener("masterSelectedCinemaChanged", loadFromStorage);
      window.removeEventListener("storage", loadFromStorage);
    };
  }, [clearDashboardData, loadDashboard]);

  const todayPlannedHours = useMemo(() => {
    return calculatePlannedHours(shifts);
  }, [shifts]);

  const myRegisteredHours = useMemo(() => {
    return calculateRegisteredHours(timeEntries);
  }, [timeEntries]);

  const pendingLeaveRequests = leaveRequests.filter(
    (request) => request.status === "PENDING",
  ).length;

  const openShiftTrades = shiftTrades.filter(
    (trade) => trade.status === "OPEN",
  ).length;

  const soldSeatsToday = useMemo(() => {
    return calculateSoldSeats(movies);
  }, [movies]);

  const seatLoadPercent = useMemo(() => {
    return calculateSeatLoadPercent(movies);
  }, [movies]);

  const staffingWarnings = useMemo(() => {
    return calculateStaffingWarnings(shifts, movies);
  }, [movies, shifts]);

  const operationsHealth = useMemo(() => {
    return calculateOperationsHealth(shifts, movies);
  }, [movies, shifts]);

  const operationalRecommendations = useMemo(() => {
    return calculateOperationalRecommendations({
      staffingHealth: operationsHealth.staffingHealth,
      highFatigueEmployees: operationsHealth.highFatigueEmployees,
      moviePressure: operationsHealth.moviePressure,
      activeShiftCount: operationsHealth.activeShiftCount,
    });
  }, [operationsHealth]);

  const staffingHeatmap = useMemo(() => {
    return calculateStaffingHeatmap(shifts);
  }, [shifts]);

  const liveOperationsStatus = useMemo(() => {
    return calculateLiveOperationsStatus({
      staffingHealth: operationsHealth.staffingHealth,
      highFatigueEmployees: operationsHealth.highFatigueEmployees,
      moviePressure: operationsHealth.moviePressure,
    });
  }, [operationsHealth]);

  const predictiveStaffing = useMemo(() => {
    return calculatePredictiveStaffing(shifts, movies);
  }, [movies, shifts]);

  const aiLearningAnalytics = useMemo(() => {
    return calculateAiLearningAnalytics({
      movies,
      shifts,
      staffingWarnings,
      predictiveStaffing,
    });
  }, [movies, predictiveStaffing, shifts, staffingWarnings]);

  const aiPatternInsights = useMemo(() => {
    return calculateAiPatternInsights({
      shifts,
      staffingHeatmap,
    });
  }, [shifts, staffingHeatmap]);

  return {
    loading,
    errorMessage,
    currentUser,
    needsMasterCinemaSelection,
    shifts,
    timeEntries,
    leaveRequests,
    shiftTrades,
    movies,
    todayPlannedHours,
    myRegisteredHours,
    pendingLeaveRequests,
    openShiftTrades,
    soldSeatsToday,
    seatLoadPercent,
    staffingWarnings,
    operationsHealth,
    operationalRecommendations,
    staffingHeatmap,
    liveOperationsStatus,
    predictiveStaffing,
    aiLearningAnalytics,
    aiPatternInsights,
    reloadDashboard: loadDashboard,
  };
}
