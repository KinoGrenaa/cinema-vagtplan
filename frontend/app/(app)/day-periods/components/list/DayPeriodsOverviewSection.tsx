import { getDurationText } from "../../helpers/core/dayPeriodFormHelpers";
import {
  formatMinute,
  minuteToTime,
} from "../../helpers/core/dayPeriodHelpers";
import type { DayPeriod } from "../../helpers/core/dayPeriodTypes";

type DayPeriodsOverviewSectionProps = {
  dayPeriods: DayPeriod[];
  loading: boolean;
  showArchived: boolean;
  activeCount: number;
  archivedCount: number;
  onCreate: () => void;
  onShowArchivedChange: (value: boolean) => void;
  onRefresh: () => void;
  onEdit: (dayPeriod: DayPeriod) => void;
  onArchive: (dayPeriod: DayPeriod) => void;
  onReactivate: (dayPeriod: DayPeriod) => void;
};

export default function DayPeriodsOverviewSection({
  dayPeriods,
  loading,
  showArchived,
  activeCount,
  archivedCount,
  onCreate,
  onShowArchivedChange,
  onRefresh,
  onEdit,
  onArchive,
  onReactivate,
}: DayPeriodsOverviewSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            Overblik
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
            Dagsperioder
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? "Henter dagsperioder..."
              : `${dayPeriods.length} dagsperioder vist · ${activeCount} aktive${
                  showArchived ? ` · ${archivedCount} arkiverede` : ""
                }`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:active:bg-blue-300 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Opret dagsperiode
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) =>
                onShowArchivedChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-950 dark:accent-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            />
            Vis arkiverede
          </label>

          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            disabled={loading}
          >
            {loading ? "Opdaterer..." : "Opdater"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        Brug dagsperioder som faste tidsrammer, fx A-vagt weekend eller
        hverdagsaften.
      </div>

      {loading && (
        <div
          aria-live="polite"
          className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300"
        >
          Indlæser dagsperioder...
        </div>
      )}

      {!loading && dayPeriods.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
          Ingen dagsperioder fundet.
        </div>
      )}

      {!loading && dayPeriods.length > 0 && (
        <div className="mt-5 space-y-3">
          {dayPeriods.map((dayPeriod) => (
            <article
              key={dayPeriod.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-950/50 dark:hover:border-gray-700 dark:hover:bg-gray-950"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
                      {dayPeriod.name}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        dayPeriod.isActive
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200"
                          : "border-gray-300 bg-gray-200 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {dayPeriod.isActive ? "Aktiv" : "Arkiveret"}
                    </span>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:min-w-[520px]">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tid
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-950 dark:text-gray-100">
                      {formatMinute(dayPeriod.startMinute)} -{" "}
                      {formatMinute(dayPeriod.endMinute)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Varighed
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-950 dark:text-gray-100">
                      {getDurationText({
                        name: dayPeriod.name,
                        startTime: minuteToTime(dayPeriod.startMinute),
                        endTime: minuteToTime(dayPeriod.endMinute),
                        sortOrder: String(dayPeriod.sortOrder),
                      })}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Sortering
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-950 dark:text-gray-100">
                      {dayPeriod.sortOrder}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {dayPeriod.isActive && (
                    <button
                      type="button"
                      onClick={() => onEdit(dayPeriod)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
                    >
                      Redigér
                    </button>
                  )}

                  {dayPeriod.isActive ? (
                    <button
                      type="button"
                      onClick={() => onArchive(dayPeriod)}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-400 dark:active:bg-red-300 dark:text-white dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
                    >
                      Arkivér
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onReactivate(dayPeriod)}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400 dark:active:bg-emerald-300 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-gray-950"
                    >
                      Genaktivér
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
