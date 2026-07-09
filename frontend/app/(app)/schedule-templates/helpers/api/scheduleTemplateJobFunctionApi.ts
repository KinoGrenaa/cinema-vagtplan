import { apiFetch } from "@/app/lib/api";

import { parseJobFunctionForm } from "../page/scheduleTemplateFormHelpers";
import { appendCinemaId, readErrorMessage } from "../page/scheduleTemplatePageHelpers";
import type {
  JobFunctionFormState,
  ScheduleTemplateAssignment,
  TemplateJobFunction,
} from "../page/scheduleTemplatePageTypes";

type TemplateJobFunctionRequestOptions = {
  activeCinemaId: number | null;
  templateId: number;
};

export async function addScheduleTemplateJobFunctionRequest({
  activeCinemaId,
  templateId,
  weekday,
  form,
}: TemplateJobFunctionRequestOptions & {
  weekday: number;
  form: JobFunctionFormState;
}) {
  const payload = {
    ...parseJobFunctionForm(form),
    cinemaId: activeCinemaId,
  };

  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/days/${weekday}/job-functions`,
      activeCinemaId,
    ),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke tilføje jobfunktion"),
    );
  }
}

export async function updateScheduleTemplateJobFunctionRequest({
  activeCinemaId,
  templateId,
  item,
  updates,
}: TemplateJobFunctionRequestOptions & {
  item: TemplateJobFunction;
  updates: Partial<Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">>;
}) {
  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/day-job-functions/${item.id}`,
      activeCinemaId,
    ),
    {
      method: "PATCH",
      body: JSON.stringify({
        jobFunctionId: item.jobFunctionId,
        requiredCount: updates.requiredCount ?? item.requiredCount,
        sortOrder: updates.sortOrder ?? item.sortOrder,
        note: updates.note ?? item.note,
        cinemaId: activeCinemaId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke opdatere jobfunktion"),
    );
  }
}

export async function removeScheduleTemplateJobFunctionRequest({
  activeCinemaId,
  templateId,
  itemId,
}: TemplateJobFunctionRequestOptions & {
  itemId: number;
}) {
  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/day-job-functions/${itemId}`,
      activeCinemaId,
    ),
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke fjerne jobfunktion"),
    );
  }
}

export async function addScheduleTemplateAssignmentRequest({
  activeCinemaId,
  templateId,
  item,
  userId,
}: TemplateJobFunctionRequestOptions & {
  item: TemplateJobFunction;
  userId: number;
}) {
  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/day-job-functions/${item.id}/assignments`,
      activeCinemaId,
    ),
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        sortOrder: item.assignments?.length ?? 0,
        cinemaId: activeCinemaId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke tildele medarbejder"),
    );
  }
}

export async function removeScheduleTemplateAssignmentRequest({
  activeCinemaId,
  templateId,
  item,
  assignment,
}: TemplateJobFunctionRequestOptions & {
  item: TemplateJobFunction;
  assignment: ScheduleTemplateAssignment;
}) {
  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/day-job-functions/${item.id}/assignments/${assignment.id}`,
      activeCinemaId,
    ),
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke fjerne medarbejder"),
    );
  }
}
