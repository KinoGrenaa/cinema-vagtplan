import type { JobFunctionsPageModalsProps } from "../components/page/JobFunctionsPageModals";
import type { useJobFunctionEmployeeAssignments } from "../hooks/useJobFunctionEmployeeAssignments";
import type { useJobFunctionForm } from "../hooks/useJobFunctionForm";
import type { useJobFunctionTimingRule } from "../hooks/useJobFunctionTimingRule";
import type { useJobFunctionsData } from "../hooks/useJobFunctionsData";

type JobFunctionsData = ReturnType<typeof useJobFunctionsData>;
type JobFunctionForm = ReturnType<typeof useJobFunctionForm>;
type JobFunctionEmployeeAssignments = ReturnType<
  typeof useJobFunctionEmployeeAssignments
>;
type JobFunctionTimingRule = ReturnType<typeof useJobFunctionTimingRule>;

type BuildPageModalsPropsOptions = {
  assignments: JobFunctionEmployeeAssignments;
  data: JobFunctionsData;
  form: JobFunctionForm;
  timingRule: JobFunctionTimingRule;
};

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
