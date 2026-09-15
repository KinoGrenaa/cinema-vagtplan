export type StaffingRequestTarget = {
  requestId: number | null;
  invalid: boolean;
};

export type StaffingRequestTargetState =
  | "idle"
  | "loading"
  | "found"
  | "missing"
  | "invalid";

export function parseStaffingRequestTarget(
  value: string | null,
): StaffingRequestTarget {
  if (value === null) {
    return {
      requestId: null,
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
      requestId: null,
      invalid: true,
    };
  }

  const requestId =
    Number(normalized);

  if (
    !Number.isSafeInteger(
      requestId,
    )
  ) {
    return {
      requestId: null,
      invalid: true,
    };
  }

  return {
    requestId,
    invalid: false,
  };
}
