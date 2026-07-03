type ShiftPlanningDraftValidationStateMessageProps = {
  errorMessage: string | null;
  hasResult: boolean;
};

export function ShiftPlanningDraftValidationStateMessage({
  errorMessage,
  hasResult,
}: ShiftPlanningDraftValidationStateMessageProps) {
  if (errorMessage) {
    return (
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
        {errorMessage}
      </div>
    );
  }

  if (!hasResult) {
    return (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Kontrollen er ikke kørt endnu. Kør kontrollen, før du henter oprettelsesoverblik eller opretter vagter.
      </div>
    );
  }

  return null;
}
