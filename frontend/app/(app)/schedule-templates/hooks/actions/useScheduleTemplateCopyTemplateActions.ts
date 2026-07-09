import type { Dispatch, FormEvent, SetStateAction } from "react";

import { copyScheduleTemplate } from "../../helpers/copy/scheduleTemplateCopy";
import { getUniqueCopiedScheduleTemplateName } from "../../helpers/copy/scheduleTemplateCopyNames";
import type { ScheduleTemplate } from "../../helpers/page/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateCopyTemplateActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  templates: ScheduleTemplate[];
  copyTemplateName: string;
  copyTemplateNameExists: boolean;
  copyTemplateHasNoDays: boolean;
  copyTemplateIncludeAssignments: boolean;
  copyTemplateIncludeInactiveDays: boolean;
  copyTemplateIncludeNotes: boolean;
  fetchData: () => Promise<void>;
  setCopyTemplateName: Dispatch<SetStateAction<string>>;
  setCopyTemplateIncludeAssignments: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateIncludeInactiveDays: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateIncludeNotes: Dispatch<SetStateAction<boolean>>;
  setCopyTemplateModalOpen: Dispatch<SetStateAction<boolean>>;
  setCopyingTemplate: Dispatch<SetStateAction<boolean>>;
  setSelectedTemplateId: Dispatch<SetStateAction<number | null>>;
  setSelectedWeekday: Dispatch<SetStateAction<number>>;
};

export function useScheduleTemplateCopyTemplateActions({
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
}: UseScheduleTemplateCopyTemplateActionsArgs) {
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

  return {
    openCopyTemplateModal,
    copySelectedTemplate,
  };
}
