import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useScheduleTemplateData } from "./useScheduleTemplateData";
import { useScheduleTemplateMasterCinema } from "./useScheduleTemplateMasterCinema";
import { useScheduleTemplatePageState } from "./useScheduleTemplatePageState";
import { useScheduleTemplateCopyActionController } from "./useScheduleTemplateCopyActionController";
import { useScheduleTemplateCrudActionController } from "./useScheduleTemplateCrudActionController";
import { useScheduleTemplateJobFunctionActionController } from "./useScheduleTemplateJobFunctionActionController";

export function useScheduleTemplatePageController() {
  const infoDialog = useInfoModal();
  const { currentUser, activeCinemaId, needsMasterCinemaSelection } =
    useScheduleTemplateMasterCinema();

  const data = useScheduleTemplateData({
    currentUser,
    activeCinemaId,
    needsMasterCinemaSelection,
    infoDialog,
  });

  const state = useScheduleTemplatePageState({
    templates: data.templates,
    selectedTemplateId: data.selectedTemplateId,
  });

  const crudActions = useScheduleTemplateCrudActionController({
    infoDialog,
    needsMasterCinemaSelection,
    activeCinemaId,
    data,
    state,
  });

  const jobFunctionActions = useScheduleTemplateJobFunctionActionController({
    infoDialog,
    activeCinemaId,
    data,
    state,
  });

  const copyActions = useScheduleTemplateCopyActionController({
    infoDialog,
    activeCinemaId,
    data,
    state,
  });

  return {
    infoDialog,
    currentUser,
    activeCinemaId,
    needsMasterCinemaSelection,
    ...data,
    ...state,
    ...crudActions,
    ...jobFunctionActions,
    ...copyActions,
  };
}

export type ScheduleTemplatePageController = ReturnType<
  typeof useScheduleTemplatePageController
>;
