import { apiFetch } from "@/app/lib/api";

type WeekParity = "ANY" | "EVEN" | "ODD";

type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: { id: number } | null;
};

type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  assignments?: ScheduleTemplateAssignment[];
};

type TemplateDay = {
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  jobFunctions: TemplateJobFunction[];
};

export type ScheduleTemplateCopySource = {
  id: number;
  name: string;
  description: string | null;
  weekParity: WeekParity;
  sortOrder: number;
  days?: TemplateDay[];
};

export type TemplateStaffingSummary = {
  dayCount: number;
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};

export type TemplateCopyDaySummary = {
  weekday: number;
  isActive: boolean;
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};

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

function countAssignedTemplateUsers(
  assignments: ScheduleTemplateAssignment[] | undefined,
) {
  return (assignments ?? []).filter(
    (assignment) => getAssignmentUserId(assignment) !== null,
  ).length;
}

function sortTemplateDays(days: TemplateDay[]) {
  return [...days].sort((a, b) => a.weekday - b.weekday);
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

function summarizeTemplateCopyDay(day: TemplateDay): TemplateCopyDaySummary {
  const shiftCount = day.jobFunctions.reduce(
    (sum, item) => sum + item.requiredCount,
    0,
  );
  const assignedShiftCount = day.jobFunctions.reduce(
    (sum, item) => sum + countAssignedTemplateUsers(item.assignments),
    0,
  );

  return {
    weekday: day.weekday,
    isActive: day.isActive,
    jobFunctionCount: day.jobFunctions.length,
    shiftCount,
    assignedShiftCount,
    openShiftCount: Math.max(shiftCount - assignedShiftCount, 0),
  };
}

export function summarizeTemplateStaffing(
  template: ScheduleTemplateCopySource | null,
): TemplateStaffingSummary {
  return (template?.days ?? []).reduce<TemplateStaffingSummary>(
    (summary, day) => {
      const daySummary = summarizeTemplateCopyDay(day);

      return {
        dayCount: summary.dayCount + 1,
        jobFunctionCount: summary.jobFunctionCount + daySummary.jobFunctionCount,
        shiftCount: summary.shiftCount + daySummary.shiftCount,
        assignedShiftCount:
          summary.assignedShiftCount + daySummary.assignedShiftCount,
        openShiftCount: summary.openShiftCount + daySummary.openShiftCount,
      };
    },
    {
      dayCount: 0,
      jobFunctionCount: 0,
      shiftCount: 0,
      assignedShiftCount: 0,
      openShiftCount: 0,
    },
  );
}

export function summarizeTemplateCopyDays(
  template: ScheduleTemplateCopySource | null,
): TemplateCopyDaySummary[] {
  return sortTemplateDays(template?.days ?? []).map(summarizeTemplateCopyDay);
}

export async function copyScheduleTemplate({
  sourceTemplate,
  newTemplateName,
  activeCinemaId,
  includeAssignments = true,
}: {
  sourceTemplate: ScheduleTemplateCopySource;
  newTemplateName: string;
  activeCinemaId: number | null;
  includeAssignments?: boolean;
}) {
  const createResponse = await apiFetch("/schedule-templates", {
    method: "POST",
    body: JSON.stringify({
      name: newTemplateName,
      description: sourceTemplate.description,
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

  for (const day of sortTemplateDays(sourceTemplate.days ?? [])) {
    const dayResponse = await apiFetch(
      appendCinemaId(
        `/schedule-templates/${createdTemplate.id}/days/${day.weekday}`,
        activeCinemaId,
      ),
      {
        method: "PATCH",
        body: JSON.stringify({
          isActive: day.isActive,
          note: day.note,
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
            note: item.note,
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
