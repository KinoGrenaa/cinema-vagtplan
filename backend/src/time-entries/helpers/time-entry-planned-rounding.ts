export type TimeEntryMinuteStep = 1 | 5 | 15;

export function resolveTimeEntryMinuteStep(
  value: number | null | undefined,
): TimeEntryMinuteStep {
  if (
    value === 5 ||
    value === 15
  ) {
    return value;
  }

  return 1;
}

export function roundDateToTimeEntryMinuteStep(
  value: Date,
  minuteStep: number | null | undefined,
) {
  const step =
    resolveTimeEntryMinuteStep(
      minuteStep,
    );

  if (step === 1) {
    return new Date(
      value.getTime(),
    );
  }

  const stepMilliseconds =
    step * 60 * 1000;

  return new Date(
    Math.round(
      value.getTime() /
        stepMilliseconds,
    ) *
      stepMilliseconds,
  );
}
