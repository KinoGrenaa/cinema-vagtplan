import {
  getDayStaffingGaps,
  summarizeStaffingGaps,
  type ScheduleTemplateStaffingTemplate,
} from "../../helpers/page/scheduleTemplateStaffingGaps";

type WeekdayOption = {
  value: number;
  shortLabel: string;
};

type ScheduleTemplateWeekdayTabsProps = {
  template:
    ScheduleTemplateStaffingTemplate;
  weekdays: WeekdayOption[];
  selectedWeekday: number;
  onSelectWeekday: (
    weekday: number,
  ) => void;
};

function formatOpenShiftText(
  openShiftCount: number,
) {
  if (openShiftCount === 1) {
    return "1 åben vagt";
  }

  return `${openShiftCount} åbne vagter`;
}

function getTemplateDay(
  template:
    ScheduleTemplateStaffingTemplate,
  weekday: number,
) {
  return (
    template.days?.find(
      (day) =>
        day.weekday === weekday,
    ) ?? null
  );
}

export default function ScheduleTemplateWeekdayTabs({
  template,
  weekdays,
  selectedWeekday,
  onSelectWeekday,
}: ScheduleTemplateWeekdayTabsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {weekdays.map((weekday) => {
        const day = getTemplateDay(
          template,
          weekday.value,
        );
        const active =
          selectedWeekday ===
          weekday.value;
        const dayGapSummary =
          summarizeStaffingGaps(
            getDayStaffingGaps(day),
          );

        return (
          <button
            key={weekday.value}
            type="button"
            onClick={() =>
              onSelectWeekday(
                weekday.value,
              )
            }
            aria-pressed={active}
            className={`rounded-2xl border p-3 text-left text-sm text-gray-900 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:text-gray-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
              active
                ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/40"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900"
            }`}
          >
            <p className="font-black uppercase text-gray-950 dark:text-white">
              {weekday.shortLabel}
            </p>

            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
              {day?.isActive
                ? "Aktiv"
                : "Ikke sat"}
            </p>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              {day?.jobFunctions
                ?.length ?? 0}{" "}
              jobfunktioner
            </p>

            {dayGapSummary.missingShiftCount >
              0 && (
              <p className="mt-2 rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-center text-[11px] font-black text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
                {formatOpenShiftText(
                  dayGapSummary.missingShiftCount,
                )}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
