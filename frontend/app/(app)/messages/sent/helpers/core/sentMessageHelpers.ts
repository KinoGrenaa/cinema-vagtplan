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

export function getReadReceiptSummary(
  message: Message,
) {
  const receipt =
    message.readReceipt;

  if (!receipt) {
    return null;
  }

  if (
    receipt.totalRecipients ===
    0
  ) {
    return message.isBroadcast
      ? "Ingen aktuelle modtagere"
      : "Modtageren er ikke længere aktiv";
  }

  if (message.receiver) {
    if (
      receipt.readCount === 0
    ) {
      return "Ikke læst endnu";
    }

    const reader =
      receipt.readBy[0];

    return reader
      ? `Læst af ${getUserName(reader)}`
      : "Læst";
  }

  if (receipt.allRead) {
    return "Læst af alle";
  }

  if (receipt.readCount === 0) {
    return "Ingen har læst endnu";
  }

  return `Læst af ${receipt.readCount} af ${receipt.totalRecipients}`;
}

export function getReadReceiptBadgeClass(
  message: Message,
) {
  const receipt =
    message.readReceipt;

  if (
    !receipt ||
    receipt.totalRecipients ===
      0
  ) {
    return "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }

  if (receipt.allRead) {
    return "border-green-200 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300";
  }

  if (receipt.readCount > 0) {
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
}


export function getSentRecipientLabel(
  message: Message,
) {
  if (message.isBroadcast) {
    return "Alle";
  }

  const directRecipient =
    getUserName(
      message.receiver,
    );

  if (directRecipient) {
    return directRecipient;
  }

  const count =
    message.readReceipt
      ?.totalRecipients ??
    0;

  return count === 1
    ? "1 medarbejder"
    : `${count} medarbejdere`;
}
