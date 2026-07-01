import { formatCreatedAt } from "../helpers/shiftPlanningDraftHelpers";

type ShiftPlanningDraftValidationHeaderProps = {
  checkedAt?: string | null;
};

export function ShiftPlanningDraftValidationHeader({
  checkedAt,
}: ShiftPlanningDraftValidationHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-sm font-bold text-gray-950 dark:text-white">
          Backend-validering
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Kalder backendens sikre valideringsendpoint og kontrollerer kladden
          uden at oprette eller publicere vagter.
        </p>
      </div>

      {checkedAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Senest kontrolleret {formatCreatedAt(checkedAt)}
        </p>
      )}
    </div>
  );
}
