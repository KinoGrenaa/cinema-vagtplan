import type { Dispatch, FormEvent, SetStateAction } from "react";

import { emptyJobFunctionForm } from "../helpers/scheduleTemplateFormHelpers";
import {
  addScheduleTemplateAssignmentRequest,
  addScheduleTemplateJobFunctionRequest,
  removeScheduleTemplateAssignmentRequest,
  removeScheduleTemplateJobFunctionRequest,
  updateScheduleTemplateJobFunctionRequest,
} from "../helpers/scheduleTemplateJobFunctionApi";
import { formatWeekday, getAssignmentUserId } from "../helpers/scheduleTemplatePageHelpers";
import { countAssignedTemplateUsers } from "../helpers/scheduleTemplateStaffingGaps";
import type {
  JobFunctionFormState,
  ScheduleTemplate,
  ScheduleTemplateAssignment,
  TemplateJobFunction,
} from "../helpers/scheduleTemplatePageTypes";

type InfoDialogLike = {
  showError: (title: string, description: string) => void;
};

type UseScheduleTemplateJobFunctionActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  selectedWeekday: number;
  jobFunctionForm: JobFunctionFormState;
  fetchData: () => Promise<void>;
  setSavingJobFunction: Dispatch<SetStateAction<boolean>>;
  setJobFunctionForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  setSavingAssignmentKey: Dispatch<SetStateAction<string | null>>;
  setExpandedJobFunctionIds: Dispatch<SetStateAction<Set<number>>>;
};

export function useScheduleTemplateJobFunctionActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  selectedWeekday,
  jobFunctionForm,
  fetchData,
  setSavingJobFunction,
  setJobFunctionForm,
  setSavingAssignmentKey,
  setExpandedJobFunctionIds,
}: UseScheduleTemplateJobFunctionActionsArgs) {
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

  const addTemplateAssignment = async (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => {
    if (!selectedTemplate) return;

    const userId = Number(userIdValue);
    if (!Number.isInteger(userId) || userId <= 0) return;

    const alreadyAssigned = (item.assignments ?? []).some(
      (assignment) => getAssignmentUserId(assignment) === userId,
    );

    if (alreadyAssigned) return;

    if (countAssignedTemplateUsers(item.assignments) >= item.requiredCount) {
      infoDialog.showError(
        "Alle vagter har fast medarbejder",
        "Hæv antal vagter på jobfunktionen, hvis der skal tilføjes flere faste medarbejdere.",
      );
      return;
    }

    const key = `${item.id}:add`;

    try {
      setSavingAssignmentKey(key);
      await addScheduleTemplateAssignmentRequest({
        templateId: selectedTemplate.id,
        item,
        userId,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tildele medarbejder",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingAssignmentKey(null);
    }
  };

  const removeTemplateAssignment = async (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => {
    if (!selectedTemplate) return;

    const key = `${item.id}:remove:${assignment.id}`;

    try {
      setSavingAssignmentKey(key);
      await removeScheduleTemplateAssignmentRequest({
        templateId: selectedTemplate.id,
        item,
        assignment,
        activeCinemaId,
      });

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne medarbejder",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingAssignmentKey(null);
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
    addTemplateAssignment,
    removeTemplateAssignment,
    toggleJobFunctionDetails,
  };
}
