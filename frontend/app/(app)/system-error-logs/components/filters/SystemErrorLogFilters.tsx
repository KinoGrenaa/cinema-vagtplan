import type { Dispatch, SetStateAction } from "react";

import {
  severityOptions,
  statusOptions,
} from "../../helpers/core/systemErrorLogConstants";
import { getQuickFilterButtonClass } from "../../helpers/core/systemErrorLogHelpers";
import type { SeverityFilter, StatusFilter } from "../../types";

type SystemErrorLogFiltersProps = {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  cinemaIdFilter: string;
  onStatusFilterChange: Dispatch<SetStateAction<StatusFilter>>;
  onSeverityFilterChange: Dispatch<SetStateAction<SeverityFilter>>;
  onCinemaIdFilterChange: Dispatch<SetStateAction<string>>;
  onShowActive: () => void;
  onShowNew: () => void;
  onShowCritical: () => void;
  onShowAll: () => void;
  onReset: () => void;
};

export default function SystemErrorLogFilters({
  statusFilter,
  severityFilter,
  cinemaIdFilter,
  onStatusFilterChange,
  onSeverityFilterChange,
  onCinemaIdFilterChange,
  onShowActive,
  onShowNew,
  onShowCritical,
  onShowAll,
  onReset,
}: SystemErrorLogFiltersProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowActive}
          className={getQuickFilterButtonClass(
            statusFilter === "ACTIVE" && severityFilter === "",
          )}
        >
          Aktive
        </button>
        <button
          type="button"
          onClick={onShowNew}
          className={getQuickFilterButtonClass(
            statusFilter === "NEW" && severityFilter === "",
          )}
        >
          Nye
        </button>
        <button
          type="button"
          onClick={onShowCritical}
          className={getQuickFilterButtonClass(
            statusFilter === "ACTIVE" && severityFilter === "CRITICAL",
          )}
        >
          Kritiske
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className={getQuickFilterButtonClass(
            statusFilter === "" && severityFilter === "",
          )}
        >
          Alle
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_220px_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as StatusFilter)
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Niveau
          </label>
          <select
            value={severityFilter}
            onChange={(event) =>
              onSeverityFilterChange(event.target.value as SeverityFilter)
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          >
            {severityOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Biograf-ID
          </label>
          <input
            value={cinemaIdFilter}
            onChange={(event) =>
              onCinemaIdFilterChange(event.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            placeholder="Fx 1"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Nulstil filter
          </button>
        </div>
      </div>
    </section>
  );
}
