"use client";

import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import WorkTypeFormSection from "./components/form/WorkTypeFormSection";
import WorkTypesHeader from "./components/layout/WorkTypesHeader";
import WorkTypesMasterCinemaRequired from "./components/layout/WorkTypesMasterCinemaRequired";
import WorkTypesListSection from "./components/list/WorkTypesListSection";
import { useWorkTypeActions } from "./hooks/useWorkTypeActions";
import { useWorkTypesData } from "./hooks/useWorkTypesData";

export default function WorkTypesPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const {
    activeCinemaId,
    needsMasterCinemaSelection,
    workTypes,
    payrollTypes,
    loading,
    isMaster,
    showArchived,
    setShowArchived,
    fetchWorkTypes,
  } = useWorkTypesData(infoDialog);

  const {
    name,
    setName,
    color,
    setColor,
    payrollTypeId,
    setPayrollTypeId,
    createWorkType,
    removeWorkType,
    reactivateWorkType,
  } = useWorkTypeActions({
    activeCinemaId,
    needsMasterCinemaSelection,
    confirmDialog,
    infoDialog,
    refreshWorkTypes: fetchWorkTypes,
  });

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl space-y-6">
          <WorkTypesHeader />

          {needsMasterCinemaSelection && <WorkTypesMasterCinemaRequired />}

          <WorkTypeFormSection
            name={name}
            color={color}
            payrollTypeId={payrollTypeId}
            payrollTypes={payrollTypes}
            disabled={needsMasterCinemaSelection}
            onNameChange={setName}
            onColorChange={setColor}
            onPayrollTypeIdChange={setPayrollTypeId}
            onCreate={createWorkType}
          />

          <WorkTypesListSection
            workTypes={workTypes}
            loading={loading}
            isMaster={isMaster}
            showArchived={showArchived}
            disabled={needsMasterCinemaSelection}
            onShowArchivedChange={setShowArchived}
            onRemove={removeWorkType}
            onReactivate={reactivateWorkType}
          />
        </div>
      </main>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
