export const MAX_DRAFT_SHIFT_DURATION_MINUTES = 24 * 60;

export type DraftShiftTimeValidation = {
  normalizedEndMinute: number | null;
  message: string | null;
};

export function validateDraftShiftMinutes(
  plannedStartMinute: number | null,
  plannedEndMinute: number | null,
): DraftShiftTimeValidation {
  if (plannedStartMinute === null || plannedEndMinute === null) {
    return {
      normalizedEndMinute: null,
      message: null,
    };
  }

  if (
    !Number.isSafeInteger(plannedStartMinute) ||
    !Number.isSafeInteger(plannedEndMinute)
  ) {
    return {
      normalizedEndMinute: null,
      message: 'Vagten har et ugyldigt møde- eller sluttidspunkt.',
    };
  }

  const normalizedEndMinute =
    plannedEndMinute <= plannedStartMinute
      ? plannedEndMinute + 24 * 60
      : plannedEndMinute;
  const durationMinutes = normalizedEndMinute - plannedStartMinute;

  if (
    durationMinutes <= 0 ||
    durationMinutes >= MAX_DRAFT_SHIFT_DURATION_MINUTES
  ) {
    return {
      normalizedEndMinute: null,
      message: 'Vagten varer 24 timer eller mere og skal beregnes igen.',
    };
  }

  return {
    normalizedEndMinute,
    message: null,
  };
}
