"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTodayLocalDate } from "@/app/utils/dateTime";
import {
  DEFAULT_DASHBOARD_HORIZON_DAYS,
  getDashboardHorizonRange,
  normalizeDashboardHorizonDays,
  type DashboardOperationalWarning,
} from "../helpers/dashboardOperationsHorizon";
import {
  fetchDashboardHorizonPreference,
  fetchDashboardOperationsRange,
  saveDashboardHorizonPreference,
  saveDashboardWarningDecision,
  type DashboardOperationsRangeData,
} from "../services/dashboardOperationsService";

type UseDashboardOperationsHorizonInput = {
  scheduleEnabled: boolean;
  refreshToken: string | null;
};

function getActiveCinemaId() {
  if (typeof window === "undefined") return null;

  try {
    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;
    const value =
      user?.role === "MASTER"
        ? Number(localStorage.getItem("masterSelectedCinemaId"))
        : Number(user?.cinemaId);

    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function createInitialData(): DashboardOperationsRangeData {
  return {
    shifts: [],
    movies: [],
    sourceStatus: {
      shifts: { state: "disabled" },
      movies: { state: "disabled" },
    },
    loadWarningSettings: {
      enabled: false,
      minSoldSeats: 150,
      maxTicketsPerEmployee: 60,
      version: 1,
    },
    warningDecisions: [],
  };
}

function preserveStaleSource<T>(
  previousItems: T[],
  nextItems: T[],
  nextState: DashboardOperationsRangeData["sourceStatus"]["shifts"],
  refreshing: boolean,
) {
  if (
    refreshing &&
    nextState.state === "unavailable" &&
    previousItems.length > 0
  ) {
    return {
      items: previousItems,
      status: { state: "stale" as const, message: nextState.message },
    };
  }
  return { items: nextItems, status: nextState };
}

export function useDashboardOperationsHorizon({
  scheduleEnabled,
  refreshToken,
}: UseDashboardOperationsHorizonInput) {
  const [horizonDays, setHorizonDays] = useState(
    DEFAULT_DASHBOARD_HORIZON_DAYS,
  );
  const [data, setData] = useState<DashboardOperationsRangeData>(
    createInitialData,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingDecisionKey, setSavingDecisionKey] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const lastParentRefreshRef = useRef<string | null>(null);

  const loadRange = useCallback(
    async (days: number, mode: "initial" | "refresh") => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;
      mode === "initial" ? setLoading(true) : setRefreshing(true);

      try {
        const cinemaId = getActiveCinemaId();
        if (!cinemaId) throw new Error("Aktiv biograf kunne ikke bestemmes.");

        const range = getDashboardHorizonRange(getTodayLocalDate(), days);
        const nextData = await fetchDashboardOperationsRange({
          startDate: range.startDate,
          endDate: range.endDate,
          cinemaId,
          scheduleEnabled,
        });

        if (requestVersion !== requestVersionRef.current) return;

        setData((previous) => {
          const shifts = preserveStaleSource(
            previous.shifts,
            nextData.shifts,
            nextData.sourceStatus.shifts,
            mode === "refresh",
          );
          const movies = preserveStaleSource(
            previous.movies,
            nextData.movies,
            nextData.sourceStatus.movies,
            mode === "refresh",
          );

          return {
            ...nextData,
            shifts: shifts.items,
            movies: movies.items,
            sourceStatus: {
              shifts: shifts.status,
              movies: movies.status,
            },
          };
        });
        setErrorMessage(null);
        setLastUpdatedAt(new Date().toISOString());
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Kunne ikke hente den valgte dashboardperiode.",
        );
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [scheduleEnabled],
  );

  useEffect(() => {
    let active = true;
    async function initialize() {
      let days = DEFAULT_DASHBOARD_HORIZON_DAYS;
      try {
        const preference = await fetchDashboardHorizonPreference();
        days = normalizeDashboardHorizonDays(
          preference,
          DEFAULT_DASHBOARD_HORIZON_DAYS,
        );
      } catch {}
      if (!active) return;
      setHorizonDays(days);
      await loadRange(days, "initial");
    }
    void initialize();
    return () => {
      active = false;
      requestVersionRef.current += 1;
    };
  }, [loadRange]);

  useEffect(() => {
    if (!refreshToken) return;
    if (lastParentRefreshRef.current === null) {
      lastParentRefreshRef.current = refreshToken;
      return;
    }
    if (lastParentRefreshRef.current === refreshToken) return;
    lastParentRefreshRef.current = refreshToken;
    void loadRange(horizonDays, "refresh");
  }, [horizonDays, loadRange, refreshToken]);

  const saveHorizonDays = useCallback(
    async (value: unknown) => {
      const days = normalizeDashboardHorizonDays(value, Number.NaN);
      if (!Number.isInteger(days)) throw new Error("Vælg mellem 1 og 30 dage.");
      setSavingPreference(true);
      setErrorMessage(null);
      try {
        const saved = await saveDashboardHorizonPreference(days);
        const normalized = normalizeDashboardHorizonDays(
          saved.dashboardHorizonDays,
          days,
        );
        setHorizonDays(normalized);
        await loadRange(normalized, "refresh");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Kunne ikke gemme dashboardperioden.",
        );
        throw error;
      } finally {
        setSavingPreference(false);
      }
    },
    [loadRange],
  );

  const recordWarningDecision = useCallback(
    async (
      warning: DashboardOperationalWarning,
      action: "IGNORED" | "REOPENED",
      note: string | null,
    ) => {
      const cinemaId = getActiveCinemaId();
      if (!cinemaId) throw new Error("Aktiv biograf kunne ikke bestemmes.");
      setSavingDecisionKey(warning.key);
      setErrorMessage(null);
      try {
        const decision = await saveDashboardWarningDecision(cinemaId, {
          warningKey: warning.key,
          warningType: warning.type,
          localDate: warning.date,
          action,
          note,
        });
        setData((previous) => ({
          ...previous,
          warningDecisions: [...previous.warningDecisions, decision],
        }));
        return decision;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Kunne ikke håndtere advarslen.",
        );
        throw error;
      } finally {
        setSavingDecisionKey(null);
      }
    },
    [],
  );

  const reload = useCallback(
    () => loadRange(horizonDays, "refresh"),
    [horizonDays, loadRange],
  );

  return {
    horizonDays,
    data,
    loading,
    refreshing,
    savingPreference,
    savingDecisionKey,
    errorMessage,
    lastUpdatedAt,
    saveHorizonDays,
    recordWarningDecision,
    reload,
  };
}
