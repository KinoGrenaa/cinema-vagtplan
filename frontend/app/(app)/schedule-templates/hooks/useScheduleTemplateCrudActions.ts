import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  archiveScheduleTemplateRequest,
  createScheduleTemplateRequest,
  reactivateScheduleTemplateRequest,
  saveScheduleTemplateDayRequest,
  updateScheduleTemplateRequest,
} from "../helpers/scheduleTemplateCrudApi";
import { emptyTemplateForm } from "../helpers/scheduleTemplateFormHelpers";
import type {
  DayFormState,
  ScheduleTemplate,
  TemplateFormState,
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
    createTemplate,
    updateTemplate,
    archiveTemplate,
    reactivateTemplate,
    saveSelectedDay,
  };
}
