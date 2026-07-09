import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  getAssignmentUserId,
  getTemplateDay,
  readErrorMessage,
} from "../page/scheduleTemplatePageHelpers";
import type {
  ScheduleTemplate,
  TemplateDay,
  TemplateJobFunction,
} from "../page/scheduleTemplatePageTypes";

type CopyScheduleTemplateDayToTargetsOptions = {
  activeCinemaId: number | null;
  selectedTemplate: ScheduleTemplate;
  selectedDay: TemplateDay;
  targetWeekdays: number[];
};

export async function copyScheduleTemplateDayToTargets({
  activeCinemaId,
  selectedTemplate,
  selectedDay,
  targetWeekdays,
}: CopyScheduleTemplateDayToTargetsOptions) {
  for (const targetWeekday of targetWeekdays) {
    const targetDay = getTemplateDay(selectedTemplate, targetWeekday);

    for (const item of targetDay?.jobFunctions ?? []) {
      const deleteResponse = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}`,
          activeCinemaId,
        ),
        { method: "DELETE" },
      );

      if (!deleteResponse.ok) {
        throw new Error(
          await readErrorMessage(deleteResponse, "Kunne ikke rydde modtagerdag"),
        );
      }
    }

    const dayResponse = await apiFetch(
      appendCinemaId(
        `/schedule-templates/${selectedTemplate.id}/days/${targetWeekday}`,
        activeCinemaId,
      ),
      {
        method: "PATCH",
        body: JSON.stringify({
          isActive: selectedDay.isActive,
          note: selectedDay.note,
          sortOrder: selectedDay.sortOrder,
          cinemaId: activeCinemaId,
        }),
      },
    );

    if (!dayResponse.ok) {
      throw new Error(
        await readErrorMessage(dayResponse, "Kunne ikke kopiere ugedag"),
      );
    }

    for (const item of selectedDay.jobFunctions) {
      const createResponse = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/days/${targetWeekday}/job-functions`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            jobFunctionId: item.jobFunctionId,
            requiredCount: item.requiredCount,
            sortOrder: item.sortOrder,
            note: item.note,
            cinemaId: activeCinemaId,
          }),
        },
      );

      if (!createResponse.ok) {
        throw new Error(
          await readErrorMessage(createResponse, "Kunne ikke kopiere jobfunktion"),
        );
      }

      const createdItem = (await createResponse
        .json()
        .catch(() => null)) as TemplateJobFunction | null;

      if (!createdItem?.id) continue;

      for (const assignment of item.assignments ?? []) {
        const userId = getAssignmentUserId(assignment);
        if (!userId) continue;

        const assignmentResponse = await apiFetch(
          appendCinemaId(
            `/schedule-templates/${selectedTemplate.id}/day-job-functions/${createdItem.id}/assignments`,
            activeCinemaId,
          ),
          {
            method: "POST",
            body: JSON.stringify({
              userId,
              sortOrder: assignment.sortOrder ?? 0,
              cinemaId: activeCinemaId,
            }),
          },
        );

        if (!assignmentResponse.ok) {
          throw new Error(
            await readErrorMessage(
              assignmentResponse,
              "Kunne ikke kopiere faste medarbejdere",
            ),
          );
        }
      }
    }
  }
}
