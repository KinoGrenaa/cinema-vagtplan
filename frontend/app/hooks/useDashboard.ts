"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboardOverview } from "../services/dashboard.service";
import type {
  CurrentUser,
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types/dashboard";
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
} from "../utils/dashboardAnalytics";

export function useDashboard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [movies, setMovies] = useState<MovieShowing[]>([]);

  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadDashboard = useCallback(
    async (user: CurrentUser) => {
      try {
        setLoading(true);

        const dashboardData = await fetchDashboardOverview({
          userId: user.id,
          date: today,
        });

        setShifts(
          Array.isArray(dashboardData.shifts) ? dashboardData.shifts : [],
        );

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

        setMovies(
          Array.isArray(dashboardData.movies) ? dashboardData.movies : [],
        );
      } catch (error) {
        console.error("Failed to load dashboard", error);

        setShifts([]);
        setTimeEntries([]);
        setLeaveRequests([]);
        setShiftTrades([]);
        setMovies([]);
      } finally {
        setLoading(false);
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

    loadDashboard(parsedUser);
  }, [loadDashboard]);

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
    currentUser,
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
