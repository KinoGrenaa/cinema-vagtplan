import {
  summarizeStaffingGaps,
  type ScheduleTemplateStaffingGap,
  type ScheduleTemplateStaffingGapSummary,
} from "../../helpers/page/scheduleTemplateStaffingGaps";

type WeekdayOption = {
  value: number;
  label: string;
};

type ScheduleTemplateOpenShiftSummaryProps = {
  gapSummary: ScheduleTemplateStaffingGapSummary;
  gaps: ScheduleTemplateStaffingGap[];
  weekdays: WeekdayOption[];
};

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

export default function ScheduleTemplateOpenShiftSummary({
  gapSummary,
  gaps,
  weekdays,
}: ScheduleTemplateOpenShiftSummaryProps) {
  if (gapSummary.missingShiftCount === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-black">
            {formatOpenShiftText(gapSummary.missingShiftCount)} i skabelonen
          </p>
          <p className="mt-1 text-sm">
            De oprettes uden fast medarbejder i /shift-planning, så
            medarbejderne kan ønske dem som åbne vagter.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {weekdays.map((weekday) => {
          const gapsForDay = gaps.filter(
            (gap) => gap.weekday === weekday.value,
          );
          const daySummary = summarizeStaffingGaps(gapsForDay);
          if (daySummary.missingShiftCount === 0) return null;

          return (
            <div
              key={weekday.value}
              className="rounded-2xl bg-white/70 p-3 text-sm dark:bg-gray-950/40"
            >
              <p className="font-black">
                {weekday.label}: {formatOpenShiftText(daySummary.missingShiftCount)}
              </p>
              <p className="mt-1 text-xs">
                {gapsForDay
                  .map((gap) => `${gap.jobFunctionName} (${gap.missingCount})`)
                  .join(", ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
