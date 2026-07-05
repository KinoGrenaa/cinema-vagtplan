import type { JobFunctionsPageContentProps } from "../components/JobFunctionsPageContent";
import type { useJobFunctionArchiveActions } from "../hooks/useJobFunctionArchiveActions";
import type { useJobFunctionDetailsExpansion } from "../hooks/useJobFunctionDetailsExpansion";
import type { useJobFunctionEmployeeAssignments } from "../hooks/useJobFunctionEmployeeAssignments";
import type { useJobFunctionForm } from "../hooks/useJobFunctionForm";
import type { useJobFunctionTimingRule } from "../hooks/useJobFunctionTimingRule";
import type { useJobFunctionsData } from "../hooks/useJobFunctionsData";

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
