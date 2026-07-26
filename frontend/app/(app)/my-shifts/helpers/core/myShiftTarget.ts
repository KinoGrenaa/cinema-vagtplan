export type MyShiftTarget = {
  shiftId: number | null;
  invalid: boolean;
};

export type MyShiftTargetState =
  | "idle"
  | "loading"
  | "found"
  | "missing"
  | "invalid";

export function parseMyShiftTarget(
  value: string | null,
): MyShiftTarget {
  if (value === null) {
    return {
      shiftId: null,
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
      shiftId: null,
      invalid: true,
    };
  }

  const shiftId =
    Number(normalized);

  if (
    !Number.isSafeInteger(
      shiftId,
    )
  ) {
    return {
      shiftId: null,
      invalid: true,
    };
  }

  return {
    shiftId,
    invalid: false,
  };
}
