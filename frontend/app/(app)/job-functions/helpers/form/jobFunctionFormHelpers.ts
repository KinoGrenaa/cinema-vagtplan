import { normalizeColorValue } from "../page/jobFunctionHelpers";
import type { JobFunctionWithWorkType } from "../payroll/jobFunctionPayrollHelpers";

export type JobFunctionFormState = {
  name: string;
  description: string;
  color: string;
  sortOrder: string;
  dayPeriodId: string;
  payrollTypeId: string;
};

export const emptyJobFunctionForm: JobFunctionFormState = {
  name: "",
  description: "",
  color: "#2563eb",
  sortOrder: "0",
  dayPeriodId: "",
  payrollTypeId: "",
};

export function toJobFunctionFormState(
  jobFunction: JobFunctionWithWorkType,
): JobFunctionFormState {
  return {
    name: jobFunction.name,
    description: jobFunction.description ?? "",
    color: jobFunction.color || "#2563eb",
    sortOrder: String(jobFunction.sortOrder ?? 0),
    dayPeriodId: jobFunction.dayPeriodId ? String(jobFunction.dayPeriodId) : "",
    payrollTypeId: jobFunction.workType?.payrollType?.id
      ? String(jobFunction.workType.payrollType.id)
      : jobFunction.workType?.payrollTypeId
        ? String(jobFunction.workType.payrollTypeId)
        : "",
  };
}

export function parseJobFunctionForm(form: JobFunctionFormState) {
  const name = form.name.trim();
  const description = form.description.trim() || null;
  const color = normalizeColorValue(form.color);
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;
  const dayPeriodId = form.dayPeriodId ? Number(form.dayPeriodId) : null;
  const payrollTypeId = form.payrollTypeId ? Number(form.payrollTypeId) : null;

  if (!name) {
    throw new Error("Indtast et navn på jobfunktionen.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Farve skal være en gyldig hex-farve.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  if (
    form.dayPeriodId &&
    (dayPeriodId === null || !Number.isInteger(dayPeriodId) || dayPeriodId <= 0)
  ) {
    throw new Error("Dagsperiode skal være et gyldigt valg.");
  }

  if (
    form.payrollTypeId &&
    (payrollTypeId === null ||
      !Number.isInteger(payrollTypeId) ||
      payrollTypeId <= 0)
  ) {
    throw new Error("Oprettes som skal være en gyldig løntype.");
  }

  return {
    name,
    description,
    color,
    sortOrder,
    dayPeriodId,
    payrollTypeId,
  };
}
