import type { Dispatch, SetStateAction } from "react";

import {
  summarizeStaffingGaps,
  type ScheduleTemplateStaffingGap,
  type ScheduleTemplateStaffingGapSummary,
} from "../helpers/scheduleTemplateStaffingGaps";

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

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

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
        <div className="flex flex-wrap gap-2">
          {template.isActive ? (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Arkivér
            </button>
          ) : (
            <button
              type="button"
              onClick={onReactivate}
              className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
            >
              Genaktivér
            </button>
          )}
          <button
            type="button"
            onClick={onCopyTemplate}
            className="rounded-2xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/40"
            disabled={copying}
          >
            Kopiér skabelon
          </button>
          <button
            type="button"
            onClick={onToggleEditing}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {editing ? "Luk stamdata" : "Redigér stamdata"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="font-black">Ændringer gælder fremtidig generering</p>
        <p className="mt-1">
          Allerede oprettede vagter ændres ikke automatisk, når denne skabelon
          justeres.
        </p>
      </div>

      {gapSummary.missingShiftCount > 0 && (
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
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-900/60 dark:text-amber-50">
              {gapSummary.jobFunctionCount} jobfunktioner
            </span>
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
      )}

      {editing && (
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <label className="block text-sm font-semibold">
              Navn
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="block text-sm font-semibold">
              Ugeregel
              <select
                value={form.weekParity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weekParity: event.target.value as WeekParity,
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="ANY">Alle uger</option>
                <option value="EVEN">Kun lige uger</option>
                <option value="ODD">Kun ulige uger</option>
              </select>
            </label>
            <label className="block text-sm font-semibold lg:col-span-2">
              Beskrivelse
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-1 min-h-20 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Gemmer..." : "Gem stamdata"}
          </button>
        </div>
      )}
    </>
  );
}
