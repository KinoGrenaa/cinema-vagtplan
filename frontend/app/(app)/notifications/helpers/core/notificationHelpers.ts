import type { Notification } from "@/app/types/notifications";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

import type {
  DateGroup,
  NotificationCategory,
  User,
} from "./notificationTypes";

export const notificationTypeLabels: Record<Notification["type"], string> = {
  SHIFT_TRADE: "Vagtbytte",
  SHIFT_DIRECT: "Direkte vagtbytte",
  SHIFT_ASSIGNED: "Ny vagt",
  SHIFT_ACCEPTED: "Vagtbytte accepteret",
  SHIFT_REJECTED: "Vagtbytte afvist",
  NEW_MESSAGE: "Ny besked",
  TIME_ENTRY: "Tidsregistrering",
  STAFFING_ALERT: "Bemandingsadvarsel",
  STAFFING_REQUEST: "Bemandingsforespørgsel",
  STAFFING_ACCEPTED: "Bemanding accepteret",
  LEAVE_REQUEST_CREATED: "Ny fraværsansøgning",
  LEAVE_REQUEST_APPROVED: "Fravær godkendt",
  LEAVE_REQUEST_REJECTED: "Fravær afvist",
  LEAVE_REQUEST_CANCELLED_BY_EMPLOYEE:
    "Fravær annulleret af medarbejder",
  LEAVE_REQUEST_CANCELLED_BY_ADMIN:
    "Fravær annulleret af leder",
  SYSTEM: "System",
};

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {
    // Brug fallback hvis svaret ikke er JSON.
  }

  return fallback;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getNotificationTypeLabel(type: Notification["type"]) {
  return notificationTypeLabels[type] ?? "System";
}

function getDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatDateGroupLabel(dateKey: string) {
  if (dateKey === "ukendt") {
    return "Ukendt dato";
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return "Ukendt dato";
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(date);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDateDK(
    date,
  )}`;
}

export function formatDateTimeDK(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

export function getUserName(user?: User | null) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`;
}

export function groupByDate<T>(
  items: T[],
  getDateValue: (item: T) => string,
  getUnreadValue?: (item: T) => boolean,
): DateGroup<T>[] {
  const sortedItems = [...items].sort(
    (left, right) =>
      getTimestamp(getDateValue(right)) - getTimestamp(getDateValue(left)),
  );

  return sortedItems.reduce<DateGroup<T>[]>((groups, item) => {
    const dateKey = getDateKey(getDateValue(item));
    const existingGroup = groups.find((group) => group.dateKey === dateKey);
    const isUnread = getUnreadValue?.(item) ?? false;

    if (existingGroup) {
      existingGroup.items.push(item);

      if (isUnread) {
        existingGroup.unreadCount = (existingGroup.unreadCount ?? 0) + 1;
      }

      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateGroupLabel(dateKey),
      unreadCount: isUnread ? 1 : 0,
      items: [item],
    });

    return groups;
  }, []);
}

export function getCategoryLabel(category: NotificationCategory) {
  switch (category) {
    case "system":
      return "System";
    case "messages":
      return "Beskeder";
    case "directTrades":
      return "Direkte bytter";
    case "poolTrades":
      return "Vagtpulje";
  }
}

export function getCategoryEmptyText(category: NotificationCategory) {
  switch (category) {
    case "system":
      return "Ingen systemnotifikationer endnu.";
    case "messages":
      return "Ingen ulæste beskeder.";
    case "directTrades":
      return "Ingen direkte vagtbytter.";
    case "poolTrades":
      return "Ingen åbne vagter i puljen.";
  }
}
