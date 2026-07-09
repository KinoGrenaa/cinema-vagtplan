import type {
  DayFormState,
  JobFunctionFormState,
  ScheduleTemplate,
  TemplateDay,
  TemplateFormState,
} from "./scheduleTemplatePageTypes";

export const emptyTemplateForm: TemplateFormState = {
  name: "",
  description: "",
  weekParity: "ANY",
  sortOrder: "0",
};

export const emptyJobFunctionForm: JobFunctionFormState = {
  jobFunctionId: "",
  requiredCount: "1",
  sortOrder: "0",
  note: "",
};

export function parseTemplateForm(form: TemplateFormState) {
  const name = form.name.trim();
  const description = form.description.trim() || null;
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!name) {
    throw new Error("Indtast et navn på vagtsskabelonen.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return { name, description, weekParity: form.weekParity, sortOrder };
}

export function toTemplateForm(template: ScheduleTemplate): TemplateFormState {
  return {
    name: template.name,
    description: template.description ?? "",
    weekParity: template.weekParity,
    sortOrder: String(template.sortOrder ?? 0),
  };
}

export function toDayForm(day: TemplateDay | null): DayFormState {
  return {
    isActive: day?.isActive ?? true,
    note: day?.note ?? "",
    sortOrder: String(day?.sortOrder ?? 0),
  };
}

export function parseDayForm(form: DayFormState) {
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    isActive: form.isActive,
    note: form.note.trim() || null,
    sortOrder,
  };
}

export function parseJobFunctionForm(form: JobFunctionFormState) {
  const jobFunctionId = Number(form.jobFunctionId);
  const requiredCount = form.requiredCount.trim()
    ? Number(form.requiredCount)
    : 1;
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!Number.isInteger(jobFunctionId) || jobFunctionId <= 0) {
    throw new Error("Vælg en jobfunktion.");
  }

  if (
    !Number.isInteger(requiredCount) ||
    requiredCount <= 0 ||
    requiredCount > 50
  ) {
    throw new Error("Antal vagter skal være mellem 1 og 50.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    jobFunctionId,
    requiredCount,
    sortOrder,
    note: form.note.trim() || null,
  };
}
