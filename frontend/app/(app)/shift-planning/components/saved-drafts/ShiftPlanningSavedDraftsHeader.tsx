import { getMonthName } from "../../helpers/shiftPlanningHelpers";

type ShiftPlanningSavedDraftsHeaderProps = {
  loading: boolean;
  month: number;
  onRefresh: () => Promise<void> | void;
  year: number;
};

export function ShiftPlanningSavedDraftsHeader({
  loading,
  month,
  onRefresh,
  year,
}: ShiftPlanningSavedDraftsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl text-center lg:mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
          Gemte kladder
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
          Seneste kladder for {getMonthName(year, month)}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Kladderne ligger i backend og kan åbnes til kontrol. Publicering er
          låst bag validering, preview, arbejdstype og præcis bekræftelse.
        </p>
      </div>

      <div className="flex shrink-0 justify-center lg:absolute lg:right-5">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-950/50"
          disabled={loading}
        >
          {loading ? "Opdaterer..." : "Opdater kladder"}
        </button>
      </div>
    </div>
  );
}
