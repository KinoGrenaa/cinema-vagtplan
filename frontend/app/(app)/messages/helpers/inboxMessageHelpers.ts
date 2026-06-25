import type { Message, MessageParticipant } from "../../../types/messages";
import { formatDateDK, formatTimeDK } from "@/app/utils/dateTime";

export type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

export type InboxMessage = Message;

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

export function getUserName(user?: MessageParticipant | null) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`;
}

export function getShortBody(body: string) {
  if (!body) return "Ingen beskedtekst.";
  return body.length > 120 ? `${body.slice(0, 120)}...` : body;
}
