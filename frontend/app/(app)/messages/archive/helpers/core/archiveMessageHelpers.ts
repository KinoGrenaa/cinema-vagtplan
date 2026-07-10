import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

import type {
  ArchiveSection,
  Message,
  MessageDateGroup,
  User,
} from "./archiveMessageTypes";

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

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

function getTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

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

export function getArchivedDateLabel(message: Message) {
  if (!message.archivedAt) {
    return "Ukendt arkiveringstidspunkt";
  }

  return formatDateTime(message.archivedAt);
}

export function groupMessagesBySentDate(
  messages: Message[],
): MessageDateGroup[] {
  const sortedMessages = [...messages].sort(
    (left, right) =>
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedMessages.reduce<MessageDateGroup[]>((groups, message) => {
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

export function getMessageArchiveSection(
  message: Message,
  currentUserId?: number,
): ArchiveSection {
  return currentUserId && message.sender?.id === currentUserId
    ? "sent"
    : "received";
}

export function getRestoreTargetLabel(section: ArchiveSection) {
  return section === "sent" ? "sendte beskeder" : "indbakken";
}

export function getArchiveSectionLabel(section: ArchiveSection) {
  return section === "sent" ? "Sendte" : "Modtagne";
}

export function getUserName(messageUser?: User | null) {
  if (!messageUser) return null;
  return `${messageUser.firstName} ${messageUser.lastName}`;
}

export function getShortBody(body: string) {
  if (!body) return "Ingen beskedtekst.";
  return body.length > 120 ? `${body.slice(0, 120)}...` : body;
}
