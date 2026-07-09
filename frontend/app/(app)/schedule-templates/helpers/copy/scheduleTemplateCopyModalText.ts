import type { TemplateCopyDaySummary } from "./scheduleTemplateCopy";

const weekdayLabels = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 7, label: "Søndag" },
];

export function formatTemplateCopyWeekday(value: number) {
  return (
    weekdayLabels.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

export function formatTemplateCopyOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

export function formatTemplateCopyShiftText(shiftCount: number) {
  if (shiftCount === 1) return "1 vagt";
  return `${shiftCount} vagter`;
}

export function formatTemplateCopyFixedStaffingText(assignedShiftCount: number) {
  if (assignedShiftCount === 1) return "1 fast medarbejder";
  return `${assignedShiftCount} faste medarbejdere`;
}

export function formatTemplateCopyJobFunctionText(jobFunctionCount: number) {
  if (jobFunctionCount === 1) return "1 jobfunktion";
  return `${jobFunctionCount} jobfunktioner`;
}

export function formatTemplateCopyWeekdayCountText(dayCount: number) {
  if (dayCount === 1) return "1 ugedag";
  return `${dayCount} ugedage`;
}

export function formatTemplateCopyDayDetail(
  summary: TemplateCopyDaySummary,
  includeAssignments: boolean,
) {
  if (summary.shiftCount === 0) {
    return "Ingen vagter";
  }

  const copiedOpenShiftCount = includeAssignments
    ? summary.openShiftCount
    : summary.shiftCount;
  const parts = [
    formatTemplateCopyShiftText(summary.shiftCount),
    formatTemplateCopyJobFunctionText(summary.jobFunctionCount),
  ];

  if (includeAssignments) {
    parts.push(formatTemplateCopyFixedStaffingText(summary.assignedShiftCount));
  } else {
    parts.push("Faste medarbejdere kopieres ikke");
  }

  if (copiedOpenShiftCount > 0) {
    parts.push(formatTemplateCopyOpenShiftText(copiedOpenShiftCount));
  }

  return parts.join(" · ");
}

export function getTemplateCopySubmitButtonText({
  copying,
  nameIsBlank,
  nameExists,
  hasNoDays,
}: {
  copying: boolean;
  nameIsBlank: boolean;
  nameExists: boolean;
  hasNoDays: boolean;
}) {
  if (copying) return "Kopierer...";
  if (nameIsBlank) return "Indtast navn";
  if (nameExists) return "Vælg et andet navn";
  if (hasNoDays) return "Vælg mindst én ugedag";
  return "Opret kopi";
}
