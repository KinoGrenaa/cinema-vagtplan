"use client";

import AdminGuard from "@/app/components/AdminGuard";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import JobFunctionsFeedbackModals from "./components/JobFunctionsFeedbackModals";
import JobFunctionsPageContent from "./components/JobFunctionsPageContent";
import JobFunctionsPageModals from "./components/JobFunctionsPageModals";
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
      <JobFunctionsPageContent
        needsMasterCinemaSelection={needsMasterCinemaSelection}
        overviewProps={{
          activeCount,
          archivedCount,
          expandedJobFunctionIds,
          jobFunctions,
          loading,
          missingPayrollTypeWarning,
          showArchived,
          onArchive: archiveJobFunction,
          onCreate: openCreateModal,
          onEdit: openEditModal,
          onOpenEmployees: openEmployeeModal,
          onOpenTimingRule: openTimingRuleModal,
          onReactivate: reactivateJobFunction,
          onRefresh: fetchData,
          onShowArchivedChange: setShowArchived,
          onToggleDetails: toggleJobFunctionDetails,
        }}
      />

      <JobFunctionsPageModals
        formModalOpen={formModalOpen}
        formModalProps={{
          form,
          isEditing,
          payrollTypes,
          saving,
          setForm,
          onClose: closeFormModal,
          onSubmit: submitForm,
        }}
        timingRuleModalProps={
          timingModalJobFunction
            ? {
                dayPeriods,
                jobFunction: timingModalJobFunction,
                timingRule,
                timingRuleForm,
                timingRuleLoading,
                timingRuleSaving,
                setTimingRuleForm,
                onArchive: archiveTimingRule,
                onClose: closeTimingRuleModal,
                onSubmit: saveTimingRule,
              }
            : null
        }
        employeeModalProps={
          employeeModalJobFunction
            ? {
                jobFunction: employeeModalJobFunction,
                assignments,
                assignmentLoading,
                assignmentSaving,
                availableUsers,
                selectedUserId,
                onSelectedUserIdChange: setSelectedUserId,
                onAssignSelectedUser: assignSelectedUser,
                onRemoveAssignedUser: removeAssignedUser,
                onClose: closeEmployeeModal,
              }
            : null
        }
      />

      <JobFunctionsFeedbackModals
        confirmModalProps={{
          open: confirmDialog.open,
          title: confirmDialog.title,
          description: confirmDialog.description,
          confirmText: confirmDialog.confirmText,
          cancelText: confirmDialog.cancelText,
          confirmVariant: confirmDialog.confirmVariant,
          loading: confirmDialog.loading,
          onConfirm: confirmDialog.handleConfirm,
          onCancel: confirmDialog.handleCancel,
        }}
        infoModalProps={{
          open: infoDialog.open,
          title: infoDialog.title,
          description: infoDialog.description,
          buttonText: infoDialog.buttonText,
          variant: infoDialog.variant,
          onClose: infoDialog.close,
        }}
      />
    </AdminGuard>
  );
}
