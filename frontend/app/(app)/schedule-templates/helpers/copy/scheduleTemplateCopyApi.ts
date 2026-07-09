import { apiFetch } from "@/app/lib/api";

import { getTemplateDaysForCopy } from "./scheduleTemplateCopySummary";
import type {
  ScheduleTemplateAssignment,
  ScheduleTemplateCopySource,
  TemplateJobFunction,
} from "./scheduleTemplateCopyTypes";

function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cinemaId=${cinemaId}`;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.join("\n");

  return fallback;
}

function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

function sortTemplateJobFunctions(items: TemplateJobFunction[]) {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
  );
}

function sortTemplateAssignments(assignments: ScheduleTemplateAssignment[]) {
  return [...assignments].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id,
  );
}

export async function copyScheduleTemplate({
  sourceTemplate,
  newTemplateName,
  activeCinemaId,
  includeAssignments = true,
  includeInactiveDays = true,
  includeNotes = true,
}: {
  sourceTemplate: ScheduleTemplateCopySource;
  newTemplateName: string;
  activeCinemaId: number | null;
  includeAssignments?: boolean;
  includeInactiveDays?: boolean;
  includeNotes?: boolean;
}) {
  const createResponse = await apiFetch("/schedule-templates", {
    method: "POST",
    body: JSON.stringify({
      name: newTemplateName,
      description: includeNotes ? sourceTemplate.description : null,
      weekParity: sourceTemplate.weekParity,
      sortOrder: (sourceTemplate.sortOrder ?? 0) + 1,
      cinemaId: activeCinemaId,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(
      await readErrorMessage(createResponse, "Kunne ikke oprette kopi"),
    );
  }

  const createdTemplate =
    (await createResponse.json()) as ScheduleTemplateCopySource;

  if (!createdTemplate?.id) {
    throw new Error("Kopien blev oprettet, men svaret manglede skabelon-id.");
  }

  for (const day of getTemplateDaysForCopy(sourceTemplate, includeInactiveDays)) {
    const dayResponse = await apiFetch(
      appendCinemaId(
        `/schedule-templates/${createdTemplate.id}/days/${day.weekday}`,
        activeCinemaId,
      ),
      {
        method: "PATCH",
        body: JSON.stringify({
          isActive: day.isActive,
          note: includeNotes ? day.note : null,
          sortOrder: day.sortOrder,
          cinemaId: activeCinemaId,
        }),
      },
    );

    if (!dayResponse.ok) {
      throw new Error(
        await readErrorMessage(dayResponse, "Kunne ikke kopiere ugedag"),
      );
    }

    for (const item of sortTemplateJobFunctions(day.jobFunctions)) {
      const jobFunctionResponse = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${createdTemplate.id}/days/${day.weekday}/job-functions`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            jobFunctionId: item.jobFunctionId,
            requiredCount: item.requiredCount,
            sortOrder: item.sortOrder,
            note: includeNotes ? item.note : null,
            cinemaId: activeCinemaId,
          }),
        },
      );

      if (!jobFunctionResponse.ok) {
        throw new Error(
          await readErrorMessage(
            jobFunctionResponse,
            "Kunne ikke kopiere jobfunktion",
          ),
        );
      }

      const createdItem = (await jobFunctionResponse
        .json()
        .catch(() => null)) as TemplateJobFunction | null;

      if (!createdItem?.id || !includeAssignments) continue;

      for (const assignment of sortTemplateAssignments(item.assignments ?? [])) {
        const userId = getAssignmentUserId(assignment);
        if (!userId) continue;

        const assignmentResponse = await apiFetch(
          appendCinemaId(
            `/schedule-templates/${createdTemplate.id}/day-job-functions/${createdItem.id}/assignments`,
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

  return createdTemplate;
}
