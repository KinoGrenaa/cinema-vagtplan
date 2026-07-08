import { useMemo } from "react";

import {
  summarizeTemplateCopyDays,
  summarizeTemplateStaffing,
} from "../helpers/scheduleTemplateCopy";
import { scheduleTemplateNameExists } from "../helpers/scheduleTemplateCopyNames";
import {
  getDayStaffingGaps,
  getTemplateStaffingGaps,
  getTemplateStaffingGapSummary,
  summarizeStaffingGaps,
  summarizeTemplateDayStaffing,
} from "../helpers/scheduleTemplateStaffingGaps";
import {
  getTemplateDay,
  weekdayOptions,
} from "../helpers/scheduleTemplatePageHelpers";
import type { ScheduleTemplate } from "../helpers/scheduleTemplatePageTypes";

type UseScheduleTemplateDerivedStateArgs = {
  templates: ScheduleTemplate[];
  selectedTemplateId: number | null;
  selectedWeekday: number;
  copyTemplateName: string;
  copyTemplateIncludeAssignments: boolean;
  copyTemplateIncludeInactiveDays: boolean;
};

export function useScheduleTemplateDerivedState({
  templates,
  selectedTemplateId,
  selectedWeekday,
  copyTemplateName,
  copyTemplateIncludeAssignments,
  copyTemplateIncludeInactiveDays,
}: UseScheduleTemplateDerivedStateArgs) {
  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId, templates]);

  const selectedDay = useMemo(() => {
    return getTemplateDay(selectedTemplate, selectedWeekday);
  }, [selectedTemplate, selectedWeekday]);

  const selectedTemplateGaps = useMemo(() => {
    return getTemplateStaffingGaps(selectedTemplate);
  }, [selectedTemplate]);

  const selectedTemplateGapSummary = useMemo(() => {
    return summarizeStaffingGaps(selectedTemplateGaps);
  }, [selectedTemplateGaps]);

  const selectedDayGaps = useMemo(() => {
    return getDayStaffingGaps(selectedDay);
  }, [selectedDay]);

  const selectedDayGapSummary = useMemo(() => {
    return summarizeStaffingGaps(selectedDayGaps);
  }, [selectedDayGaps]);

  const selectedDayStaffingSummary = useMemo(() => {
    return summarizeTemplateDayStaffing(selectedDay);
  }, [selectedDay]);

  const copyDayTargetOptions = useMemo(() => {
    return weekdayOptions
      .filter((weekday) => weekday.value !== selectedWeekday)
      .map((weekday) => ({
        weekday,
        day: getTemplateDay(selectedTemplate, weekday.value),
      }));
  }, [selectedTemplate, selectedWeekday]);

  const selectedTemplateInactiveDayCount = useMemo(() => {
    return (selectedTemplate?.days ?? []).filter((day) => !day.isActive).length;
  }, [selectedTemplate]);

  const selectedTemplateStaffingSummary = useMemo(() => {
    return summarizeTemplateStaffing(selectedTemplate, {
      includeInactiveDays: copyTemplateIncludeInactiveDays,
    });
  }, [copyTemplateIncludeInactiveDays, selectedTemplate]);

  const copiedTemplateOpenShiftCount = copyTemplateIncludeAssignments
    ? selectedTemplateStaffingSummary.openShiftCount
    : selectedTemplateStaffingSummary.shiftCount;

  const selectedTemplateCopyDaySummaries = useMemo(() => {
    return summarizeTemplateCopyDays(selectedTemplate, {
      includeInactiveDays: copyTemplateIncludeInactiveDays,
    });
  }, [copyTemplateIncludeInactiveDays, selectedTemplate]);

  const copyTemplateNameExists = useMemo(() => {
    return scheduleTemplateNameExists({
      templates,
      name: copyTemplateName,
      ignoredTemplateId: selectedTemplate?.id,
    });
  }, [copyTemplateName, selectedTemplate?.id, templates]);

  const copyTemplateNameIsBlank = copyTemplateName.trim().length === 0;
  const copyTemplateHasNoDays = selectedTemplateStaffingSummary.dayCount === 0;

  const activeTemplates = templates.filter((template) => template.isActive).length;
  const archivedTemplates = templates.length - activeTemplates;
  const totalStaffingGapSummary = templates.reduce(
    (summary, template) => {
      const templateSummary = getTemplateStaffingGapSummary(template);

      return {
        jobFunctionCount:
          summary.jobFunctionCount + templateSummary.jobFunctionCount,
        missingShiftCount:
          summary.missingShiftCount + templateSummary.missingShiftCount,
      };
    },
    { jobFunctionCount: 0, missingShiftCount: 0 },
  );

  return {
    selectedTemplate,
    selectedDay,
    selectedTemplateGaps,
    selectedTemplateGapSummary,
    selectedDayGapSummary,
    selectedDayStaffingSummary,
    copyDayTargetOptions,
    selectedTemplateInactiveDayCount,
    selectedTemplateStaffingSummary,
    copiedTemplateOpenShiftCount,
    selectedTemplateCopyDaySummaries,
    copyTemplateNameExists,
    copyTemplateNameIsBlank,
    copyTemplateHasNoDays,
    activeTemplates,
    archivedTemplates,
    totalStaffingGapSummary,
  };
}
