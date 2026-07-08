import { useInfoModal } from "@/app/hooks/useInfoModal";

import { useScheduleTemplateCopyActions } from "./useScheduleTemplateCopyActions";
import { useScheduleTemplateCrudActions } from "./useScheduleTemplateCrudActions";
import { useScheduleTemplateData } from "./useScheduleTemplateData";
import { useScheduleTemplateJobFunctionActions } from "./useScheduleTemplateJobFunctionActions";
import { useScheduleTemplateMasterCinema } from "./useScheduleTemplateMasterCinema";
import { useScheduleTemplatePageState } from "./useScheduleTemplatePageState";

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

  const crudActions = useScheduleTemplateCrudActions({
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

  const jobFunctionActions = useScheduleTemplateJobFunctionActions({
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

  const copyActions = useScheduleTemplateCopyActions({
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
