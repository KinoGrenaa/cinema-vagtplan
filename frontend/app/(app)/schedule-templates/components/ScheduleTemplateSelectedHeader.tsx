import type { Dispatch, SetStateAction } from "react";

import type {
  ScheduleTemplateStaffingGap,
  ScheduleTemplateStaffingGapSummary,
} from "../helpers/scheduleTemplateStaffingGaps";
import ScheduleTemplateOpenShiftSummary from "./ScheduleTemplateOpenShiftSummary";
import ScheduleTemplateSelectedActions from "./ScheduleTemplateSelectedActions";
import ScheduleTemplateStamdataForm from "./ScheduleTemplateStamdataForm";

type WeekParity = "ANY" | "EVEN" | "ODD";

type ScheduleTemplate = {
  name: string;
  description: string | null;
  isActive: boolean;
};

type TemplateFormState = {
  name: string;
  description: string;
  weekParity: WeekParity;
  sortOrder: string;
};

type WeekdayOption = {
  value: number;
  label: string;
};

type ScheduleTemplateSelectedHeaderProps = {
  template: ScheduleTemplate;
  form: TemplateFormState;
  setForm: Dispatch<SetStateAction<TemplateFormState>>;
  editing: boolean;
  saving: boolean;
  copying: boolean;
  gapSummary: ScheduleTemplateStaffingGapSummary;
  gaps: ScheduleTemplateStaffingGap[];
  weekdays: WeekdayOption[];
  onArchive: () => void;
  onReactivate: () => void;
  onCopyTemplate: () => void;
  onToggleEditing: () => void;
  onSave: () => void;
};

export default function ScheduleTemplateSelectedHeader({
  template,
  form,
  setForm,
  editing,
  saving,
  copying,
  gapSummary,
  gaps,
  weekdays,
  onArchive,
  onReactivate,
  onCopyTemplate,
  onToggleEditing,
  onSave,
}: ScheduleTemplateSelectedHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Valgt skabelon
          </p>
          <h2 className="text-2xl font-black">{template.name}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {template.description || "Ingen beskrivelse"}
          </p>
        </div>

        <ScheduleTemplateSelectedActions
          isActive={template.isActive}
          copying={copying}
          editing={editing}
          onArchive={onArchive}
          onReactivate={onReactivate}
          onCopyTemplate={onCopyTemplate}
          onToggleEditing={onToggleEditing}
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="font-black">Ændringer gælder fremtidig generering</p>
        <p className="mt-1">
          Allerede oprettede vagter ændres ikke automatisk, når denne skabelon
          justeres.
        </p>
      </div>

      <ScheduleTemplateOpenShiftSummary
        gapSummary={gapSummary}
        gaps={gaps}
        weekdays={weekdays}
      />

      {editing && (
        <ScheduleTemplateStamdataForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={onSave}
        />
      )}
    </>
  );
}
