export type ShiftPlanningScheduleDateLink = {
  dateKey: string;
  label: string;
};

export const DEFAULT_VISIBLE_SCHEDULE_DATE_LINKS = 8;

type VisibleScheduleDateLinksResult = {
  hiddenDateCount: number;
  visibleDates: ShiftPlanningScheduleDateLink[];
};

export function getVisibleScheduleDateLinks(
  dates: ShiftPlanningScheduleDateLink[],
  maxVisibleDates = DEFAULT_VISIBLE_SCHEDULE_DATE_LINKS,
): VisibleScheduleDateLinksResult {
  const visibleCount = Math.max(1, Math.floor(maxVisibleDates));
  const visibleDates = dates.slice(0, visibleCount);

  return {
    hiddenDateCount: Math.max(0, dates.length - visibleDates.length),
    visibleDates,
  };
}
