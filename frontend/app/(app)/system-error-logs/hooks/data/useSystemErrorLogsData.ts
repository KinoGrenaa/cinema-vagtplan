"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { activeStatuses } from "../../helpers/core/systemErrorLogConstants";
import { readErrorMessage } from "../../helpers/core/systemErrorLogHelpers";
import type {
  SeverityFilter,
  StatusFilter,
  SystemErrorLog,
  SystemErrorLogRetentionSummary,
} from "../../types";

type UseSystemErrorLogsDataParams = {
  authLoading: boolean;
  isMaster: boolean;
  showError: (title: string, description: string) => void;
};

export function useSystemErrorLogsData({
  authLoading,
  isMaster,
  showError,
}: UseSystemErrorLogsDataParams) {
  const showErrorRef = useRef(showError);
  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [retentionSummary, setRetentionSummary] =
    useState<SystemErrorLogRetentionSummary | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingRetentionSummary, setLoadingRetentionSummary] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("");
  const [cinemaIdFilter, setCinemaIdFilter] = useState("");

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);

    try {
      const params = new URLSearchParams();
      params.set("take", "300");

      if (statusFilter && statusFilter !== "ACTIVE") {
        params.set("status", statusFilter);
      }

      if (severityFilter) {
        params.set("severity", severityFilter);
      }

      const cinemaId = cinemaIdFilter.trim();

      if (cinemaId) {
        params.set("cinemaId", cinemaId);
      }

      const response = await apiFetch(`/system-error-logs?${params.toString()}`);

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Systemfejlloggen kunne ikke hentes.",
        );

        showErrorRef.current("Kunne ikke hente systemfejl", message);
        return;
      }

      const data = (await response.json()) as SystemErrorLog[];
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke hente systemfejl",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setLoadingLogs(false);
    }
  }, [cinemaIdFilter, severityFilter, statusFilter]);

  const fetchRetentionSummary = useCallback(async () => {
    setLoadingRetentionSummary(true);

    try {
      const response = await apiFetch("/system-error-logs/retention-summary");

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Opbevaringsoversigt kunne ikke hentes.",
        );

        showErrorRef.current("Kunne ikke hente opbevaring", message);
        return;
      }

      const data =
        (await response.json()) as SystemErrorLogRetentionSummary;
      setRetentionSummary(data);
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke hente opbevaringsoversigt",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setLoadingRetentionSummary(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isMaster) {
      return;
    }

    void fetchLogs();
    void fetchRetentionSummary();
  }, [authLoading, fetchLogs, fetchRetentionSummary, isMaster]);

  const visibleLogs = useMemo(() => {
    if (statusFilter !== "ACTIVE") {
      return logs;
    }

    return logs.filter((log) => activeStatuses.includes(log.status));
  }, [logs, statusFilter]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Nye",
        value: visibleLogs.filter((log) => log.status === "NEW").length,
      },
      {
        label: "Set",
        value: visibleLogs.filter((log) => log.status === "SEEN").length,
      },
      {
        label: "Løst",
        value: visibleLogs.filter((log) => log.status === "RESOLVED").length,
      },
      {
        label: "Ignoreret",
        value: visibleLogs.filter((log) => log.status === "IGNORED").length,
      },
    ],
    [visibleLogs],
  );

  function refreshPage() {
    void fetchLogs();
    void fetchRetentionSummary();
  }

  function showActiveErrors() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("");
  }

  function showNewErrors() {
    setStatusFilter("NEW");
    setSeverityFilter("");
  }

  function showCriticalErrors() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("CRITICAL");
  }

  function showAllErrors() {
    setStatusFilter("");
    setSeverityFilter("");
  }

  function resetFilters() {
    setStatusFilter("ACTIVE");
    setSeverityFilter("");
    setCinemaIdFilter("");
  }

  return {
    retentionSummary,
    loadingLogs,
    loadingRetentionSummary,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    cinemaIdFilter,
    setCinemaIdFilter,
    visibleLogs,
    summaryCards,
    fetchLogs,
    fetchRetentionSummary,
    refreshPage,
    showActiveErrors,
    showNewErrors,
    showCriticalErrors,
    showAllErrors,
    resetFilters,
  };
}
