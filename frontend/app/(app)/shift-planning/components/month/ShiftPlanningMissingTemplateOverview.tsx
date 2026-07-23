import type {
  MonthPlanDay,
} from "../../helpers/shiftPlanningTypes";
import {
  getDateWeekParityLabel,
  getMonthPlanDayDateKey,
  getWeekdayName,
} from "../../helpers/shiftPlanningHelpers";

type ShiftPlanningMissingTemplateOverviewProps = {
  days: MonthPlanDay[];
  loading: boolean;
  onOpenDay: (
    day: MonthPlanDay,
  ) => void;
};

const MAX_VISIBLE_DAYS = 8;

function formatCompactDate(
  dateKey: string,
) {
  const [, month, day] =
    dateKey.split("-");

  return `${day}.${month}`;
}

export default function ShiftPlanningMissingTemplateOverview({
  days,
  loading,
  onOpenDay,
}: ShiftPlanningMissingTemplateOverviewProps) {
  if (loading) {
    return null;
  }

  const validDays = days
    .map((day) => ({
      day,
      dateKey:
        getMonthPlanDayDateKey(day),
    }))
    .filter(
      (
        item,
      ): item is {
        day: MonthPlanDay;
        dateKey: string;
      } => Boolean(item.dateKey),
    );

  if (validDays.length === 0) {
    return (
      <section className="rounded-3xl border border-green-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-green-900/70 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
              Mangler planlægning
            </p>

            <h2 className="mt-1 text-lg font-bold text-gray-950 dark:text-white">
              Alle aktive dage har en
              vagtsskabelon
            </h2>
          </div>

          <span className="w-fit rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-900 dark:border-green-800 dark:bg-green-950/50 dark:text-green-100">
            Alle aktive dage har
            vagtsskabelon
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Næste trin er at forberede
          og kontrollere forslaget,
          før der oprettes vagter.
        </p>
      </section>
    );
  }

  const visibleDays =
    validDays.slice(
      0,
      MAX_VISIBLE_DAYS,
    );
  const hiddenCount = Math.max(
    0,
    validDays.length -
      visibleDays.length,
  );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Mangler planlægning
            </p>

            <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
              {validDays.length} mangler
            </span>
          </div>

          <h2 className="mt-1 text-lg font-bold text-gray-950 dark:text-white">
            Aktive dage der mangler
            vagtsskabelon
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Klik på en dato for hurtigt
            at vælge skabelon.
            Kalenderen nedenfor viser
            hele måneden.
          </p>
        </div>

        {hiddenCount > 0 && (
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 lg:max-w-48 lg:text-right">
            Viser de første{" "}
            {visibleDays.length}.{" "}
            {hiddenCount} flere ses i
            kalenderen.
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visibleDays.map(
          ({ day, dateKey }) => (
            <button
              key={dateKey}
              type="button"
              onClick={() =>
                onOpenDay(day)
              }
              className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-gray-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100 dark:hover:border-amber-700 dark:hover:bg-amber-950/30 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-950"
            >
              <span className="block truncate text-sm font-bold text-gray-950 dark:text-white">
                {getWeekdayName(
                  dateKey,
                  "short",
                )}{" "}
                {formatCompactDate(
                  dateKey,
                )}
              </span>

              <span className="mt-0.5 block truncate text-xs font-semibold text-amber-700 dark:text-amber-300">
                {getDateWeekParityLabel(
                  dateKey,
                )}
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}
