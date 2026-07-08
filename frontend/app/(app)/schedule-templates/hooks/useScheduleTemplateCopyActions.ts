import type { Dispatch, FormEvent, SetStateAction } from "react";

import { copyScheduleTemplate } from "../helpers/scheduleTemplateCopy";
import { copyScheduleTemplateDayToTargets } from "../helpers/scheduleTemplateCopyDayApi";
import { getUniqueCopiedScheduleTemplateName } from "../helpers/scheduleTemplateCopyNames";
import {
  formatWeekday,
  getCopyTargetWeekdays,
} from "../helpers/scheduleTemplatePageHelpers";
import type {
  ScheduleTemplate,
  TemplateDay,
} from "../helpers/scheduleTemplatePageTypes";

type InfoDialogLike = {
  show: (options: {
    title: string;
    description: string;
    variant: "success" | "error" | "warning" | "info";
    buttonText: string;
  }) => void;
  showError: (title: string, description: string) => void;
};

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
  const resetCopyTemplateOptions = () => {
    setCopyTemplateIncludeAssignments(true);
    setCopyTemplateIncludeInactiveDays(true);
    setCopyTemplateIncludeNotes(true);
  };

  const openCopyTemplateModal = () => {
    if (!selectedTemplate) return;

    setCopyTemplateName(
      getUniqueCopiedScheduleTemplateName({
        sourceName: selectedTemplate.name,
        templates,
        ignoredTemplateId: selectedTemplate.id,
      }),
    );
    resetCopyTemplateOptions();
    setCopyTemplateModalOpen(true);
  };

  const copySelectedTemplate = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedTemplate) return;

    const nextTemplateName = copyTemplateName.trim();

    if (!nextTemplateName) {
      infoDialog.showError(
        "Navn mangler",
        "Indtast et navn på den nye vagtsskabelon.",
      );
      return;
    }

    if (copyTemplateNameExists) {
      infoDialog.showError(
        "Skabelonnavn findes allerede",
        "Vælg et andet navn til kopien, så den er nem at kende fra den eksisterende skabelon.",
      );
      return;
    }

    if (copyTemplateHasNoDays) {
      infoDialog.showError(
        "Ingen ugedage valgt",
        "Kopien skal indeholde mindst én ugedag. Slå inaktive ugedage til igen, eller vælg en skabelon med aktive ugedage.",
      );
      return;
    }

    try {
      setCopyingTemplate(true);

      const createdTemplate = await copyScheduleTemplate({
        sourceTemplate: selectedTemplate,
        newTemplateName: nextTemplateName,
        activeCinemaId,
        includeAssignments: copyTemplateIncludeAssignments,
        includeInactiveDays: copyTemplateIncludeInactiveDays,
        includeNotes: copyTemplateIncludeNotes,
      });

      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setSelectedWeekday(1);
      setCopyTemplateModalOpen(false);
      setCopyTemplateName("");
      resetCopyTemplateOptions();
      infoDialog.show({
        title: "Vagtsskabelon kopieret",
        description: `"${selectedTemplate.name}" er kopieret til "${nextTemplateName}".`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke kopiere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setCopyingTemplate(false);
    }
  };

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
    openCopyTemplateModal,
    copySelectedTemplate,
    openCopyDayModal,
    toggleCopyDayTarget,
    selectCopyDayTargets,
    copySelectedDayToTargets,
  };
}
