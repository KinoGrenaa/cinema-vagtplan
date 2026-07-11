import type {
  PayrollApprovalConflict,
  PayrollPeriodInfo,
} from "../components/modals/PayrollAdjustmentConfirmationModal";

export function getSelectedCinemaQuery() {
  const selectedCinemaId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("masterSelectedCinemaId")
      : null;

  return selectedCinemaId
    ? `?cinemaId=${encodeURIComponent(selectedCinemaId)}`
    : "";
}

export function getPayrollConflictDetails(
  payload: unknown,
): PayrollApprovalConflict {
  if (!payload || typeof payload !== "object") return {};

  const data = payload as {
    code?: string;
    title?: string;
    message?: string | PayrollApprovalConflict;
    originalPayrollPeriod?: PayrollPeriodInfo | null;
    adjustmentPayrollPeriod?: PayrollPeriodInfo | null;
  };

  if (data.message && typeof data.message === "object") {
    return data.message;
  }

  return {
    code: data.code,
    title: data.title,
    message: typeof data.message === "string" ? data.message : undefined,
    originalPayrollPeriod: data.originalPayrollPeriod,
    adjustmentPayrollPeriod: data.adjustmentPayrollPeriod,
  };
}
