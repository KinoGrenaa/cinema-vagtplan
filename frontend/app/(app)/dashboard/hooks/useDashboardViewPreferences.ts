"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  isDashboardViewMode,
  type DashboardViewMode,
} from "../helpers/dashboardWorkspace";

const DEFAULT_VIEW_MODE: DashboardViewMode = "complete";

export function useDashboardViewPreferences() {
  const [viewMode, setViewModeState] =
    useState<DashboardViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(
        DASHBOARD_VIEW_MODE_STORAGE_KEY,
      );

      if (isDashboardViewMode(storedValue)) {
        setViewModeState(storedValue);
      }
    } catch {
      // Dashboardet fungerer fortsat med standardvisningen, hvis lagring er blokeret.
    }
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === DASHBOARD_VIEW_MODE_STORAGE_KEY &&
        isDashboardViewMode(event.newValue)
      ) {
        setViewModeState(event.newValue);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setViewMode = useCallback((nextMode: DashboardViewMode) => {
    setViewModeState(nextMode);

    try {
      window.localStorage.setItem(
        DASHBOARD_VIEW_MODE_STORAGE_KEY,
        nextMode,
      );
    } catch {
      // Valget gælder stadig for den aktuelle fane.
    }
  }, []);

  return {
    viewMode,
    setViewMode,
    isOperationsView: viewMode === "operations",
    isCompleteView: viewMode === "complete",
  };
}
