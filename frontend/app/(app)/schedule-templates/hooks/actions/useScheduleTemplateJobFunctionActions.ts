import type { Dispatch, SetStateAction } from "react";

import type {
  JobFunctionFormState,
  ScheduleTemplate,
} from "../../helpers/page/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";
import { useScheduleTemplateAssignmentActions } from "./useScheduleTemplateAssignmentActions";
import { useScheduleTemplateJobFunctionItemActions } from "./useScheduleTemplateJobFunctionItemActions";

type UseScheduleTemplateJobFunctionActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedWeekday: number;
  jobFunctionForm: JobFunctionFormState;
  fetchData: () => Promise<void>;
  setSavingJobFunction: Dispatch<SetStateAction<boolean>>;
  setJobFunctionForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  setSavingAssignmentKey: Dispatch<SetStateAction<string | null>>;
  setExpandedJobFunctionIds: Dispatch<SetStateAction<Set<number>>>;
};

export function useScheduleTemplateJobFunctionActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  selectedWeekday,
  jobFunctionForm,
  fetchData,
  setSavingJobFunction,
  setJobFunctionForm,
  setSavingAssignmentKey,
  setExpandedJobFunctionIds,
}: UseScheduleTemplateJobFunctionActionsArgs) {
  const jobFunctionItemActions = useScheduleTemplateJobFunctionItemActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    selectedWeekday,
    jobFunctionForm,
    fetchData,
    setSavingJobFunction,
    setJobFunctionForm,
    setExpandedJobFunctionIds,
  });

  const assignmentActions = useScheduleTemplateAssignmentActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    fetchData,
    setSavingAssignmentKey,
  });

  return {
    ...jobFunctionItemActions,
    ...assignmentActions,
  };
}
