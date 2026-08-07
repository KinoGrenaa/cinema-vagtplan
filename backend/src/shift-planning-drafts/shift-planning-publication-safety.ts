import { getCopenhagenDateKey } from './shift-planning-time-zone';

export const PAST_DRAFT_ITEM_BLOCK_REASON =
  'Datoen er overstået og kan ikke længere oprettes fra et forslag.';
export const EXISTING_SHIFT_BLOCK_REASON =
  'Der findes allerede en vagt med samme jobfunktion og tidspunkt i vagtplanen.';

export type PublicationSafetyDraftItem = {
  dateKey: string;
  jobFunctionId: number | null;
  startTime: Date | null;
  endTime: Date | null;
  canBecomeShift: boolean;
  blockReasons: string[];
};

export type PublicationSafetyExistingShift = {
  id: number | bigint;
  jobFunctionId: number | bigint | null;
  startTime: Date | string;
  endTime: Date | string;
};

function toValidDate(value: Date | string | null) {
  if (value === null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPositiveInteger(value: number | bigint | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function buildShiftIdentity(
  jobFunctionId: number | bigint | null,
  startTimeValue: Date | string | null,
  endTimeValue: Date | string | null,
) {
  const normalizedJobFunctionId = toPositiveInteger(jobFunctionId);
  const startTime = toValidDate(startTimeValue);
  const endTime = toValidDate(endTimeValue);

  if (normalizedJobFunctionId === null || !startTime || !endTime) {
    return null;
  }

  return [
    normalizedJobFunctionId,
    startTime.getTime(),
    endTime.getTime(),
  ].join('|');
}

function addBlockReason<T extends PublicationSafetyDraftItem>(
  item: T,
  reason: string,
) {
  item.blockReasons = Array.from(new Set([...item.blockReasons, reason]));
  item.canBecomeShift = false;
}

export function getPublicationSafetyInstantRange(
  items: PublicationSafetyDraftItem[],
) {
  const instants = items
    .filter((item) => item.canBecomeShift)
    .flatMap((item) => [item.startTime, item.endTime])
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime())
    .filter(Number.isFinite);

  if (instants.length === 0) {
    return null;
  }

  return {
    start: new Date(Math.min(...instants)),
    end: new Date(Math.max(...instants)),
  };
}

export function applyPublicationSafetyBlocks<
  T extends PublicationSafetyDraftItem,
>(
  items: T[],
  existingShifts: PublicationSafetyExistingShift[],
  now = new Date(),
) {
  const todayDateKey = getCopenhagenDateKey(now);
  const remainingExistingShiftCounts = new Map<string, number>();

  for (const shift of existingShifts) {
    const identity = buildShiftIdentity(
      shift.jobFunctionId,
      shift.startTime,
      shift.endTime,
    );

    if (!identity) {
      continue;
    }

    remainingExistingShiftCounts.set(
      identity,
      (remainingExistingShiftCounts.get(identity) ?? 0) + 1,
    );
  }

  for (const item of items) {
    if (!item.canBecomeShift) {
      continue;
    }

    if (item.dateKey < todayDateKey) {
      addBlockReason(item, PAST_DRAFT_ITEM_BLOCK_REASON);
    }

    const identity = buildShiftIdentity(
      item.jobFunctionId,
      item.startTime,
      item.endTime,
    );
    const remainingMatchCount = identity
      ? remainingExistingShiftCounts.get(identity) ?? 0
      : 0;

    if (identity && remainingMatchCount > 0) {
      remainingExistingShiftCounts.set(identity, remainingMatchCount - 1);
      addBlockReason(item, EXISTING_SHIFT_BLOCK_REASON);
    }
  }

  return items;
}
