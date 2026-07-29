"use client";

import { useEffect, useRef, useState } from "react";

import {
  createEmptyDashboardSourceHistory,
  DASHBOARD_SOURCE_KEYS,
  type DashboardSourceHistoryMap,
} from "../helpers/dashboardSourceHealth";
import type { DashboardSourceStatusMap } from "../types";

type UseDashboardSourceHistoryInput = {
  sourceStatus: DashboardSourceStatusMap;
  lastUpdatedAt: string | null;
  isRefreshing: boolean;
  hasLoadedDashboard: boolean;
  errorMessage: string | null;
};

function createStatusFingerprint(
  sourceStatus: DashboardSourceStatusMap,
) {
  return DASHBOARD_SOURCE_KEYS.map((key) => {
    const status = sourceStatus[key];
    return `${key}:${status.state}:${status.message ?? ""}`;
  }).join("|");
}

export function useDashboardSourceHistory({
  sourceStatus,
  lastUpdatedAt,
  isRefreshing,
  hasLoadedDashboard,
  errorMessage,
}: UseDashboardSourceHistoryInput) {
  const [sourceHistory, setSourceHistory] =
    useState<DashboardSourceHistoryMap>(
      createEmptyDashboardSourceHistory,
    );
  const lastRecordedSuccessfulUpdateRef = useRef<string | null>(
    null,
  );
  const wasRefreshingRef = useRef(false);
  const lastStatusFingerprintRef = useRef("");

  useEffect(() => {
    if (!hasLoadedDashboard) {
      setSourceHistory(createEmptyDashboardSourceHistory());
      lastRecordedSuccessfulUpdateRef.current = null;
      lastStatusFingerprintRef.current = "";
      wasRefreshingRef.current = isRefreshing;
      return;
    }

    const statusFingerprint =
      createStatusFingerprint(sourceStatus);
    const successfulUpdateChanged =
      Boolean(lastUpdatedAt) &&
      lastUpdatedAt !==
        lastRecordedSuccessfulUpdateRef.current;
    const refreshJustFinished =
      wasRefreshingRef.current && !isRefreshing;
    const statusChanged =
      statusFingerprint !== lastStatusFingerprintRef.current;

    let attemptAt: string | null = null;
    if (successfulUpdateChanged && lastUpdatedAt) {
      attemptAt = lastUpdatedAt;
    } else if (
      refreshJustFinished &&
      (statusChanged || Boolean(errorMessage))
    ) {
      attemptAt = new Date().toISOString();
    }

    if (attemptAt) {
      setSourceHistory((previousHistory) =>
        DASHBOARD_SOURCE_KEYS.reduce(
          (nextHistory, key) => {
            const status = sourceStatus[key];
            const previous = previousHistory[key];

            if (status.state === "disabled") {
              nextHistory[key] = {
                lastSuccessfulAt: null,
                lastAttemptedAt: null,
                consecutiveFailures: 0,
              };
              return nextHistory;
            }

            if (status.state === "fresh") {
              nextHistory[key] = {
                lastSuccessfulAt: attemptAt,
                lastAttemptedAt: attemptAt,
                consecutiveFailures: 0,
              };
              return nextHistory;
            }

            nextHistory[key] = {
              lastSuccessfulAt: previous.lastSuccessfulAt,
              lastAttemptedAt: attemptAt,
              consecutiveFailures:
                previous.consecutiveFailures + 1,
            };
            return nextHistory;
          },
          createEmptyDashboardSourceHistory(),
        ),
      );
    }

    if (successfulUpdateChanged) {
      lastRecordedSuccessfulUpdateRef.current = lastUpdatedAt;
    }
    lastStatusFingerprintRef.current = statusFingerprint;
    wasRefreshingRef.current = isRefreshing;
  }, [
    errorMessage,
    hasLoadedDashboard,
    isRefreshing,
    lastUpdatedAt,
    sourceStatus,
  ]);

  return sourceHistory;
}
