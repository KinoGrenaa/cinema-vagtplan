import type { Dispatch, SetStateAction } from "react";

import type {
  DayFormState,
  ScheduleTemplate,
  TemplateFormState,
} from "../helpers/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";
import { useScheduleTemplateDayActions } from "./useScheduleTemplateDayActions";
import { useScheduleTemplateTemplateActions } from "./useScheduleTemplateTemplateActions";

type UseScheduleTemplateCrudActionsArgs = {
  infoDialog: InfoDialogLike;
  needsMasterCinemaSelection: boolean;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedWeekday: number;
  createTemplateForm: TemplateFormState;
  templateForm: TemplateFormState;
  dayForm: DayFormState;
  fetchData: () => Promise<void>;
  setSavingTemplate: Dispatch<SetStateAction<boolean>>;
  setSavingDay: Dispatch<SetStateAction<boolean>>;
  setSelectedTemplateId: Dispatch<SetStateAction<number | null>>;
  setCreateTemplateForm: Dispatch<SetStateAction<TemplateFormState>>;
  setCreateTemplateModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingTemplate: Dispatch<SetStateAction<boolean>>;
};

export function useScheduleTemplateCrudActions({
  infoDialog,
  needsMasterCinemaSelection,
  activeCinemaId,
  selectedTemplate,
  selectedWeekday,
  createTemplateForm,
  templateForm,
  dayForm,
  fetchData,
  setSavingTemplate,
  setSavingDay,
  setSelectedTemplateId,
  setCreateTemplateForm,
  setCreateTemplateModalOpen,
  setEditingTemplate,
}: UseScheduleTemplateCrudActionsArgs) {
  const templateActions = useScheduleTemplateTemplateActions({
    infoDialog,
    needsMasterCinemaSelection,
    activeCinemaId,
    selectedTemplate,
    createTemplateForm,
    templateForm,
    fetchData,
    setSavingTemplate,
    setSelectedTemplateId,
    setCreateTemplateForm,
    setCreateTemplateModalOpen,
    setEditingTemplate,
  });

  const dayActions = useScheduleTemplateDayActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    selectedWeekday,
    dayForm,
    fetchData,
    setSavingDay,
  });

  return {
    ...templateActions,
    ...dayActions,
  };
}
