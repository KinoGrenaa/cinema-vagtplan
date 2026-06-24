import {
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
} from "@/app/utils/dateTime";
import type {
  LeaveRequest,
  LeaveStatus,
  LeaveStatusCounts,
  LeaveStatusFilters,
} from "./leaveRequestTypes";

type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

function getAllDayDateRange(request: LeaveRequest): LeaveDisplayDateRange | null {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const isLocalAllDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalAllDay) {
    return {
      startDate: formatDateDK(start),
      endDate: formatDateDK(end),
    };
  }

  const isUtcAllDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcAllDay) {
    return {
      startDate: formatUtcDateDK(start),
      endDate: formatUtcDateDK(end),
    };
  }

  return null;
}

export function getPeriodText(request: LeaveRequest) {
  const allDayDateRange = getAllDayDateRange(request);

  if (allDayDateRange) {
    return allDayDateRange.startDate === allDayDateRange.endDate
      ? `${allDayDateRange.startDate} · Hele dagen`
      : `${allDayDateRange.startDate} - ${allDayDateRange.endDate} · Hele dagen`;
  }

  const startDate = formatDateDK(request.startDate);
  const endDate = formatDateDK(request.endDate);
  const startClock = formatTimeDK(request.startDate);
  const endClock = formatTimeDK(request.endDate);

  return startDate === endDate
    ? `${startDate} · kl. ${startClock}-${endClock}`
    : `${startDate} kl. ${startClock} - ${endDate} kl. ${endClock}`;
}

export function getGroupKey(request: LeaveRequest) {
  const allDayDateRange = getAllDayDateRange(request);

  return allDayDateRange?.startDate ?? formatDateDK(request.startDate);
}

export function getStatusBadge(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  if (status === "CANCELLED") {
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

export function getStatusLabel(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Godkendt";
  }

  if (status === "REJECTED") {
    return "Afvist";
  }

  if (status === "CANCELLED") {
    return "Annulleret";
  }

  return "Afventer";
}

export function getStatusDescription(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Godkendt fravær";
  }

  if (status === "REJECTED") {
    return "Afvist ansøgning";
  }

  if (status === "CANCELLED") {
    return "Annulleret ansøgning";
  }

  return "Afventer behandling";
}

export function getEmptyReasonText(reason?: string | null) {
  return reason?.trim() ? reason : "Ingen årsag angivet";
}

function getLocalDateStart(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getLocalDateEnd(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function requestOverlapsDateFilter(
  request: LeaveRequest,
  fromDate: string,
  toDate: string,
) {
  const requestStart = new Date(request.startDate);
  const requestEnd = new Date(request.endDate);

  if (
    Number.isNaN(requestStart.getTime()) ||
    Number.isNaN(requestEnd.getTime())
  ) {
    return false;
  }

  const filterStart = fromDate ? getLocalDateStart(fromDate) : null;
  const filterEnd = toDate ? getLocalDateEnd(toDate) : null;

  if (filterStart && requestEnd < filterStart) {
    return false;
  }

  if (filterEnd && requestStart > filterEnd) {
    return false;
  }

  return true;
}

export function countLeaveStatuses(requests: LeaveRequest[]): LeaveStatusCounts {
  return requests.reduce<LeaveStatusCounts>(
    (counts, request) => {
      if (request.status === "PENDING") counts.pending += 1;
      if (request.status === "APPROVED") counts.approved += 1;
      if (request.status === "REJECTED") counts.rejected += 1;
      if (request.status === "CANCELLED") counts.cancelled += 1;

      return counts;
    },
    {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    },
  );
}

export function getStatusSummaryParts(requests: LeaveRequest[]) {
  const counts = countLeaveStatuses(requests);

  return [
    counts.pending > 0 ? `Afventer: ${counts.pending}` : null,
    counts.approved > 0 ? `Godkendt: ${counts.approved}` : null,
    counts.rejected > 0 ? `Afvist: ${counts.rejected}` : null,
    counts.cancelled > 0 ? `Annulleret: ${counts.cancelled}` : null,
  ].filter(Boolean);
}

export function isRequestVisibleByStatus(
  request: LeaveRequest,
  filters: LeaveStatusFilters,
) {
  if (request.status === "PENDING") return filters.pending;
  if (request.status === "APPROVED") return filters.approved;
  if (request.status === "REJECTED") return filters.rejected;
  if (request.status === "CANCELLED") return filters.cancelled;

  return false;
}

export function getActiveFilterCount(
  filters: LeaveStatusFilters,
  fromDate: string,
  toDate: string,
) {
  return (
    Object.values(filters).filter(Boolean).length +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0)
  );
}

export function getFilterSummary(
  filters: LeaveStatusFilters,
  fromDate: string,
  toDate: string,
) {
  const statusLabels = [];

  if (filters.pending) statusLabels.push("Afventer");
  if (filters.approved) statusLabels.push("Godkendte");
  if (filters.rejected) statusLabels.push("Afviste");
  if (filters.cancelled) statusLabels.push("Annullerede");

  const parts = [
    statusLabels.length > 0 ? statusLabels.join(", ") : "Ingen statusser valgt",
  ];

  if (fromDate) {
    parts.push(`fra ${formatDateDK(fromDate)}`);
  }

  if (toDate) {
    parts.push(`til ${formatDateDK(toDate)}`);
  }

  return parts.join(" · ");
}

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }

    return data.message || fallback;
  } catch {
    return fallback;
  }
}
