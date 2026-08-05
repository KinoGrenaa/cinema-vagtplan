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
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
        Trin 3
      </p>
      <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
        Vagtforslag for {getMonthName(year, month)}
      </h2>
      <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-300">
        Som udgangspunkt vises månedens åbne kladde. Åbn den for at kontrollere
        blokeringer og oprette vagterne. Tidligere kladder findes via filtrene.
      </p>
    </div>
  );
}
