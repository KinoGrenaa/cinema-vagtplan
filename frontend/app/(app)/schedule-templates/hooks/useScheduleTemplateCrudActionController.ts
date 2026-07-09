import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useScheduleTemplateCrudActions } from "./useScheduleTemplateCrudActions";
import { useScheduleTemplateData } from "./useScheduleTemplateData";
import { useScheduleTemplatePageState } from "./useScheduleTemplatePageState";

type UseScheduleTemplateCrudActionControllerArgs = {
  infoDialog: ReturnType<typeof useInfoModal>;
  needsMasterCinemaSelection: boolean;
  activeCinemaId: number | null;
  data: ReturnType<typeof useScheduleTemplateData>;
  state: ReturnType<typeof useScheduleTemplatePageState>;
};

export function useScheduleTemplateCrudActionController({
  infoDialog,
  needsMasterCinemaSelection,
  activeCinemaId,
  data,
  state,
}: UseScheduleTemplateCrudActionControllerArgs) {
  return useScheduleTemplateCrudActions({
    infoDialog,
    needsMasterCinemaSelection,
    activeCinemaId,
    selectedTemplate: state.selectedTemplate,
    selectedWeekday: state.selectedWeekday,
    createTemplateForm: state.createTemplateForm,
    templateForm: state.templateForm,
    dayForm: state.dayForm,
    fetchData: data.fetchData,
    setSavingTemplate: state.setSavingTemplate,
    setSavingDay: state.setSavingDay,
    setSelectedTemplateId: data.setSelectedTemplateId,
    setCreateTemplateForm: state.setCreateTemplateForm,
    setCreateTemplateModalOpen: state.setCreateTemplateModalOpen,
    setEditingTemplate: state.setEditingTemplate,
  });
}
