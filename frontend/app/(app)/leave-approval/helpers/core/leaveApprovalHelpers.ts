import { formatDateDK, formatUtcDateDK } from "@/app/utils/dateTime";
import type {
  LeaveDisplayDateRange,
  LeaveRequest,
  LeaveStatusFilters,
  StoredUser,
} from "./leaveApprovalTypes";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export function getFullDayDateRange(
  start: Date,
  end: Date,
): LeaveDisplayDateRange | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const isLocalFullDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalFullDay) {
    return {
      startDate: formatDateDK(start),
      endDate: formatDateDK(end),
    };
  }

  const isUtcFullDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcFullDay) {
    return {
      startDate: formatUtcDateDK(start),
      endDate: formatUtcDateDK(end),
    };
  }

  return null;
}

export function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDateKeyFromDanishDate(date: string) {
  const [day, month, year] = date.split(".");

  if (!day || !month || !year) {
    return date;
  }

  return `${year}-${month}-${day}`;
}

export function formatDateGroupTitle(key: string, fallbackDate: string) {
  const date = new Date(`${key}T12:00:00`);
  const weekday = Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("da-DK", { weekday: "long" }).format(date);

  if (!weekday) {
    return fallbackDate;
  }

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(
    1,
  )} ${fallbackDate}`;
}

export function getLeaveDateGroupMeta(request: LeaveRequest) {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const fullDayDateRange = getFullDayDateRange(start, end);

  if (fullDayDateRange) {
    const key = getDateKeyFromDanishDate(fullDayDateRange.startDate);
    return {
      key,
      title: formatDateGroupTitle(key, fullDayDateRange.startDate),
      sortTime: new Date(`${key}T12:00:00`).getTime(),
    };
  }

  if (Number.isNaN(start.getTime())) {
    return {
      key: request.startDate,
      title: "Ukendt dato",
      sortTime: 0,
    };
  }

  const key = getLocalDateKey(start);
  const displayDate = formatDateDK(start);

  return {
    key,
    title: formatDateGroupTitle(key, displayDate),
    sortTime: start.getTime(),
  };
}

export function makeDateGroupExpansionKey(userId: number, dateKey: string) {
  return `${userId}:${dateKey}`;
}

export function getUserName(request: LeaveRequest) {
  return `${request.user.firstName} ${request.user.lastName}`.trim();
}

export function getStatusFilterSummary(filters: LeaveStatusFilters) {
  const labels = [];

  if (filters.pending) labels.push("Afventer");
  if (filters.approved) labels.push("Godkendte");
  if (filters.rejected) labels.push("Afviste");
  if (filters.cancelled) labels.push("Annullerede");

  return labels.length > 0 ? labels.join(", ") : "Ingen statusser valgt";
}

export function getActiveFilterCount(
  filters: LeaveStatusFilters,
  startDateFilter: string,
  endDateFilter: string,
) {
  return (
    Object.values(filters).filter(Boolean).length +
    (startDateFilter ? 1 : 0) +
    (endDateFilter ? 1 : 0)
  );
}

export function matchesStatusFilter(
  request: LeaveRequest,
  filters: LeaveStatusFilters,
) {
  if (request.status === "PENDING") return filters.pending;
  if (request.status === "APPROVED") return filters.approved;
  if (request.status === "REJECTED") return filters.rejected;
  if (request.status === "CANCELLED") return filters.cancelled;

  return false;
}

export function getDateFilterStart(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDateFilterEnd(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function matchesDateFilter(
  request: LeaveRequest,
  startDateFilter: string,
  endDateFilter: string,
) {
  const requestStart = new Date(request.startDate);
  const requestEnd = new Date(request.endDate);
  const filterStart = getDateFilterStart(startDateFilter);
  const filterEnd = getDateFilterEnd(endDateFilter);

  if (
    Number.isNaN(requestStart.getTime()) ||
    Number.isNaN(requestEnd.getTime())
  ) {
    return true;
  }

  if (filterStart && requestEnd < filterStart) {
    return false;
  }

  if (filterEnd && requestStart > filterEnd) {
    return false;
  }

  return true;
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

export function getStoredUser() {
  const savedUser = window.localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(savedUser) as StoredUser;

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export function getSelectedMasterCinemaId() {
  const cinemaId = Number(
    window.localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;

  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}
