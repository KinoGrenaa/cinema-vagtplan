import { normalizeColorValue } from "../page/jobFunctionHelpers";
import type { JobFunctionWithJobFunction } from "../payroll/jobFunctionPayrollHelpers";

export type JobFunctionFormState = {
  name: string;
  description: string;
  color: string;
  sortOrder: string;
  payrollTypeId: string;
};

export const emptyJobFunctionForm: JobFunctionFormState = {
  name: "",
  description: "",
  color: "#2563eb",
  sortOrder: "0",
  payrollTypeId: "",
};

export function toJobFunctionFormState(
  jobFunction: JobFunctionWithJobFunction,
): JobFunctionFormState {
  return {
    name: jobFunction.name,
    description: jobFunction.description ?? "",
    color: jobFunction.color || "#2563eb",
    sortOrder: String(jobFunction.sortOrder ?? 0),
    payrollTypeId: jobFunction.defaultPayrollExportCode?.id
      ? String(jobFunction.defaultPayrollExportCode.id)
      : jobFunction.defaultPayrollExportCodeId
        ? String(jobFunction.defaultPayrollExportCodeId)
        : "",
  };
}

export function parseJobFunctionForm(form: JobFunctionFormState) {
  const name = form.name.trim();
  const description = form.description.trim() || null;
  const color = normalizeColorValue(form.color);
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;
  const defaultPayrollExportCodeId = form.payrollTypeId
    ? Number(form.payrollTypeId)
    : null;

  if (!name) throw new Error("Indtast et navn på jobfunktionen.");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Farve skal være en gyldig hex-farve.");
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }
  if (
    form.payrollTypeId &&
    (defaultPayrollExportCodeId === null ||
      !Number.isInteger(defaultPayrollExportCodeId) ||
      defaultPayrollExportCodeId <= 0)
  ) {
    throw new Error("Eksportkode skal være et gyldigt valg.");
  }

  return {
    name,
    description,
    color,
    sortOrder,
    defaultPayrollExportCodeId,
  };
}
