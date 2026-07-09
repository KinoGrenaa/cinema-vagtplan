import type { Dispatch, FormEvent, SetStateAction } from "react";

import { emptyJobFunctionForm } from "../../helpers/page/scheduleTemplateFormHelpers";
import {
  addScheduleTemplateJobFunctionRequest,
  removeScheduleTemplateJobFunctionRequest,
  updateScheduleTemplateJobFunctionRequest,
} from "../../helpers/api/scheduleTemplateJobFunctionApi";
import { formatWeekday } from "../../helpers/page/scheduleTemplatePageHelpers";
import { countAssignedTemplateUsers } from "../../helpers/page/scheduleTemplateStaffingGaps";
import type {
  JobFunctionFormState,
  ScheduleTemplate,
  TemplateJobFunction,
} from "../../helpers/page/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateJobFunctionItemActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedWeekday: number;
  jobFunctionForm: JobFunctionFormState;
  fetchData: () => Promise<void>;
  setSavingJobFunction: Dispatch<SetStateAction<boolean>>;
  setJobFunctionForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  setExpandedJobFunctionIds: Dispatch<SetStateAction<Set<number>>>;
};

export function useScheduleTemplateJobFunctionItemActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  selectedWeekday,
  jobFunctionForm,
  fetchData,
  setSavingJobFunction,
  setJobFunctionForm,
  setExpandedJobFunctionIds,
}: UseScheduleTemplateJobFunctionItemActionsArgs) {
  const addJobFunction = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    try {
      setSavingJobFunction(true);
      await addScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        weekday: selectedWeekday,
        form: jobFunctionForm,
        activeCinemaId,
      });

      setJobFunctionForm(emptyJobFunctionForm);
      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tilføje jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingJobFunction(false);
    }
  };

  const updateTemplateJobFunction = async (
    item: TemplateJobFunction,
    updates: Partial<Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">>,
  ) => {
    if (!selectedTemplate) return;

    const nextRequiredCount = updates.requiredCount ?? item.requiredCount;
    const assignedCount = countAssignedTemplateUsers(item.assignments);

    if (nextRequiredCount < assignedCount) {
      infoDialog.showError(
        "Antal vagter er for lavt",
        `Antal vagter kan ikke være lavere end antal faste medarbejdere (${assignedCount}).\nFjern faste medarbejdere først, eller hæv antal vagter.`,
      );
      return;
    }

    try {
      await updateScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        item,
        updates,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const removeTemplateJobFunction = async (item: TemplateJobFunction) => {
    if (!selectedTemplate) return;

    if (
      !window.confirm(
        `Vil du fjerne "${item.jobFunction.name}" fra ${formatWeekday(selectedWeekday)}?`,
      )
    ) {
      return;
    }

    try {
      await removeScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        itemId: item.id,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const toggleJobFunctionDetails = (id: number) => {
    setExpandedJobFunctionIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return {
    addJobFunction,
    updateTemplateJobFunction,
    removeTemplateJobFunction,
    toggleJobFunctionDetails,
  };
}
