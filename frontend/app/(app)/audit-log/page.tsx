"use client";

import PermissionGuard from "@/app/components/PermissionGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useAuth } from "@/app/providers/AuthProvider";
import AuditLogFilters from "./components/filters/AuditLogFilters";
import AuditLogHeader from "./components/layout/AuditLogHeader";
import AuditLogMasterCinemaRequired from "./components/layout/AuditLogMasterCinemaRequired";
import AuditLogListSection from "./components/list/AuditLogListSection";
import { useAuditLogData } from "./hooks/useAuditLogData";

export default function AuditLogPage() {
  const { isMaster, user } = useAuth();
  const errorDialog = useInfoModal();

  const {
    logs,
    loading,
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    expandedDateKeys,
    needsMasterCinemaSelection,
    entityTypes,
    visibleLogs,
    groupedLogs,
    toggleDateGroup,
  } = useAuditLogData({
    isMaster,
    user,
    showError: errorDialog.showError,
  });

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <>
          <div className="min-h-screen bg-gray-50 p-6 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            Indlæser ændringshistorik...
          </div>
          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </>
      </PermissionGuard>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <AuditLogMasterCinemaRequired />
          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <AuditLogHeader />
        <AuditLogFilters
          search={search}
          setSearch={setSearch}
          entityFilter={entityFilter}
          setEntityFilter={setEntityFilter}
          entityTypes={entityTypes}
        />
        <AuditLogListSection
          logs={logs}
          visibleLogs={visibleLogs}
          groupedLogs={groupedLogs}
          expandedDateKeys={expandedDateKeys}
          isMaster={isMaster}
          toggleDateGroup={toggleDateGroup}
        />
        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          buttonText={errorDialog.buttonText}
          variant={errorDialog.variant}
          onClose={errorDialog.close}
        />
      </div>
    </PermissionGuard>
  );
}
