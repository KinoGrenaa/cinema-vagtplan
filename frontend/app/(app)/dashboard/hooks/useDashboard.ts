"use client";

import { useCinemaModules } from "@/app/providers/CinemaModulesProvider";
import { getTodayLocalDate } from "@/app/utils/dateTime";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { fetchDashboardOverview } from "../services/dashboardService";
import type {
  CurrentUser,
  DashboardSourceKey,
  DashboardSourceStatusMap,
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types";

type UseDashboardInput = {
  onError?: (message: string) => void;
};

type DashboardLoadMode = "initial" | "refresh";

const DASHBOARD_SOURCE_KEYS: DashboardSourceKey[] = [
  "shifts",
  "timeEntries",
  "leaveRequests",
  "shiftTrades",
  "movies",
];

function createInitialSourceStatus(): DashboardSourceStatusMap {
  return {
    shifts: { state: "disabled" },
    timeEntries: { state: "disabled" },
    leaveRequests: { state: "disabled" },
    shiftTrades: { state: "disabled" },
    movies: { state: "disabled" },
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallback;
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = localStorage.getItem(
    "masterSelectedCinemaId",
  );
  const selectedCinemaId = Number(value);

  if (
    !Number.isInteger(selectedCinemaId) ||
    selectedCinemaId <= 0
  ) {
    return undefined;
  }

  return selectedCinemaId;
}

function mergeSourceStatus(
  nextStatus: DashboardSourceStatusMap,
  previousStatus: DashboardSourceStatusMap,
  mode: DashboardLoadMode,
): DashboardSourceStatusMap {
  if (mode === "initial") {
    return nextStatus;
  }

  return DASHBOARD_SOURCE_KEYS.reduce(
    (result, key) => {
      const next = nextStatus[key];
      const previous = previousStatus[key];

      if (
        next.state === "unavailable" &&
        (previous.state === "fresh" ||
          previous.state === "stale")
      ) {
        result[key] = {
          ...next,
          state: "stale",
        };
      } else {
        result[key] = next;
      }

      return result;
    },
    createInitialSourceStatus(),
  );
}

function countSourceStates(
  sourceStatus: DashboardSourceStatusMap,
) {
  return DASHBOARD_SOURCE_KEYS.reduce(
    (result, key) => {
      const state = sourceStatus[key].state;

      if (state !== "disabled") {
        result.enabled += 1;
      }

      if (state === "fresh") {
        result.fresh += 1;
      }

      return result;
    },
    { enabled: 0, fresh: 0 },
  );
}

export function useDashboard(
  input: UseDashboardInput = {},
) {
  const { onError } = input;
  const {
    loading: modulesLoading,
    isModuleEnabled,
  } = useCinemaModules();

  const moduleAccess = useMemo(
    () => ({
      schedule: isModuleEnabled("SCHEDULE"),
      timeTracking: isModuleEnabled("TIME_TRACKING"),
      leave: isModuleEnabled("LEAVE"),
      shiftTrades: isModuleEnabled("SHIFT_TRADES"),
      payroll: isModuleEnabled("PAYROLL"),
      staffingAi: isModuleEnabled("STAFFING_AI"),
    }),
    [isModuleEnabled],
  );

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] =
    useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] =
    useState<LeaveRequest[]>([]);
  const [shiftTrades, setShiftTrades] =
    useState<ShiftTrade[]>([]);
  const [movies, setMovies] =
    useState<MovieShowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [hasLoadedDashboard, setHasLoadedDashboard] =
    useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<string | null>(null);
  const [sourceStatus, setSourceStatus] =
    useState<DashboardSourceStatusMap>(
      createInitialSourceStatus,
    );
  const requestVersionRef = useRef(0);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [needsMasterCinemaSelection, setNeedsMasterCinemaSelection] =
    useState(false);

  const clearDashboardData = useCallback(() => {
    setShifts([]);
    setTimeEntries([]);
    setLeaveRequests([]);
    setShiftTrades([]);
    setMovies([]);
  }, []);

  const loadDashboard = useCallback(
    async (
      user: CurrentUser,
      selectedCinemaId: number | undefined,
      requestVersion: number,
      mode: DashboardLoadMode,
    ) => {
      try {
        const dashboardData = await fetchDashboardOverview({
          userId: user.id,
          date: getTodayLocalDate(),
          cinemaId: selectedCinemaId,
          modules: moduleAccess,
        });

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const sourceCounts = countSourceStates(
          dashboardData.sourceStatus,
        );

        setSourceStatus((previousStatus) =>
          mergeSourceStatus(
            dashboardData.sourceStatus,
            previousStatus,
            mode,
          ),
        );

        if (
          mode === "initial" ||
          dashboardData.sourceStatus.shifts.state !==
            "unavailable"
        ) {
          setShifts(
            Array.isArray(dashboardData.shifts)
              ? dashboardData.shifts
              : [],
          );
        }

        if (
          mode === "initial" ||
          dashboardData.sourceStatus.timeEntries.state !==
            "unavailable"
        ) {
          setTimeEntries(
            Array.isArray(dashboardData.timeEntries)
              ? dashboardData.timeEntries
              : [],
          );
        }

        if (
          mode === "initial" ||
          dashboardData.sourceStatus.leaveRequests.state !==
            "unavailable"
        ) {
          setLeaveRequests(
            Array.isArray(dashboardData.leaveRequests)
              ? dashboardData.leaveRequests
              : [],
          );
        }

        if (
          mode === "initial" ||
          dashboardData.sourceStatus.shiftTrades.state !==
            "unavailable"
        ) {
          setShiftTrades(
            Array.isArray(dashboardData.shiftTrades)
              ? dashboardData.shiftTrades
              : [],
          );
        }

        if (
          mode === "initial" ||
          dashboardData.sourceStatus.movies.state !==
            "unavailable"
        ) {
          setMovies(
            Array.isArray(dashboardData.movies)
              ? dashboardData.movies
              : [],
          );
        }

        if (
          sourceCounts.enabled > 0 &&
          sourceCounts.fresh === 0
        ) {
          const message =
            "Ingen af driftsoverblikkets datakilder kunne opdateres.";
          setErrorMessage(message);
          onError?.(message);

          if (mode === "initial") {
            clearDashboardData();
            setHasLoadedDashboard(false);
          }

          return;
        }

        setErrorMessage(null);
        setHasLoadedDashboard(true);
        setLastUpdatedAt(new Date().toISOString());
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const message = getErrorMessage(
          error,
          "Der opstod en fejl under hentning af dashboard.",
        );
        setErrorMessage(message);
        onError?.(message);

        if (mode === "initial") {
          clearDashboardData();
          setHasLoadedDashboard(false);
        }
      } finally {
        if (requestVersion === requestVersionRef.current) {
          if (mode === "refresh") {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [clearDashboardData, moduleAccess, onError],
  );

  useEffect(() => {
    if (modulesLoading) {
      setLoading(true);
      return;
    }

    function loadFromStorage() {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        window.location.href = "/";
        return;
      }

      try {
        const parsedUser: CurrentUser = JSON.parse(savedUser);
        const selectedCinemaId =
          parsedUser.role === "MASTER"
            ? getSelectedMasterCinemaId()
            : undefined;
        const requiresMasterCinemaSelection =
          parsedUser.role === "MASTER" &&
          !selectedCinemaId;

        setCurrentUser(parsedUser);
        setNeedsMasterCinemaSelection(
          requiresMasterCinemaSelection,
        );
        setErrorMessage(null);
        setRefreshing(false);
        setHasLoadedDashboard(false);
        setLastUpdatedAt(null);
        setSourceStatus(createInitialSourceStatus());
        clearDashboardData();

        if (requiresMasterCinemaSelection) {
          setLoading(false);
          return;
        }

        setLoading(true);
        void loadDashboard(
          parsedUser,
          selectedCinemaId,
          requestVersion,
          "initial",
        );
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }

    loadFromStorage();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      loadFromStorage,
    );
    window.addEventListener(
      "storage",
      loadFromStorage,
    );

    return () => {
      requestVersionRef.current += 1;
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        loadFromStorage,
      );
      window.removeEventListener(
        "storage",
        loadFromStorage,
      );
    };
  }, [
    clearDashboardData,
    loadDashboard,
    modulesLoading,
  ]);

  const todayPlannedHours = useMemo(
    () => calculatePlannedHours(shifts),
    [shifts],
  );
  const myRegisteredHours = useMemo(
    () => calculateRegisteredHours(timeEntries),
    [timeEntries],
  );
  const pendingLeaveRequests = leaveRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const openShiftTrades = shiftTrades.filter(
    (trade) => trade.status === "OPEN",
  ).length;
  const soldSeatsToday = useMemo(
    () => calculateSoldSeats(movies),
    [movies],
  );
  const seatLoadPercent = useMemo(
    () => calculateSeatLoadPercent(movies),
    [movies],
  );
  const staffingWarnings = useMemo(
    () => calculateStaffingWarnings(shifts),
    [shifts],
  );
  const operationsHealth = useMemo(
    () => calculateOperationsHealth(shifts, movies),
    [movies, shifts],
  );
  const operationalRecommendations = useMemo(
    () =>
      calculateOperationalRecommendations({
        staffingHealth: operationsHealth.staffingHealth,
        highFatigueEmployees:
          operationsHealth.highFatigueEmployees,
        moviePressure: operationsHealth.moviePressure,
        activeShiftCount:
          operationsHealth.activeShiftCount,
        movieDataAvailable:
          operationsHealth.movieDataAvailable,
      }),
    [operationsHealth],
  );
  const staffingHeatmap = useMemo(
    () => calculateStaffingHeatmap(shifts),
    [shifts],
  );
  const liveOperationsStatus = useMemo(
    () =>
      calculateLiveOperationsStatus({
        staffingHealth: operationsHealth.staffingHealth,
        highFatigueEmployees:
          operationsHealth.highFatigueEmployees,
        moviePressure: operationsHealth.moviePressure,
        movieDataAvailable:
          operationsHealth.movieDataAvailable,
      }),
    [operationsHealth],
  );
  const predictiveStaffing = useMemo(
    () => calculatePredictiveStaffing(shifts, movies),
    [movies, shifts],
  );
  const aiLearningAnalytics = useMemo(
    () =>
      calculateAiLearningAnalytics({
        movies,
        shifts,
        staffingWarnings,
        predictiveStaffing,
      }),
    [
      movies,
      predictiveStaffing,
      shifts,
      staffingWarnings,
    ],
  );
  const aiPatternInsights = useMemo(
    () =>
      calculateAiPatternInsights({
        shifts,
        staffingHeatmap,
      }),
    [shifts, staffingHeatmap],
  );

  const reloadDashboard = useCallback(() => {
    if (!currentUser || refreshing) {
      return;
    }

    const selectedCinemaId =
      currentUser.role === "MASTER"
        ? getSelectedMasterCinemaId()
        : undefined;

    if (
      currentUser.role === "MASTER" &&
      !selectedCinemaId
    ) {
      setNeedsMasterCinemaSelection(true);
      return;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setErrorMessage(null);
    setRefreshing(true);

    void loadDashboard(
      currentUser,
      selectedCinemaId,
      requestVersion,
      "refresh",
    );
  }, [currentUser, loadDashboard, refreshing]);

  return {
    loading,
    refreshing,
    hasLoadedDashboard,
    lastUpdatedAt,
    sourceStatus,
    errorMessage,
    currentUser,
    needsMasterCinemaSelection,
    moduleAccess,
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
    reloadDashboard,
  };
}
