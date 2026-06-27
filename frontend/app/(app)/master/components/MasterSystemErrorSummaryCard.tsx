"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";

type SystemErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
type SystemErrorStatus = "NEW" | "SEEN" | "RESOLVED" | "IGNORED";

type SystemErrorLogSummaryItem = {
  id: number;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };

    if (Array.isArray(data.message)) {
      const message = data.message
        .filter((item): item is string => typeof item === "string")
        .join(", ");

      return message || fallback;
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function isActiveLog(log: SystemErrorLogSummaryItem) {
  return log.status === "NEW" || log.status === "SEEN";
}

export default function MasterSystemErrorSummaryCard() {
  const [logs, setLogs] = useState<SystemErrorLogSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/system-error-logs?take=300");

      if (!response.ok) {
        setLogs([]);
        setError(
          await readErrorMessage(
            response,
            "Systemfejl kunne ikke hentes lige nu.",
          ),
        );
        return;
      }

      const data = (await response.json()) as SystemErrorLogSummaryItem[];
      setLogs(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setLogs([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Systemfejl kunne ikke hentes lige nu.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const summary = useMemo(() => {
    const activeLogs = logs.filter(isActiveLog);

    return {
      newCount: logs.filter((log) => log.status === "NEW").length,
      activeCriticalCount: activeLogs.filter(
        (log) => log.severity === "CRITICAL",
      ).length,
      activeErrorCount: activeLogs.filter((log) => log.severity === "ERROR")
        .length,
    };
  }, [logs]);

  return (
    <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm dark:border-purple-900 dark:bg-purple-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            Systemovervågning
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
            Systemfejl
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Hurtigt overblik over nye og aktive fejl i systemfejlloggen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchSummary()}
            disabled={loading}
            className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-800 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-800 dark:bg-gray-950 dark:text-purple-200 dark:hover:bg-purple-950"
          >
            {loading ? "Opdaterer..." : "Opdater"}
          </button>
          <Link
            href="/system-error-logs"
            className="rounded-xl bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            Åbn log
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-900 dark:bg-gray-950">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nye fejl</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? "-" : summary.newCount}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-900 dark:bg-gray-950">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aktive kritiske
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? "-" : summary.activeCriticalCount}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-900 dark:bg-gray-950">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aktive fejl
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? "-" : summary.activeErrorCount}
          </p>
        </div>
      </div>
    </section>
  );
}
