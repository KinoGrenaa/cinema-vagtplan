import type {
  Notification,
} from "@/app/types/notifications";

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) > 0
  );
}

export function normalizeInternalNotificationUrl(
  value:
    | string
    | null
    | undefined,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(
      normalized,
    )
  ) {
    return null;
  }

  try {
    const parsed = new URL(
      normalized,
      "https://vagtplan.invalid",
    );

    if (
      parsed.origin !==
        "https://vagtplan.invalid" ||
      !parsed.pathname.startsWith(
        "/",
      )
    ) {
      return null;
    }

    return (
      parsed.pathname +
      parsed.search +
      parsed.hash
    );
  } catch {
    return null;
  }
}

export function getNotificationDestination(
  notification: Notification,
) {
  const explicitDestination =
    normalizeInternalNotificationUrl(
      notification.linkUrl,
    );

  if (explicitDestination) {
    return explicitDestination;
  }

  if (
    isPositiveInteger(
      notification.relatedMessageId,
    )
  ) {
    return (
      "/messages?messageId=" +
      notification.relatedMessageId
    );
  }

  if (
    isPositiveInteger(
      notification.relatedShiftTradeId,
    )
  ) {
    return (
      "/shift-trades?tradeId=" +
      notification.relatedShiftTradeId
    );
  }

  if (
    notification.type ===
    "NEW_MESSAGE"
  ) {
    return "/messages";
  }

  if (
    notification.type ===
      "SHIFT_TRADE" ||
    notification.type ===
      "SHIFT_ACCEPTED" ||
    notification.type ===
      "SHIFT_REJECTED"
  ) {
    return "/shift-trades";
  }

  return null;
}
