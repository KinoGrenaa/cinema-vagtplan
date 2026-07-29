"use client";

import { useCallback, useEffect, useState } from "react";

import {
  buildDashboardWorkspaceUrl,
  dashboardViewModeFromQueryValue,
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  DASHBOARD_VIEW_QUERY_PARAM,
  isDashboardViewMode,
  type DashboardViewMode,
} from "../helpers/dashboardWorkspace";

const DEFAULT_VIEW_MODE: DashboardViewMode = "complete";

function readStoredViewMode(): DashboardViewMode | null {
  try {
    const storedValue = window.localStorage.getItem(
      DASHBOARD_VIEW_MODE_STORAGE_KEY,
    );

    return isDashboardViewMode(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
}

function readUrlViewMode(): DashboardViewMode | null {
  const url = new URL(window.location.href);
  return dashboardViewModeFromQueryValue(
    url.searchParams.get(DASHBOARD_VIEW_QUERY_PARAM),
  );
}

function replaceUrlViewMode(viewMode: DashboardViewMode) {
  const nextUrl = buildDashboardWorkspaceUrl({
    currentUrl: window.location.href,
    viewMode,
  });

  window.history.replaceState(window.history.state, "", nextUrl);
}

export function useDashboardViewPreferences() {
  const [viewMode, setViewModeState] =
    useState<DashboardViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    const urlViewMode = readUrlViewMode();
    const storedViewMode = readStoredViewMode();
    const initialViewMode = urlViewMode ?? storedViewMode ?? DEFAULT_VIEW_MODE;

    setViewModeState(initialViewMode);

    if (!urlViewMode && storedViewMode) {
      replaceUrlViewMode(initialViewMode);
    }
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === DASHBOARD_VIEW_MODE_STORAGE_KEY &&
        isDashboardViewMode(event.newValue)
      ) {
        setViewModeState(event.newValue);
        replaceUrlViewMode(event.newValue);
      }
    }

    function handlePopState() {
      setViewModeState(
        readUrlViewMode() ?? readStoredViewMode() ?? DEFAULT_VIEW_MODE,
      );
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("popstate", handlePopState);
    };
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

    const nextUrl = buildDashboardWorkspaceUrl({
      currentUrl: window.location.href,
      viewMode: nextMode,
    });
    const currentUrl = window.location.href;

    if (nextUrl !== currentUrl) {
      window.history.pushState(window.history.state, "", nextUrl);
    }
  }, []);

  return {
    viewMode,
    setViewMode,
    isOperationsView: viewMode === "operations",
    isCompleteView: viewMode === "complete",
  };
}
