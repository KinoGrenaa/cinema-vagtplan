"use client";

import { SlidersHorizontal } from "lucide-react";

type LeaveApprovalHeaderProps = {
  statusFilterSummary: string;
  dateFilterSummary: string;
  pendingCount: number;
  activeFilterCount: number;
  onShowOnlyPending: () => void;
  onOpenFilterModal: () => void;
};

export default function LeaveApprovalHeader({
  statusFilterSummary,
  dateFilterSummary,
  pendingCount,
  activeFilterCount,
  onShowOnlyPending,
  onOpenFilterModal,
}: LeaveApprovalHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fraværsgodkendelse</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Gennemgå og håndter medarbejdernes fraværsansøgninger.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              Viser: {statusFilterSummary}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {dateFilterSummary}
            </span>

            {pendingCount > 0 && (
              <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
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
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
            >
              Vis afventende
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFilterModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950"
          >
            <SlidersHorizontal size={18} />
            Filter
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
