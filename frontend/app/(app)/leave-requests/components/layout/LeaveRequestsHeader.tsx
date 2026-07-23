import { SlidersHorizontal } from "lucide-react";

type LeaveRequestsHeaderProps = {
  activeFilterCount: number;
  isMasterWithoutOwnCinema: boolean;
  onOpenRequestModal: () => void;
  onOpenFilterModal: () => void;
};

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function LeaveRequestsHeader({
  activeFilterCount,
  isMasterWithoutOwnCinema,
  onOpenRequestModal,
  onOpenFilterModal,
}: LeaveRequestsHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Fraværsansøgninger
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Ansøg om fravær og se status på dine ansøgninger.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isMasterWithoutOwnCinema}
            onClick={onOpenRequestModal}
            className={`rounded-xl bg-gray-950 px-4 py-2 font-semibold text-white transition hover:bg-gray-800 focus-visible:ring-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-100 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus-visible:ring-gray-300 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 ${focusClass}`}
          >
            Ansøg om fravær
          </button>
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-900 transition hover:bg-blue-100 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950 dark:focus-visible:ring-blue-400 ${focusClass}`}
          >
            <SlidersHorizontal size={18} />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
