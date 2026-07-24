export type InboxMessageTarget = {
  messageId: number | null;
  invalid: boolean;
};

export type InboxMessageTargetState =
  | "idle"
  | "loading"
  | "found"
  | "missing"
  | "invalid";

export function parseInboxMessageTarget(
  value: string | null,
): InboxMessageTarget {
  if (value === null) {
    return {
      messageId: null,
      invalid: false,
    };
  }

  const normalized = value.trim();

  if (
    !/^[1-9]\d*$/.test(
      normalized,
    )
  ) {
    return {
      messageId: null,
      invalid: true,
    };
  }

  const messageId = Number(
    normalized,
  );

  if (
    !Number.isSafeInteger(
      messageId,
    )
  ) {
    return {
      messageId: null,
      invalid: true,
    };
  }

  return {
    messageId,
    invalid: false,
  };
}
