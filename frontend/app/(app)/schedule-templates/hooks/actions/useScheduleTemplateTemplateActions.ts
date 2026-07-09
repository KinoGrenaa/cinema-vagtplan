import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  archiveScheduleTemplateRequest,
  createScheduleTemplateRequest,
  reactivateScheduleTemplateRequest,
  updateScheduleTemplateRequest,
} from "../../helpers/api/scheduleTemplateCrudApi";
import { emptyTemplateForm } from "../../helpers/page/scheduleTemplateFormHelpers";
import type {
  ScheduleTemplate,
  TemplateFormState,
} from "../../helpers/page/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateTemplateActionsArgs = {
  infoDialog: InfoDialogLike;
  needsMasterCinemaSelection: boolean;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  createTemplateForm: TemplateFormState;
  templateForm: TemplateFormState;
  fetchData: () => Promise<void>;
  setSavingTemplate: Dispatch<SetStateAction<boolean>>;
  setSelectedTemplateId: Dispatch<SetStateAction<number | null>>;
  setCreateTemplateForm: Dispatch<SetStateAction<TemplateFormState>>;
  setCreateTemplateModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingTemplate: Dispatch<SetStateAction<boolean>>;
};

export function useScheduleTemplateTemplateActions({
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
}: UseScheduleTemplateTemplateActionsArgs) {
  const createTemplate = async (event: FormEvent) => {
    event.preventDefault();

    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du opretter vagtsskabeloner.",
      );
      return;
    }

    try {
      setSavingTemplate(true);
      const createdTemplate = await createScheduleTemplateRequest({
        form: createTemplateForm,
        activeCinemaId,
      });

      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setCreateTemplateForm(emptyTemplateForm);
      setCreateTemplateModalOpen(false);
      infoDialog.show({
        title: "Vagtsskabelon oprettet",
        description:
          "Skabelonen er oprettet.\nVælg ugedage, jobfunktioner og faste medarbejdere, før den bruges i vagtplanlægningen.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const updateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSavingTemplate(true);
      await updateScheduleTemplateRequest({
        templateId: selectedTemplate.id,
        form: templateForm,
        activeCinemaId,
      });

      await fetchData();
      setEditingTemplate(false);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const archiveTemplate = async (template: ScheduleTemplate) => {
    if (!window.confirm(`Vil du arkivere vagtsskabelonen "${template.name}"?`)) {
      return;
    }

    try {
      await archiveScheduleTemplateRequest({
        templateId: template.id,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke arkivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const reactivateTemplate = async (template: ScheduleTemplate) => {
    try {
      await reactivateScheduleTemplateRequest({
        templateId: template.id,
        activeCinemaId,
      });

      await fetchData();
      setSelectedTemplateId(template.id);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke genaktivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  return {
    createTemplate,
    updateTemplate,
    archiveTemplate,
    reactivateTemplate,
  };
}
