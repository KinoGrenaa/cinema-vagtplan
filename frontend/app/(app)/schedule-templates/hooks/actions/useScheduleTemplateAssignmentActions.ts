import type { Dispatch, SetStateAction } from "react";

import {
  addScheduleTemplateAssignmentRequest,
  removeScheduleTemplateAssignmentRequest,
} from "../../helpers/api/scheduleTemplateJobFunctionApi";
import { getAssignmentUserId } from "../../helpers/page/scheduleTemplatePageHelpers";
import { countAssignedTemplateUsers } from "../../helpers/page/scheduleTemplateStaffingGaps";
import type {
  ScheduleTemplate,
  ScheduleTemplateAssignment,
  TemplateJobFunction,
} from "../../helpers/page/scheduleTemplatePageTypes";
import type { InfoDialogLike } from "./scheduleTemplateActionTypes";

type UseScheduleTemplateAssignmentActionsArgs = {
  infoDialog: InfoDialogLike;
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate | null;
  fetchData: () => Promise<void>;
  setSavingAssignmentKey: Dispatch<SetStateAction<string | null>>;
};

export function useScheduleTemplateAssignmentActions({
  infoDialog,
  activeCinemaId,
  selectedTemplate,
  fetchData,
  setSavingAssignmentKey,
}: UseScheduleTemplateAssignmentActionsArgs) {
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

  return {
    addTemplateAssignment,
    removeTemplateAssignment,
  };
}
