import type { Dispatch, FormEvent, SetStateAction } from "react";

import ScheduleTemplateDaySettings from "../selected/ScheduleTemplateDaySettings";
import ScheduleTemplateJobFunctionsSection from "../job-functions/ScheduleTemplateJobFunctionsSection";
import ScheduleTemplateSelectedHeader from "../selected/ScheduleTemplateSelectedHeader";
import ScheduleTemplateWeekdayTabs from "../selected/ScheduleTemplateWeekdayTabs";

import { formatWeekday, weekdayOptions } from "../../helpers/page/scheduleTemplatePageHelpers";
import type {
  ScheduleTemplateStaffingGap,
  ScheduleTemplateStaffingGapSummary,
} from "../../helpers/page/scheduleTemplateStaffingGaps";
import type {
  DayFormState,
  JobFunction,
  JobFunctionFormState,
  ScheduleTemplate,
  ScheduleTemplateAssignment,
  ScheduleTemplateUser,
  TemplateDay,
  TemplateFormState,
  TemplateJobFunction,
} from "../../helpers/page/scheduleTemplatePageTypes";

type ScheduleTemplateEditorPanelProps = {
  selectedTemplate: ScheduleTemplate | null;
  templateForm: TemplateFormState;
  setTemplateForm: Dispatch<SetStateAction<TemplateFormState>>;
  editingTemplate: boolean;
  savingTemplate: boolean;
  copyingTemplate: boolean;
  selectedTemplateGapSummary: ScheduleTemplateStaffingGapSummary;
  selectedTemplateGaps: ScheduleTemplateStaffingGap[];
  selectedWeekday: number;
  onSelectWeekday: (weekday: number) => void;
  selectedDay: TemplateDay | null;
  dayForm: DayFormState;
  setDayForm: Dispatch<SetStateAction<DayFormState>>;
  selectedDayGapSummary: ScheduleTemplateStaffingGapSummary;
  savingDay: boolean;
  copyingDay: boolean;
  jobFunctions: JobFunction[];
  employees: ScheduleTemplateUser[];
  jobFunctionForm: JobFunctionFormState;
  setJobFunctionForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  savingJobFunction: boolean;
  expandedJobFunctionIds: Set<number>;
  savingAssignmentKey: string | null;
  onArchiveSelectedTemplate: () => void;
  onReactivateSelectedTemplate: () => void;
  onCopyTemplate: () => void;
  onToggleEditing: () => void;
  onSaveTemplate: () => void;
  onSaveDay: () => void;
  onCopyDay: () => void;
  onAddJobFunction: (event: FormEvent) => void;
  onToggleJobFunctionDetails: (id: number) => void;
  onRemoveTemplateJobFunction: (item: TemplateJobFunction) => void;
  onAddTemplateAssignment: (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => void;
  onRemoveTemplateAssignment: (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => void;
  onUpdateTemplateJobFunction: (
    item: TemplateJobFunction,
    updates: Partial<Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">>,
  ) => void;
};

export default function ScheduleTemplateEditorPanel({
  selectedTemplate,
  templateForm,
  setTemplateForm,
  editingTemplate,
  savingTemplate,
  copyingTemplate,
  selectedTemplateGapSummary,
  selectedTemplateGaps,
  selectedWeekday,
  onSelectWeekday,
  selectedDay,
  dayForm,
  setDayForm,
  selectedDayGapSummary,
  savingDay,
  copyingDay,
  jobFunctions,
  employees,
  jobFunctionForm,
  setJobFunctionForm,
  savingJobFunction,
  expandedJobFunctionIds,
  savingAssignmentKey,
  onArchiveSelectedTemplate,
  onReactivateSelectedTemplate,
  onCopyTemplate,
  onToggleEditing,
  onSaveTemplate,
  onSaveDay,
  onCopyDay,
  onAddJobFunction,
  onToggleJobFunctionDetails,
  onRemoveTemplateJobFunction,
  onAddTemplateAssignment,
  onRemoveTemplateAssignment,
  onUpdateTemplateJobFunction,
}: ScheduleTemplateEditorPanelProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {!selectedTemplate && (
        <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
          Opret eller vælg en vagtsskabelon for at redigere ugedage og
          jobfunktioner.
        </p>
      )}

      {selectedTemplate && (
        <div className="flex flex-col gap-5">
          <ScheduleTemplateSelectedHeader
            template={selectedTemplate}
            form={templateForm}
            setForm={setTemplateForm}
            editing={editingTemplate}
            saving={savingTemplate}
            copying={copyingTemplate}
            gapSummary={selectedTemplateGapSummary}
            gaps={selectedTemplateGaps}
            weekdays={weekdayOptions}
            onArchive={onArchiveSelectedTemplate}
            onReactivate={onReactivateSelectedTemplate}
            onCopyTemplate={onCopyTemplate}
            onToggleEditing={onToggleEditing}
            onSave={onSaveTemplate}
          />

          <ScheduleTemplateWeekdayTabs
            template={selectedTemplate}
            weekdays={weekdayOptions}
            selectedWeekday={selectedWeekday}
            onSelectWeekday={onSelectWeekday}
          />

          <ScheduleTemplateDaySettings
            weekdayLabel={formatWeekday(selectedWeekday)}
            hasSelectedDay={Boolean(selectedDay)}
            form={dayForm}
            setForm={setDayForm}
            gapSummary={selectedDayGapSummary}
            saving={savingDay}
            copying={copyingDay}
            onSave={onSaveDay}
            onCopyDay={onCopyDay}
          />

          <ScheduleTemplateJobFunctionsSection
            weekdayLabel={formatWeekday(selectedWeekday)}
            selectedDay={selectedDay}
            jobFunctions={jobFunctions}
            employees={employees}
            form={jobFunctionForm}
            setForm={setJobFunctionForm}
            savingJobFunction={savingJobFunction}
            expandedJobFunctionIds={expandedJobFunctionIds}
            savingAssignmentKey={savingAssignmentKey}
            onAddJobFunction={onAddJobFunction}
            onToggleJobFunctionDetails={onToggleJobFunctionDetails}
            onRemoveTemplateJobFunction={onRemoveTemplateJobFunction}
            onAddTemplateAssignment={onAddTemplateAssignment}
            onRemoveTemplateAssignment={onRemoveTemplateAssignment}
            onUpdateTemplateJobFunction={onUpdateTemplateJobFunction}
          />
        </div>
      )}
    </section>
  );
}
