import type { ScheduleTemplateStaffingDay } from "../page/scheduleTemplateStaffingGaps";
import { summarizeTemplateDayStaffing } from "../page/scheduleTemplateStaffingGaps";

export type CopyDayWeekdayOption = {
  value: number;
  shortLabel: string;
  label: string;
};

export type CopyDayTargetOption = {
  weekday: CopyDayWeekdayOption;
  day: ScheduleTemplateStaffingDay | null;
};

export const copyDayWeekdayLabels: CopyDayWeekdayOption[] = [
  { value: 1, shortLabel: "Man", label: "Mandag" },
  { value: 2, shortLabel: "Tir", label: "Tirsdag" },
  { value: 3, shortLabel: "Ons", label: "Onsdag" },
  { value: 4, shortLabel: "Tor", label: "Torsdag" },
  { value: 5, shortLabel: "Fre", label: "Fredag" },
  { value: 6, shortLabel: "Lør", label: "Lørdag" },
  { value: 7, shortLabel: "Søn", label: "Søndag" },
];

export function formatCopyDayWeekday(value: number) {
  return (
    copyDayWeekdayLabels.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

export function formatCopyDayOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

export function formatCopyDayShiftText(shiftCount: number) {
  if (shiftCount === 1) return "1 vagt";
  return `${shiftCount} vagter`;
}

export function formatCopyDayFixedStaffingText(assignedShiftCount: number) {
  if (assignedShiftCount === 1) return "1 fast medarbejder";
  return `${assignedShiftCount} faste medarbejdere`;
}

export function formatCopyDayJobFunctionText(jobFunctionCount: number) {
  if (jobFunctionCount === 1) return "1 jobfunktion";
  return `${jobFunctionCount} jobfunktioner`;
}

export function formatCopyDayTargetButtonText(targetCount: number) {
  if (targetCount === 0) return "Kopiér til valgte dage";
  if (targetCount === 1) return "Kopiér til 1 valgt dag";
  return `Kopiér til ${targetCount} valgte dage`;
}

export function formatCopyDayTargetStatus(
  day: ScheduleTemplateStaffingDay | null,
) {
  const summary = summarizeTemplateDayStaffing(day);

  if (summary.shiftCount === 0) {
    return "Tom modtagerdag";
  }

  const openShiftLabel = summary.openShiftCount > 0
    ? ` · ${formatCopyDayOpenShiftText(summary.openShiftCount)}`
    : "";

  return `${formatCopyDayShiftText(summary.shiftCount)} erstattes${openShiftLabel}`;
}
