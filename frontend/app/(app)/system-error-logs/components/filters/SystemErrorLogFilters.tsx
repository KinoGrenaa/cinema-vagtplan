import type {
  Dispatch,
  SetStateAction,
} from "react";

import {
  severityOptions,
  statusOptions,
} from "../../helpers/core/systemErrorLogConstants";
import {
  getQuickFilterButtonClass,
} from "../../helpers/core/systemErrorLogHelpers";
import type {
  SeverityFilter,
  StatusFilter,
} from "../../types";

type SystemErrorLogFiltersProps = {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  cinemaIdFilter: string;
  correlationIdFilter: string;
  onStatusFilterChange: Dispatch<
    SetStateAction<StatusFilter>
  >;
  onSeverityFilterChange: Dispatch<
    SetStateAction<SeverityFilter>
  >;
  onCinemaIdFilterChange: Dispatch<
    SetStateAction<string>
  >;
  onCorrelationIdFilterChange: Dispatch<
    SetStateAction<string>
  >;
  onShowActive: () => void;
  onShowNew: () => void;
  onShowCritical: () => void;
  onShowAll: () => void;
  onReset: () => void;
};

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

const quickFilterFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900";

export default function SystemErrorLogFilters({
  statusFilter,
  severityFilter,
  cinemaIdFilter,
  correlationIdFilter,
  onStatusFilterChange,
  onSeverityFilterChange,
  onCinemaIdFilterChange,
  onCorrelationIdFilterChange,
  onShowActive,
  onShowNew,
  onShowCritical,
  onShowAll,
  onReset,
}: SystemErrorLogFiltersProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowActive}
          className={`${getQuickFilterButtonClass(
            statusFilter === "ACTIVE" &&
              severityFilter === "",
          )} ${quickFilterFocusClass}`}
        >
          Aktive
        </button>
        <button
          type="button"
          onClick={onShowNew}
          className={`${getQuickFilterButtonClass(
            statusFilter === "NEW" &&
              severityFilter === "",
          )} ${quickFilterFocusClass}`}
        >
          Nye
        </button>
        <button
          type="button"
          onClick={onShowCritical}
          className={`${getQuickFilterButtonClass(
            statusFilter === "ACTIVE" &&
              severityFilter === "CRITICAL",
          )} ${quickFilterFocusClass}`}
        >
          Kritiske
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className={`${getQuickFilterButtonClass(
            statusFilter === "" &&
              severityFilter === "",
          )} ${quickFilterFocusClass}`}
        >
          Alle
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_180px_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(
                event.target.value as StatusFilter,
              )
            }
            className={fieldClass}
          >
            {statusOptions.map((option) => (
              <option
                key={option.label}
                value={option.value}
              >
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
              onSeverityFilterChange(
                event.target.value as SeverityFilter,
              )
            }
            className={fieldClass}
          >
            {severityOptions.map((option) => (
              <option
                key={option.label}
                value={option.value}
              >
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
              onCinemaIdFilterChange(
                event.target.value.replace(/\D/g, ""),
              )
            }
            inputMode="numeric"
            placeholder="Fx 1"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Correlation-id
          </label>
          <input
            value={correlationIdFilter}
            onChange={(event) =>
              onCorrelationIdFilterChange(
                event.target.value,
              )
            }
            placeholder="Indsæt hele eller dele af id"
            className={fieldClass}
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Nulstil filter
          </button>
        </div>
      </div>
    </section>
  );
}
