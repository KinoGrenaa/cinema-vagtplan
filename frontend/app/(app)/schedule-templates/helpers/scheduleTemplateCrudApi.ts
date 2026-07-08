import { apiFetch } from "@/app/lib/api";

import {
  parseDayForm,
  parseTemplateForm,
} from "./scheduleTemplateFormHelpers";
import { appendCinemaId, readErrorMessage } from "./scheduleTemplatePageHelpers";
import type {
  DayFormState,
  ScheduleTemplate,
  TemplateFormState,
} from "./scheduleTemplatePageTypes";

type CinemaRequestOptions = {
  activeCinemaId: number | null;
};

type TemplateRequestOptions = CinemaRequestOptions & {
  templateId: number;
};

export async function createScheduleTemplateRequest({
  form,
  activeCinemaId,
}: CinemaRequestOptions & {
  form: TemplateFormState;
}): Promise<ScheduleTemplate> {
  const payload = {
    ...parseTemplateForm(form),
    cinemaId: activeCinemaId,
  };

  const response = await apiFetch("/schedule-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke oprette vagtsskabelon"),
    );
  }

  return (await response.json()) as ScheduleTemplate;
}

export async function updateScheduleTemplateRequest({
  templateId,
  form,
  activeCinemaId,
}: TemplateRequestOptions & {
  form: TemplateFormState;
}) {
  const payload = {
    ...parseTemplateForm(form),
    cinemaId: activeCinemaId,
  };

  const response = await apiFetch(
    appendCinemaId(`/schedule-templates/${templateId}`, activeCinemaId),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke opdatere vagtsskabelon"),
    );
  }
}

export async function archiveScheduleTemplateRequest({
  templateId,
  activeCinemaId,
}: TemplateRequestOptions) {
  const response = await apiFetch(
    appendCinemaId(`/schedule-templates/${templateId}`, activeCinemaId),
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke arkivere vagtsskabelon"),
    );
  }
}

export async function reactivateScheduleTemplateRequest({
  templateId,
  activeCinemaId,
}: TemplateRequestOptions) {
  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/reactivate`,
      activeCinemaId,
    ),
    { method: "PATCH" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke genaktivere vagtsskabelon"),
    );
  }
}

export async function saveScheduleTemplateDayRequest({
  templateId,
  weekday,
  form,
  activeCinemaId,
}: TemplateRequestOptions & {
  weekday: number;
  form: DayFormState;
}) {
  const payload = {
    ...parseDayForm(form),
    cinemaId: activeCinemaId,
  };

  const response = await apiFetch(
    appendCinemaId(
      `/schedule-templates/${templateId}/days/${weekday}`,
      activeCinemaId,
    ),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Kunne ikke gemme ugedag"));
  }
}
