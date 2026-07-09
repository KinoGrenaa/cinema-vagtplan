import type { Dispatch, SetStateAction } from "react";

import { copyScheduleTemplateDayToTargets } from "../helpers/scheduleTemplateCopyDayApi";
import {
  formatWeekday,
  getCopyTargetWeekdays,
} from "../helpers/scheduleTemplatePageHelpers";
import type {
  ScheduleTemplate,
  TemplateDay,
} from "../helpers/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateCopyDayActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedDay: TemplateDay | null;
  selectedWeekday: number;
  copyDayTargets: number[];
  fetchData: () => Promise<void>;
  setCopyDayTargets: Dispatch<SetStateAction<number[]>>;
  setCopyDayModalOpen: Dispatch<SetStateAction<boolean>>;
  setCopyingDay: Dispatch<SetStateAction<boolean>>;
};

export function useScheduleTemplateCopyDayActions({
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
}: UseScheduleTemplateCopyDayActionsArgs) {
  const openCopyDayModal = () => {
    if (!selectedTemplate || !selectedDay) {
      infoDialog.showError(
        "Ugedag mangler",
        "Gem ugedagen først, før den kopieres til andre dage.",
      );
      return;
    }

    setCopyDayTargets([]);
    setCopyDayModalOpen(true);
  };

  const toggleCopyDayTarget = (weekday: number) => {
    setCopyDayTargets((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((a, b) => a - b),
    );
  };

  const selectCopyDayTargets = (weekdays: number[]) => {
    setCopyDayTargets(getCopyTargetWeekdays(selectedWeekday, weekdays));
  };

  const copySelectedDayToTargets = async () => {
    if (!selectedTemplate || !selectedDay) return;

    if (copyDayTargets.length === 0) {
      infoDialog.showError(
        "Vælg modtagerdage",
        "Vælg mindst én ugedag, som den valgte dag skal kopieres til.",
      );
      return;
    }

    try {
      setCopyingDay(true);
      await copyScheduleTemplateDayToTargets({
        selectedTemplate,
        selectedDay,
        targetWeekdays: copyDayTargets,
        activeCinemaId,
      });

      await fetchData();
      setCopyDayModalOpen(false);
      setCopyDayTargets([]);
      infoDialog.show({
        title: "Ugedag kopieret",
        description: `${formatWeekday(selectedWeekday)} er kopieret til ${copyDayTargets.length} ugedag${
          copyDayTargets.length === 1 ? "" : "e"
        }.` ,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke kopiere ugedag",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setCopyingDay(false);
    }
  };

  return {
    openCopyDayModal,
    toggleCopyDayTarget,
    selectCopyDayTargets,
    copySelectedDayToTargets,
  };
}
