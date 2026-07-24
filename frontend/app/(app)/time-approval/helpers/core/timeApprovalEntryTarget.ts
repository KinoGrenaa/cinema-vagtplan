import type {
  TimeEntry,
} from "../../types";

export type ParsedTimeApprovalEntryTarget = {
  entryId: number | null;
  invalid: boolean;
};

export type TimeApprovalEntryFocusState =
  | "idle"
  | "loading"
  | "found"
  | "missing"
  | "invalid";

export function parseTimeApprovalEntryTarget(
  value: string | null,
): ParsedTimeApprovalEntryTarget {
  if (value === null) {
    return {
      entryId: null,
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
      entryId: null,
      invalid: true,
    };
  }

  const entryId = Number(normalized);

  if (
    !Number.isSafeInteger(entryId)
  ) {
    return {
      entryId: null,
      invalid: true,
    };
  }

  return {
    entryId,
    invalid: false,
  };
}

export function includeTargetedTimeEntry(
  entries: TimeEntry[],
  visibleEntries: TimeEntry[],
  entryId:
    | number
    | null
    | undefined,
) {
  if (!entryId) {
    return visibleEntries;
  }

  const targetEntry =
    entries.find(
      (entry) =>
        entry.id === entryId,
    );

  if (
    !targetEntry ||
    visibleEntries.some(
      (entry) =>
        entry.id === entryId,
    )
  ) {
    return visibleEntries;
  }

  return [
    targetEntry,
    ...visibleEntries,
  ];
}
