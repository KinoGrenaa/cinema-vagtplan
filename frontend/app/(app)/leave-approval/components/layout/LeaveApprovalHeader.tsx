"use client";

import {
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

type LeaveApprovalHeaderProps = {
  statusFilterSummary: string;
  dateFilterSummary: string;
  pendingCount: number;
  activeFilterCount: number;
  hasCustomFilters: boolean;
  onShowOnlyPending: () => void;
  onOpenFilterModal: () => void;
  onResetFilter: () => void;
};

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function LeaveApprovalHeader({
  statusFilterSummary,
  dateFilterSummary,
  pendingCount,
  activeFilterCount,
  hasCustomFilters,
  onShowOnlyPending,
  onOpenFilterModal,
  onResetFilter,
}: LeaveApprovalHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Fraværsgodkendelse
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Gennemgå og håndter medarbejdernes fraværsansøgninger.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              Viser:{" "}
              {statusFilterSummary}
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {dateFilterSummary}
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
                {pendingCount} kræver behandling
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onShowOnlyPending}
              className={`inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 ${focusClass}`}
            >
              Vis afventende
            </button>
          )}

          {hasCustomFilters && (
            <button
              type="button"
              onClick={onResetFilter}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 ${focusClass}`}
            >
              <RotateCcw size={18} />
              Nulstil filter
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-900 transition hover:bg-blue-100 active:bg-blue-200 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950 dark:active:bg-blue-900 dark:focus-visible:ring-blue-400 ${focusClass}`}
          >
            <SlidersHorizontal size={18} />
            Filter
            {activeFilterCount > 0
              ? ` (${activeFilterCount})`
              : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
