import { getMonthName } from "../../helpers/shiftPlanningHelpers";

type ShiftPlanningSavedDraftsHeaderProps = {
  loading: boolean;
  month: number;
  year: number;
};

export function ShiftPlanningSavedDraftsHeader({
  month,
  year,
}: ShiftPlanningSavedDraftsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl text-center lg:mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
          Gemte forhåndsvisninger
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
          Forhåndsvisninger for {getMonthName(year, month)}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Åbn en forhåndsvisning for at kontrollere forslaget, gennemgå
          advarsler og oprette vagter i vagtplanen.
        </p>
      </div>
    </div>
  );
}
