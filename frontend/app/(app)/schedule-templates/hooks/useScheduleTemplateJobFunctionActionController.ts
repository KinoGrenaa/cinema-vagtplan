import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useScheduleTemplateData } from "./useScheduleTemplateData";
import { useScheduleTemplateJobFunctionActions } from "./useScheduleTemplateJobFunctionActions";
import { useScheduleTemplatePageState } from "./useScheduleTemplatePageState";

type UseScheduleTemplateJobFunctionActionControllerArgs = {
  infoDialog: ReturnType<typeof useInfoModal>;
  activeCinemaId: number | null;
  data: ReturnType<typeof useScheduleTemplateData>;
  state: ReturnType<typeof useScheduleTemplatePageState>;
};

export function useScheduleTemplateJobFunctionActionController({
  infoDialog,
  activeCinemaId,
  data,
  state,
}: UseScheduleTemplateJobFunctionActionControllerArgs) {
  return useScheduleTemplateJobFunctionActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate: state.selectedTemplate,
    selectedWeekday: state.selectedWeekday,
    jobFunctionForm: state.jobFunctionForm,
    fetchData: data.fetchData,
    setSavingJobFunction: state.setSavingJobFunction,
    setJobFunctionForm: state.setJobFunctionForm,
    setSavingAssignmentKey: state.setSavingAssignmentKey,
    setExpandedJobFunctionIds: state.setExpandedJobFunctionIds,
  });
}
