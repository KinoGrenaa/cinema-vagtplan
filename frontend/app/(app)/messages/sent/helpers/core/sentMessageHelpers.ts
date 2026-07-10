import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";
import type {
  Message,
  MessageParticipant,
} from "../../../../../types/messages";

export type MessageDateGroup = {
  dateKey: string;
  dateLabel: string;
  messages: Message[];
};

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSentDateKey(message: Message) {
  const date = new Date(message.createdAt);

  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatDateGroupLabel(dateKey: string) {
  if (dateKey === "ukendt") {
    return "Ukendt sendtdato";
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return "Ukendt sendtdato";
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

export function groupMessagesBySentDate(messages: Message[]): MessageDateGroup[] {
  const sortedBySentDate = [...messages].sort(
    (left, right) => getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedBySentDate.reduce<MessageDateGroup[]>((groups, message) => {
    const dateKey = getSentDateKey(message);
    const existingGroup = groups.find((group) => group.dateKey === dateKey);

    if (existingGroup) {
      existingGroup.messages.push(message);
      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateGroupLabel(dateKey),
      messages: [message],
    });

    return groups;
  }, []);
}

export function getUserName(user?: MessageParticipant | null) {
  if (!user) return null;

  return `${user.firstName} ${user.lastName}`;
}

export function getShortBody(body: string) {
  if (!body) return "Ingen beskedtekst.";

  return body.length > 120 ? `${body.slice(0, 120)}...` : body;
}
