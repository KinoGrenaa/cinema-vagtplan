export type ShiftTradeTarget = {
  tradeId: number | null;
  invalid: boolean;
};

export type ShiftTradeTargetState =
  | "idle"
  | "loading"
  | "found"
  | "missing"
  | "invalid";

export function parseShiftTradeTarget(
  value: string | null,
): ShiftTradeTarget {
  if (value === null) {
    return {
      tradeId: null,
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
      tradeId: null,
      invalid: true,
    };
  }

  const tradeId =
    Number(normalized);

  if (
    !Number.isSafeInteger(
      tradeId,
    )
  ) {
    return {
      tradeId: null,
      invalid: true,
    };
  }

  return {
    tradeId,
    invalid: false,
  };
}
