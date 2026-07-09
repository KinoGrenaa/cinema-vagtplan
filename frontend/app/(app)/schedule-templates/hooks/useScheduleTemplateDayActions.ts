import type { Dispatch, SetStateAction } from "react";

import { saveScheduleTemplateDayRequest } from "../helpers/scheduleTemplateCrudApi";
import type {
  DayFormState,
  ScheduleTemplate,
} from "../helpers/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateDayActionsArgs = {
  infoDialog: Pick<InfoDialogLike, "showError">;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedWeekday: number;
  dayForm: DayFormState;
  fetchData: () => Promise<void>;
  setSavingDay: Dispatch<SetStateAction<boolean>>;
};

export function useScheduleTemplateDayActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  selectedWeekday,
  dayForm,
  fetchData,
  setSavingDay,
}: UseScheduleTemplateDayActionsArgs) {
  const saveSelectedDay = async () => {
    if (!selectedTemplate) return;

    try {
      setSavingDay(true);
      await saveScheduleTemplateDayRequest({
        templateId: selectedTemplate.id,
        weekday: selectedWeekday,
        form: dayForm,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme ugedag",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingDay(false);
    }
  };

  return {
    saveSelectedDay,
  };
}
