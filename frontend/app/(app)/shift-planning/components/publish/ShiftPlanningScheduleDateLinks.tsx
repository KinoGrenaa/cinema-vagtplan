import {
  DEFAULT_VISIBLE_SCHEDULE_DATE_LINKS,
  getVisibleScheduleDateLinks,
  type ShiftPlanningScheduleDateLink,
} from "../../helpers/shiftPlanningScheduleDateLinks";

type ShiftPlanningScheduleDateLinksProps = {
  dates: ShiftPlanningScheduleDateLink[];
  maxVisibleDates?: number;
};

export function ShiftPlanningScheduleDateLinks({
  dates,
  maxVisibleDates = DEFAULT_VISIBLE_SCHEDULE_DATE_LINKS,
}: ShiftPlanningScheduleDateLinksProps) {
  if (dates.length === 0) return null;

  const { hiddenDateCount, visibleDates } = getVisibleScheduleDateLinks(
    dates,
    maxVisibleDates,
  );

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
        Berørte datoer i vagtplanen
      </p>
      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
        Klik på en dato for at åbne den direkte i vagtplanen.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleDates.map((date) => (
          <a
            key={date.dateKey}
            href={`/schedule?date=${date.dateKey}`}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
          >
            {date.label}
          </a>
        ))}
      </div>

      {hiddenDateCount > 0 && (
        <p className="mt-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          {hiddenDateCount} flere berørte datoer er skjult her. Brug vagtplanen
          til at gennemgå resten, hvis måneden spænder over mange datoer.
        </p>
      )}
    </div>
  );
}
