import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useScheduleTemplateCopyActions } from "./useScheduleTemplateCopyActions";
import { useScheduleTemplateData } from "./useScheduleTemplateData";
import { useScheduleTemplatePageState } from "./useScheduleTemplatePageState";

type UseScheduleTemplateCopyActionControllerArgs = {
  infoDialog: ReturnType<typeof useInfoModal>;
  activeCinemaId: number | null;
  data: ReturnType<typeof useScheduleTemplateData>;
  state: ReturnType<typeof useScheduleTemplatePageState>;
};

export function useScheduleTemplateCopyActionController({
  infoDialog,
  activeCinemaId,
  data,
  state,
}: UseScheduleTemplateCopyActionControllerArgs) {
  return useScheduleTemplateCopyActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate: state.selectedTemplate,
    selectedDay: state.selectedDay,
    selectedWeekday: state.selectedWeekday,
    templates: data.templates,
    copyTemplateName: state.copyTemplateName,
    copyTemplateNameExists: state.copyTemplateNameExists,
    copyTemplateHasNoDays: state.copyTemplateHasNoDays,
    copyTemplateIncludeAssignments: state.copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays: state.copyTemplateIncludeInactiveDays,
    copyTemplateIncludeNotes: state.copyTemplateIncludeNotes,
    copyDayTargets: state.copyDayTargets,
    fetchData: data.fetchData,
    setCopyTemplateName: state.setCopyTemplateName,
    setCopyTemplateIncludeAssignments: state.setCopyTemplateIncludeAssignments,
    setCopyTemplateIncludeInactiveDays: state.setCopyTemplateIncludeInactiveDays,
    setCopyTemplateIncludeNotes: state.setCopyTemplateIncludeNotes,
    setCopyTemplateModalOpen: state.setCopyTemplateModalOpen,
    setCopyingTemplate: state.setCopyingTemplate,
    setSelectedTemplateId: data.setSelectedTemplateId,
    setSelectedWeekday: state.setSelectedWeekday,
    setCopyDayTargets: state.setCopyDayTargets,
    setCopyDayModalOpen: state.setCopyDayModalOpen,
    setCopyingDay: state.setCopyingDay,
  });
}
