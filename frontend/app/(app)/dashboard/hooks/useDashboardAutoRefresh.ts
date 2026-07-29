"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DASHBOARD_AUTO_REFRESH_INTERVAL_MS,
  DASHBOARD_AUTO_REFRESH_STORAGE_KEY,
  getNextDashboardRefreshAt,
  getSecondsUntilDashboardRefresh,
  isDashboardUpdateFromPreviousDay,
  type DashboardAutoRefreshState,
} from "../helpers/dashboardRefresh";

type UseDashboardAutoRefreshInput = {
  canRefresh: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
};

const AUTO_REFRESH_RETRY_GUARD_MS =
  DASHBOARD_AUTO_REFRESH_INTERVAL_MS;

function readStoredAutoRefreshSetting() {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    localStorage.getItem(
      DASHBOARD_AUTO_REFRESH_STORAGE_KEY,
    ) !== "false"
  );
}

export function useDashboardAutoRefresh({
  canRefresh,
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
}: UseDashboardAutoRefreshInput) {
  const [autoRefreshEnabled, setAutoRefreshEnabledState] =
    useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const lastAutomaticRequestAtRef = useRef(0);

  useEffect(() => {
    setAutoRefreshEnabledState(
      readStoredAutoRefreshSetting(),
    );
    setIsOnline(navigator.onLine);
    setIsPageVisible(
      document.visibilityState === "visible",
    );
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setNow(Date.now());
    }
    function handleOffline() {
      setIsOnline(false);
    }
    function handleVisibilityChange() {
      setIsPageVisible(
        document.visibilityState === "visible",
      );
      setNow(Date.now());
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  const nextRefreshAt = useMemo(
    () => getNextDashboardRefreshAt(lastUpdatedAt),
    [lastUpdatedAt],
  );
  const secondsUntilRefresh = useMemo(
    () =>
      getSecondsUntilDashboardRefresh(
        nextRefreshAt,
        now,
      ),
    [nextRefreshAt, now],
  );

  const setAutoRefreshEnabled = useCallback(
    (enabled: boolean) => {
      setAutoRefreshEnabledState(enabled);
      localStorage.setItem(
        DASHBOARD_AUTO_REFRESH_STORAGE_KEY,
        String(enabled),
      );
      setNow(Date.now());
    },
    [],
  );

  const requestAutomaticRefresh = useCallback(() => {
    const requestTime = Date.now();
    if (
      requestTime - lastAutomaticRequestAtRef.current <
      AUTO_REFRESH_RETRY_GUARD_MS
    ) {
      return;
    }

    lastAutomaticRequestAtRef.current = requestTime;
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    if (
      !autoRefreshEnabled ||
      !canRefresh ||
      isRefreshing ||
      !isOnline ||
      !isPageVisible ||
      !lastUpdatedAt
    ) {
      return;
    }

    const isOverdue =
      secondsUntilRefresh !== null &&
      secondsUntilRefresh <= 0;
    const dayChanged =
      isDashboardUpdateFromPreviousDay(lastUpdatedAt);

    if (isOverdue || dayChanged) {
      requestAutomaticRefresh();
      return;
    }

    const remainingMs = Math.max(
      1_000,
      (secondsUntilRefresh ??
        DASHBOARD_AUTO_REFRESH_INTERVAL_MS / 1_000) *
        1_000,
    );
    const timer = window.setTimeout(
      requestAutomaticRefresh,
      remainingMs,
    );

    return () => window.clearTimeout(timer);
  }, [
    autoRefreshEnabled,
    canRefresh,
    isOnline,
    isPageVisible,
    isRefreshing,
    lastUpdatedAt,
    requestAutomaticRefresh,
    secondsUntilRefresh,
  ]);

  useEffect(() => {
    if (lastUpdatedAt) {
      lastAutomaticRequestAtRef.current = 0;
    }
  }, [lastUpdatedAt]);

  const state: DashboardAutoRefreshState = useMemo(() => {
    if (!autoRefreshEnabled) return "disabled";
    if (isRefreshing) return "refreshing";
    if (!isOnline) return "paused-offline";
    if (!isPageVisible) return "paused-hidden";
    if (!canRefresh || !lastUpdatedAt) return "waiting";
    return "scheduled";
  }, [
    autoRefreshEnabled,
    canRefresh,
    isOnline,
    isPageVisible,
    isRefreshing,
    lastUpdatedAt,
  ]);

  return {
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    isOnline,
    isPageVisible,
    nextRefreshAt,
    secondsUntilRefresh,
    state,
  };
}
