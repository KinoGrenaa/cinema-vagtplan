import type { Dispatch, SetStateAction } from "react";

import type {
  ScheduleTemplate,
  TemplateDay,
} from "../helpers/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";
import { useScheduleTemplateCopyDayActions } from "./useScheduleTemplateCopyDayActions";
import { useScheduleTemplateCopyTemplateActions } from "./useScheduleTemplateCopyTemplateActions";

type UseScheduleTemplateCopyActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedDay: TemplateDay | null;
  selectedWeekday: number;
  templates: ScheduleTemplate[];
  copyTemplateName: string;
  copyTemplateNameExists: boolean;
  copyTemplateHasNoDays: boolean;
  copyTemplateIncludeAssignments: boolean;
  copyTemplateIncludeInactiveDays: boolean;
  copyTemplateIncludeNotes: boolean;
  copyDayTargets: number[];
  fetchData: () => Promise<void>;
  setCopyTemplateName: Dispatch<SetStateAction<string>>;
  setCopyTemplateIncludeAssignments: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateIncludeInactiveDays: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateIncludeNotes: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateModalOpen: Dispatch<SetStateAction<boolean>>;
  setCopyingTemplate: Dispatch<SetStateAction<boolean>>;
  setSelectedTemplateId: Dispatch<SetStateAction<number | null>>;
  setSelectedWeekday: Dispatch<SetStateAction<number>>;
  setCopyDayTargets: Dispatch<SetStateAction<number[]>>;
  setCopyDayModalOpen: Dispatch<SetStateAction<boolean>>;
  setCopyingDay: Dispatch<SetStateAction<boolean>>;
};

export function useScheduleTemplateCopyActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  selectedDay,
  selectedWeekday,
  templates,
  copyTemplateName,
  copyTemplateNameExists,
  copyTemplateHasNoDays,
  copyTemplateIncludeAssignments,
  copyTemplateIncludeInactiveDays,
  copyTemplateIncludeNotes,
  copyDayTargets,
  fetchData,
  setCopyTemplateName,
  setCopyTemplateIncludeAssignments,
  setCopyTemplateIncludeInactiveDays,
  setCopyTemplateIncludeNotes,
  setCopyTemplateModalOpen,
  setCopyingTemplate,
  setSelectedTemplateId,
  setSelectedWeekday,
  setCopyDayTargets,
  setCopyDayModalOpen,
  setCopyingDay,
}: UseScheduleTemplateCopyActionsArgs) {
  const templateActions = useScheduleTemplateCopyTemplateActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    templates,
    copyTemplateName,
    copyTemplateNameExists,
    copyTemplateHasNoDays,
    copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays,
    copyTemplateIncludeNotes,
    fetchData,
    setCopyTemplateName,
    setCopyTemplateIncludeAssignments,
    setCopyTemplateIncludeInactiveDays,
    setCopyTemplateIncludeNotes,
    setCopyTemplateModalOpen,
    setCopyingTemplate,
    setSelectedTemplateId,
    setSelectedWeekday,
  });

  const dayActions = useScheduleTemplateCopyDayActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    selectedDay,
    selectedWeekday,
    copyDayTargets,
    fetchData,
    setCopyDayTargets,
    setCopyDayModalOpen,
    setCopyingDay,
  });

  return {
    ...templateActions,
    ...dayActions,
  };
}
