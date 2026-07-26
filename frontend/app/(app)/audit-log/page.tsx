"use client";

import {
  useState,
} from "react";

import PermissionGuard from "@/app/components/access/PermissionGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";
import {
  useAuth,
} from "@/app/providers/AuthProvider";

import AuditLogFilters from "./components/filters/AuditLogFilters";
import AuditLogHeader from "./components/layout/AuditLogHeader";
import AuditLogMasterCinemaRequired from "./components/layout/AuditLogMasterCinemaRequired";
import AuditLogListSection from "./components/list/AuditLogListSection";
import {
  useAuditLogData,
} from "./hooks/data/useAuditLogData";
import {
  useAuditLogView,
} from "./hooks/derived/useAuditLogView";

export default function AuditLogPage() {
  const {
    isMaster,
    user,
  } = useAuth();
  const errorDialog =
    useInfoModal();
  const [
    search,
    setSearch,
  ] = useState("");
  const [
    entityFilter,
    setEntityFilter,
  ] = useState("ALL");

  const {
    logs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    entityTypes,
    loadMore,
    needsMasterCinemaSelection,
  } = useAuditLogData({
    user,
    search,
    entityFilter,
    showError:
      errorDialog.showError,
  });

  const {
    expandedDateKeys,
    groupedLogs,
    toggleDateGroup,
  } = useAuditLogView({
    logs,
  });

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <>
          <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div
                  className="flex items-center gap-3"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">
                    Indlæser ændringshistorik...
                  </span>
                </div>
              </div>
            </div>
          </main>
          <InfoModal
            open={
              errorDialog.open
            }
            title={
              errorDialog.title
            }
            description={
              errorDialog.description
            }
            buttonText={
              errorDialog.buttonText
            }
            variant={
              errorDialog.variant
            }
            onClose={
              errorDialog.close
            }
          />
        </>
      </PermissionGuard>
    );
  }

  if (
    needsMasterCinemaSelection
  ) {
    return (
      <PermissionGuard permission="canManageUsers">
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
          <AuditLogMasterCinemaRequired />
          <InfoModal
            open={
              errorDialog.open
            }
            title={
              errorDialog.title
            }
            description={
              errorDialog.description
            }
            buttonText={
              errorDialog.buttonText
            }
            variant={
              errorDialog.variant
            }
            onClose={
              errorDialog.close
            }
          />
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <AuditLogHeader />

          <AuditLogFilters
            search={search}
            setSearch={
              setSearch
            }
            entityFilter={
              entityFilter
            }
            setEntityFilter={
              setEntityFilter
            }
            entityTypes={
              entityTypes
            }
          />

          <AuditLogListSection
            logs={logs}
            visibleLogs={
              logs
            }
            groupedLogs={
              groupedLogs
            }
            expandedDateKeys={
              expandedDateKeys
            }
            isMaster={
              isMaster
            }
            totalCount={
              totalCount
            }
            hasMore={
              hasMore
            }
            loadingMore={
              loadingMore
            }
            onLoadMore={
              loadMore
            }
            toggleDateGroup={
              toggleDateGroup
            }
          />

          <InfoModal
            open={
              errorDialog.open
            }
            title={
              errorDialog.title
            }
            description={
              errorDialog.description
            }
            buttonText={
              errorDialog.buttonText
            }
            variant={
              errorDialog.variant
            }
            onClose={
              errorDialog.close
            }
          />
        </div>
      </main>
    </PermissionGuard>
  );
}
