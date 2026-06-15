import { apiFetch } from "../../../lib/api";

import type {
  CinemaPayrollSettings,
  PayrollAuditHistory,
  PayrollPeriod,
  PayrollReportResponse,
  User,
} from "../types";

export type PayrollExportType = "csv" | "xlsx" | "pdf" | "uniconta";

export type PayrollPeriodParams = {
  startDate: string;
  endDate: string;
};

export type PayrollReportParams = PayrollPeriodParams & {
  userId?: string;
};

function getCurrentCinemaId() {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem("user");

  if (!savedUser) return null;

  try {
    const user = JSON.parse(savedUser) as { cinemaId?: number };
    return user.cinemaId || null;
  } catch {
    return null;
  }
}

function buildPayrollParams(params: PayrollReportParams, includeUser = true) {
  const searchParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });

  if (includeUser && params.userId) {
    searchParams.set("userId", params.userId);
  }

  return searchParams;
}

async function readErrorMessage(response: Response, fallback: string) {
  const errorText = await response.text().catch(() => "");

  if (!errorText) return fallback;

  try {
    const errorData = JSON.parse(errorText);

    if (errorData?.message) {
      return Array.isArray(errorData.message)
        ? errorData.message.join("\n")
        : String(errorData.message);
    }
  } catch {
    // Fall back to plain text below.
  }

  return errorText;
}

export async function fetchCinemaPayrollSettings() {
  const cinemaId = getCurrentCinemaId();

  if (!cinemaId) return null;

  const response = await apiFetch(`/cinemas/${cinemaId}`);

  if (!response.ok) return null;

  return (await response.json()) as CinemaPayrollSettings;
}

export async function fetchUsers() {
  const response = await apiFetch("/users");

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data) ? (data as User[]) : [];
}

export async function fetchPayrollReport(params: PayrollReportParams) {
  const response = await apiFetch(
    `/payroll?${buildPayrollParams(params).toString()}`,
  );

  if (!response.ok) {
    return {
      employees: [],
      pendingCount: 0,
      voidedCount: 0,
      adjustmentCount: 0,
    } satisfies PayrollReportResponse;
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return {
      employees: data,
      pendingCount: 0,
      voidedCount: 0,
      adjustmentCount: 0,
    } satisfies PayrollReportResponse;
  }

  return {
    employees: Array.isArray(data.employees) ? data.employees : [],
    pendingCount: Number(data.pendingCount || 0),
    voidedCount: Number(data.voidedCount || 0),
    adjustmentCount: Number(data.adjustmentCount || 0),
  } satisfies PayrollReportResponse;
}

export async function fetchPayrollPeriod(params: PayrollPeriodParams) {
  const response = await apiFetch(
    `/payroll/period?${buildPayrollParams(params, false).toString()}`,
  );

  if (!response.ok) return null;

  const text = await response.text();

  if (!text) return null;

  return (JSON.parse(text) || null) as PayrollPeriod | null;
}

export async function fetchPayrollAuditHistory(params: PayrollPeriodParams) {
  const response = await apiFetch(
    `/payroll/audit-history?${buildPayrollParams(params, false).toString()}`,
  );

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data) ? (data as PayrollAuditHistory[]) : [];
}

export async function downloadPayrollExport(
  type: PayrollExportType,
  params: PayrollReportParams,
) {
  const endpoint =
    type === "uniconta"
      ? "/payroll/export/uniconta"
      : `/payroll/export/${type}`;

  const response = await apiFetch(
    `${endpoint}?${buildPayrollParams(params).toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Eksporten kunne ikke gennemføres."),
    );
  }

  return response.blob();
}

export async function lockPayrollPeriod(params: PayrollPeriodParams) {
  const response = await apiFetch("/payroll/period/lock", {
    method: "POST",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Låsning fejlede"));
  }
}

export async function unlockPayrollPeriod(periodId: number, note: string) {
  const response = await apiFetch(`/payroll/period/${periodId}/unlock`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Oplåsning fejlede"));
  }
}
