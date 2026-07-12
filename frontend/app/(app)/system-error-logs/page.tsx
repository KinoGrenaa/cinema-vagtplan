"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";

import SystemErrorLogFilters from "./components/filters/SystemErrorLogFilters";
import SystemErrorLogList from "./components/list/SystemErrorLogList";
import SystemErrorLogsAccessState from "./components/layout/SystemErrorLogsAccessState";
import SystemErrorLogsHeader from "./components/layout/SystemErrorLogsHeader";
import SystemErrorLogSummaryCards from "./components/overview/SystemErrorLogSummaryCards";
import SystemErrorLogRetentionSection from "./components/retention/SystemErrorLogRetentionSection";
import { useSystemErrorLogsPage } from "./hooks/useSystemErrorLogsPage";

export default function SystemErrorLogsPage() {
  const {
    authLoading,
    isMaster,
    infoDialog,
    noteDialog,
    retentionSummary,
    loadingLogs,
    loadingRetentionSummary,
    cleaningRetention,
    cleanupConfirmOpen,
    setCleanupConfirmOpen,
    updatingLogId,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    cinemaIdFilter,
    setCinemaIdFilter,
    visibleLogs,
    summaryCards,
    refreshPage,
    fetchRetentionSummary,
    updateStatus,
    requestResolutionNote,
    requestRetentionCleanup,
    cleanupRetention,
    showActiveErrors,
    showNewErrors,
    showCriticalErrors,
    showAllErrors,
    resetFilters,
  } = useSystemErrorLogsPage();

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
