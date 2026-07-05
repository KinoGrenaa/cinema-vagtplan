import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";

import type { JobFunctionsFeedbackModalsProps } from "../components/JobFunctionsFeedbackModals";
import type { JobFunctionsPageContentProps } from "../components/JobFunctionsPageContent";
import type { JobFunctionsPageModalsProps } from "../components/JobFunctionsPageModals";
import type { useJobFunctionArchiveActions } from "../hooks/useJobFunctionArchiveActions";
import type { useJobFunctionDetailsExpansion } from "../hooks/useJobFunctionDetailsExpansion";
import type { useJobFunctionEmployeeAssignments } from "../hooks/useJobFunctionEmployeeAssignments";
import type { useJobFunctionForm } from "../hooks/useJobFunctionForm";
import type { useJobFunctionTimingRule } from "../hooks/useJobFunctionTimingRule";
import type { useJobFunctionsData } from "../hooks/useJobFunctionsData";

type ConfirmDialog = ReturnType<typeof useConfirm>;
type InfoDialog = ReturnType<typeof useInfoModal>;
type JobFunctionsData = ReturnType<typeof useJobFunctionsData>;
type JobFunctionDetailsExpansion = ReturnType<
  typeof useJobFunctionDetailsExpansion
>;
type JobFunctionForm = ReturnType<typeof useJobFunctionForm>;
type JobFunctionEmployeeAssignments = ReturnType<
  typeof useJobFunctionEmployeeAssignments
>;
type JobFunctionTimingRule = ReturnType<typeof useJobFunctionTimingRule>;
type JobFunctionArchiveActions = ReturnType<
  typeof useJobFunctionArchiveActions
>;

type BuildPageContentPropsOptions = {
  archiveActions: JobFunctionArchiveActions;
  assignments: JobFunctionEmployeeAssignments;
  data: JobFunctionsData;
  detailsExpansion: JobFunctionDetailsExpansion;
  form: JobFunctionForm;
  needsMasterCinemaSelection: boolean;
  timingRule: JobFunctionTimingRule;
};

type BuildPageModalsPropsOptions = {
  assignments: JobFunctionEmployeeAssignments;
  data: JobFunctionsData;
  form: JobFunctionForm;
  timingRule: JobFunctionTimingRule;
};

type BuildFeedbackModalsPropsOptions = {
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
};

export function buildJobFunctionsPageContentProps({
  archiveActions,
  assignments,
  data,
  detailsExpansion,
  form,
  needsMasterCinemaSelection,
  timingRule,
}: BuildPageContentPropsOptions): JobFunctionsPageContentProps {
  return {
    needsMasterCinemaSelection,
    overviewProps: {
      activeCount: data.activeCount,
      archivedCount: data.archivedCount,
      expandedJobFunctionIds: detailsExpansion.expandedJobFunctionIds,
      jobFunctions: data.jobFunctions,
      loading: data.loading,
      missingPayrollTypeWarning: data.missingPayrollTypeWarning,
      showArchived: data.showArchived,
      onArchive: archiveActions.archiveJobFunction,
      onCreate: form.openCreateModal,
      onEdit: form.openEditModal,
      onOpenEmployees: assignments.openEmployeeModal,
      onOpenTimingRule: timingRule.openTimingRuleModal,
      onReactivate: archiveActions.reactivateJobFunction,
      onRefresh: data.fetchData,
      onShowArchivedChange: data.setShowArchived,
      onToggleDetails: detailsExpansion.toggleJobFunctionDetails,
    },
  };
}

export function buildJobFunctionsPageModalsProps({
  assignments,
  data,
  form,
  timingRule,
}: BuildPageModalsPropsOptions): JobFunctionsPageModalsProps {
  return {
    formModalOpen: form.formModalOpen,
    formModalProps: {
      form: form.form,
      isEditing: form.isEditing,
      payrollTypes: data.payrollTypes,
      saving: form.saving,
      setForm: form.setForm,
      onClose: form.closeFormModal,
      onSubmit: form.submitForm,
    },
    timingRuleModalProps: timingRule.timingModalJobFunction
      ? {
          dayPeriods: data.dayPeriods,
          jobFunction: timingRule.timingModalJobFunction,
          timingRule: timingRule.timingRule,
          timingRuleForm: timingRule.timingRuleForm,
          timingRuleLoading: timingRule.timingRuleLoading,
          timingRuleSaving: timingRule.timingRuleSaving,
          setTimingRuleForm: timingRule.setTimingRuleForm,
          onArchive: timingRule.archiveTimingRule,
          onClose: timingRule.closeTimingRuleModal,
          onSubmit: timingRule.saveTimingRule,
        }
      : null,
    employeeModalProps: assignments.employeeModalJobFunction
      ? {
          jobFunction: assignments.employeeModalJobFunction,
          assignments: assignments.assignments,
          assignmentLoading: assignments.assignmentLoading,
          assignmentSaving: assignments.assignmentSaving,
          availableUsers: assignments.availableUsers,
          selectedUserId: assignments.selectedUserId,
          onSelectedUserIdChange: assignments.setSelectedUserId,
          onAssignSelectedUser: assignments.assignSelectedUser,
          onRemoveAssignedUser: assignments.removeAssignedUser,
          onClose: assignments.closeEmployeeModal,
        }
      : null,
  };
}

export function buildJobFunctionsFeedbackModalsProps({
  confirmDialog,
  infoDialog,
}: BuildFeedbackModalsPropsOptions): JobFunctionsFeedbackModalsProps {
  return {
    confirmModalProps: {
      open: confirmDialog.open,
      title: confirmDialog.title,
      description: confirmDialog.description,
      confirmText: confirmDialog.confirmText,
      cancelText: confirmDialog.cancelText,
      confirmVariant: confirmDialog.confirmVariant,
      loading: confirmDialog.loading,
      onConfirm: confirmDialog.handleConfirm,
      onCancel: confirmDialog.handleCancel,
    },
    infoModalProps: {
      open: infoDialog.open,
      title: infoDialog.title,
      description: infoDialog.description,
      buttonText: infoDialog.buttonText,
      variant: infoDialog.variant,
      onClose: infoDialog.close,
    },
  };
}
