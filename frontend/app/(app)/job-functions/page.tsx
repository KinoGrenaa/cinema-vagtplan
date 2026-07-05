"use client";

import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import JobFunctionEmployeeModal from "./components/JobFunctionEmployeeModal";
import JobFunctionFormModal from "./components/JobFunctionFormModal";
import JobFunctionTimingRuleModal from "./components/JobFunctionTimingRuleModal";
import JobFunctionsMasterCinemaRequired from "./components/JobFunctionsMasterCinemaRequired";
import JobFunctionsOverviewSection from "./components/JobFunctionsOverviewSection";
import JobFunctionsPageHeader from "./components/JobFunctionsPageHeader";
import { useJobFunctionArchiveActions } from "./hooks/useJobFunctionArchiveActions";
import { useJobFunctionDetailsExpansion } from "./hooks/useJobFunctionDetailsExpansion";
import { useJobFunctionEmployeeAssignments } from "./hooks/useJobFunctionEmployeeAssignments";
import { useJobFunctionForm } from "./hooks/useJobFunctionForm";
import { useJobFunctionTimingRule } from "./hooks/useJobFunctionTimingRule";
import { useJobFunctionsData } from "./hooks/useJobFunctionsData";
import { useJobFunctionsMasterCinema } from "./hooks/useJobFunctionsMasterCinema";

export default function JobFunctionsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const { activeCinemaId, currentUser, needsMasterCinemaSelection } =
    useJobFunctionsMasterCinema();
  const {
    activeCount,
    archivedCount,
    dayPeriods,
    fetchData,
    jobFunctions,
    loading,
    missingPayrollTypeWarning,
    payrollTypes,
    setShowArchived,
    showArchived,
    users,
  } = useJobFunctionsData({
    activeCinemaId,
    currentUserReady: currentUser !== null,
    needsMasterCinemaSelection,
    showError: infoDialog.showError,
  });

  const { expandedJobFunctionIds, toggleJobFunctionDetails } =
    useJobFunctionDetailsExpansion();
  const {
    closeFormModal,
    editingId,
    form,
    formModalOpen,
    isEditing,
    openCreateModal,
    openEditModal,
    saving,
    setForm,
    submitForm,
  } = useJobFunctionForm({
    activeCinemaId,
    needsMasterCinemaSelection,
    refreshData: fetchData,
    show: infoDialog.show,
    showError: infoDialog.showError,
  });
  const {
    assignmentLoading,
    assignmentSaving,
    assignments,
    availableUsers,
    closeEmployeeModal,
    employeeModalJobFunction,
    openEmployeeModal,
    removeAssignedUser,
    assignSelectedUser,
    selectedUserId,
    setSelectedUserId,
  } = useJobFunctionEmployeeAssignments({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: fetchData,
    showError: infoDialog.showError,
    users,
  });
  const {
    archiveTimingRule,
    closeTimingRuleModal,
    openTimingRuleModal,
    saveTimingRule,
    setTimingRuleForm,
    timingModalJobFunction,
    timingRule,
    timingRuleForm,
    timingRuleLoading,
    timingRuleSaving,
  } = useJobFunctionTimingRule({
    activeCinemaId,
    confirm: confirmDialog.confirm,
    refreshData: fetchData,
    showError: infoDialog.showError,
  });
  const { archiveJobFunction, reactivateJobFunction } =
    useJobFunctionArchiveActions({
      activeCinemaId,
      closeFormModal,
      confirm: confirmDialog.confirm,
      editingId,
      refreshData: fetchData,
      showError: infoDialog.showError,
    });

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <JobFunctionsPageHeader />

          {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <JobFunctionsOverviewSection
              activeCount={activeCount}
              archivedCount={archivedCount}
              expandedJobFunctionIds={expandedJobFunctionIds}
              jobFunctions={jobFunctions}
              loading={loading}
              missingPayrollTypeWarning={missingPayrollTypeWarning}
              showArchived={showArchived}
              onArchive={archiveJobFunction}
              onCreate={openCreateModal}
              onEdit={openEditModal}
              onOpenEmployees={openEmployeeModal}
              onOpenTimingRule={openTimingRuleModal}
              onReactivate={reactivateJobFunction}
              onRefresh={fetchData}
              onShowArchivedChange={setShowArchived}
              onToggleDetails={toggleJobFunctionDetails}
            />
          )}
        </div>
      </main>

      {formModalOpen && (
        <JobFunctionFormModal
          form={form}
          isEditing={isEditing}
          payrollTypes={payrollTypes}
          saving={saving}
          setForm={setForm}
          onClose={closeFormModal}
          onSubmit={submitForm}
        />
      )}

      {timingModalJobFunction && (
        <JobFunctionTimingRuleModal
          dayPeriods={dayPeriods}
          jobFunction={timingModalJobFunction}
          timingRule={timingRule}
          timingRuleForm={timingRuleForm}
          timingRuleLoading={timingRuleLoading}
          timingRuleSaving={timingRuleSaving}
          setTimingRuleForm={setTimingRuleForm}
          onArchive={archiveTimingRule}
          onClose={closeTimingRuleModal}
          onSubmit={saveTimingRule}
        />
      )}

      {employeeModalJobFunction && (
        <JobFunctionEmployeeModal
          jobFunction={employeeModalJobFunction}
          assignments={assignments}
          assignmentLoading={assignmentLoading}
          assignmentSaving={assignmentSaving}
          availableUsers={availableUsers}
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
          onAssignSelectedUser={assignSelectedUser}
          onRemoveAssignedUser={removeAssignedUser}
          onClose={closeEmployeeModal}
        />
      )}
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
