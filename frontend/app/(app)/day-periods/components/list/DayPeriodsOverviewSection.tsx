import {
  getDurationText,
} from "../../helpers/core/dayPeriodFormHelpers";
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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Overblik
          </p>
          <h2 className="mt-1 text-2xl font-bold">Dagsperioder</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Opret dagsperiode
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) =>
                onShowArchivedChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Vis arkiverede
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            disabled={loading}
          >
            Opdater
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
        Brug dagsperioder som faste tidsrammer, fx A-vagt weekend eller
        hverdagsaften. De bliver senere brugt som clamp/fallback i
        jobfunktionernes beregning.
      </div>

      {loading && (
        <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Indlæser dagsperioder...
        </div>
      )}

      {!loading && dayPeriods.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Ingen dagsperioder fundet.
        </div>
      )}

      {!loading && dayPeriods.length > 0 && (
        <div className="mt-5 space-y-3">
          {dayPeriods.map((dayPeriod) => (
            <article
              key={dayPeriod.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{dayPeriod.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        dayPeriod.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {dayPeriod.isActive ? "Aktiv" : "Arkiveret"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Beregningsramme for jobfunktioner
                  </p>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:min-w-[520px]">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tid
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {formatMinute(dayPeriod.startMinute)} -{" "}
                      {formatMinute(dayPeriod.endMinute)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Varighed
                    </dt>
                    <dd className="mt-1 font-semibold">
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
                    <dd className="mt-1 font-semibold">
                      {dayPeriod.sortOrder}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {dayPeriod.isActive && (
                    <button
                      type="button"
                      onClick={() => onEdit(dayPeriod)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Redigér
                    </button>
                  )}
                  {dayPeriod.isActive ? (
                    <button
                      type="button"
                      onClick={() => onArchive(dayPeriod)}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Arkivér
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onReactivate(dayPeriod)}
                      className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
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
