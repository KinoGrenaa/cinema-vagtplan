import { SlidersHorizontal } from "lucide-react";

type LeaveRequestsHeaderProps = {
  activeFilterCount: number;
  isMasterWithoutOwnCinema: boolean;
  onOpenRequestModal: () => void;
  onOpenFilterModal: () => void;
};

export default function LeaveRequestsHeader({
  activeFilterCount,
  isMasterWithoutOwnCinema,
  onOpenRequestModal,
  onOpenFilterModal,
}: LeaveRequestsHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fraværsansøgninger</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Ansøg om fravær og se status på dine ansøgninger.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isMasterWithoutOwnCinema}
            onClick={onOpenRequestModal}
            className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Ansøg om fravær
          </button>

          <button
            type="button"
            onClick={onOpenFilterModal}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
          >
            <SlidersHorizontal size={18} />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
