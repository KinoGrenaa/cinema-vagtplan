"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

import SystemErrorLogsAccessState from "./components/layout/SystemErrorLogsAccessState";
import SystemErrorLogsHeader from "./components/layout/SystemErrorLogsHeader";
import SystemErrorLogSummaryCards from "./components/overview/SystemErrorLogSummaryCards";

import SystemErrorLogFilters from "./components/filters/SystemErrorLogFilters";
import SystemErrorLogList from "./components/list/SystemErrorLogList";
import SystemErrorLogRetentionSection from "./components/retention/SystemErrorLogRetentionSection";

import {
  actionLabels,
  activeStatuses,
} from "./helpers/core/systemErrorLogConstants";
import {
  readErrorMessage,
} from "./helpers/core/systemErrorLogHelpers";
import type {
  LogAction,
  SeverityFilter,
  StatusFilter,
  SystemErrorLog,
  SystemErrorLogRetentionCleanupResult,
  SystemErrorLogRetentionSummary,
} from "./types";

export default function SystemErrorLogsPage() {
  const { loading: authLoading, isMaster } = useAuth();
  const infoDialog = useInfoModal();
  const noteDialog = useInputModal();
  const showErrorRef = useRef(infoDialog.showError);

  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [retentionSummary, setRetentionSummary] =
    useState<SystemErrorLogRetentionSummary | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingRetentionSummary, setLoadingRetentionSummary] = useState(false);
  const [cleaningRetention, setCleaningRetention] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("");
  const [cinemaIdFilter, setCinemaIdFilter] = useState("");

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

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

  async function updateStatus(logId: number, action: LogAction, note?: string) {
    setUpdatingLogId(logId);

    try {
      const options: RequestInit = {
        method: "PATCH",
      };

      if (action !== "seen") {
        options.body = JSON.stringify({ note: note?.trim() ?? "" });
      }

      const response = await apiFetch(
        `/system-error-logs/${logId}/${action}`,
        options,
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Status kunne ikke opdateres.",
        );

        infoDialog.showError("Kunne ikke opdatere status", message);
        return;
      }

      await fetchLogs();
      await fetchRetentionSummary();

      infoDialog.show({
        title: "Status opdateret",
        description: `Fejlen er ${actionLabels[action]}.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere status",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setUpdatingLogId(null);
    }
  }

  function requestResolutionNote(
    log: SystemErrorLog,
    action: Extract<LogAction, "resolve" | "ignore">,
  ) {
    const isResolve = action === "resolve";

    noteDialog.prompt({
      title: isResolve ? "Markér systemfejl som løst" : "Ignorer systemfejl",
      description: isResolve
        ? "Skriv en kort intern note om, hvorfor fejlen er løst."
        : "Skriv en kort intern note om, hvorfor fejlen ignoreres.",
      label: "Intern note",
      placeholder: isResolve
        ? "Fx rettet i seneste deploy eller skyldes kendt validering."
        : "Fx dublet, forventet brugerfejl eller ikke relevant.",
      confirmText: isResolve ? "Markér løst" : "Ignorer",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (note) => {
        await updateStatus(log.id, action, note);
      },
    });
  }

  function requestRetentionCleanup() {
    const cleanupCount = retentionSummary?.summary.eligibleForCleanupCount ?? 0;

    if (cleanupCount <= 0) {
      infoDialog.show({
        title: "Ingen gamle logposter",
        description: "Der er ingen systemfejl, som opbevaringspolitikken markerer til oprydning lige nu.",
        variant: "info",
        buttonText: "OK",
      });
      return;
    }

    setCleanupConfirmOpen(true);
  }

  async function cleanupRetention() {
    setCleaningRetention(true);

    try {
      const response = await apiFetch("/system-error-logs/retention-cleanup", {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Gamle logposter kunne ikke ryddes.",
        );

        infoDialog.showError("Kunne ikke rydde gamle logposter", message);
        return;
      }

      const data = (await response.json()) as SystemErrorLogRetentionCleanupResult;

      setCleanupConfirmOpen(false);
      await fetchLogs();
      await fetchRetentionSummary();

      infoDialog.show({
        title: "Gamle logposter er ryddet",
        description: `${data.deletedCount} logposter blev slettet efter opbevaringspolitikken.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke rydde gamle logposter",
        error instanceof Error ? error.message : "Ukendt fejl",
      );
    } finally {
      setCleaningRetention(false);
    }
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

  if (authLoading) {
    return <SystemErrorLogsAccessState variant="loading" />;
  }

  if (!isMaster) {
    return <SystemErrorLogsAccessState variant="forbidden" />;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <SystemErrorLogsHeader
          refreshing={loadingLogs || loadingRetentionSummary}
          onRefresh={refreshPage}
        />

        <SystemErrorLogSummaryCards cards={summaryCards} />

        <SystemErrorLogRetentionSection
          retentionSummary={retentionSummary}
          loading={loadingRetentionSummary}
          cleaning={cleaningRetention}
          onRefresh={() => void fetchRetentionSummary()}
          onCleanup={requestRetentionCleanup}
        />

        <SystemErrorLogFilters
          statusFilter={statusFilter}
          severityFilter={severityFilter}
          cinemaIdFilter={cinemaIdFilter}
          onStatusFilterChange={setStatusFilter}
          onSeverityFilterChange={setSeverityFilter}
          onCinemaIdFilterChange={setCinemaIdFilter}
          onShowActive={showActiveErrors}
          onShowNew={showNewErrors}
          onShowCritical={showCriticalErrors}
          onShowAll={showAllErrors}
          onReset={resetFilters}
        />

        <SystemErrorLogList
          logs={visibleLogs}
          loading={loadingLogs}
          updatingLogId={updatingLogId}
          onUpdateStatus={updateStatus}
          onRequestResolutionNote={requestResolutionNote}
        />
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <ConfirmModal
        open={cleanupConfirmOpen}
        title="Ryd gamle systemfejl"
        description={`Du er ved at slette ${
          retentionSummary?.summary.eligibleForCleanupCount ?? 0
        } gamle logposter efter opbevaringspolitikken. Handlingen kan ikke fortrydes.`}
        confirmText="Ryd gamle logposter"
        cancelText="Annuller"
        confirmVariant="danger"
        loading={cleaningRetention}
        onConfirm={() => void cleanupRetention()}
        onCancel={() => {
          if (!cleaningRetention) {
            setCleanupConfirmOpen(false);
          }
        }}
      />

      <InputModal
        open={noteDialog.open}
        title={noteDialog.title}
        description={noteDialog.description}
        label={noteDialog.label}
        placeholder={noteDialog.placeholder}
        value={noteDialog.value}
        confirmText={noteDialog.confirmText}
        cancelText={noteDialog.cancelText}
        loading={noteDialog.loading}
        required={noteDialog.required}
        onChange={noteDialog.setValue}
        onConfirm={noteDialog.handleConfirm}
        onCancel={noteDialog.handleCancel}
      />
    </main>
  );
}
