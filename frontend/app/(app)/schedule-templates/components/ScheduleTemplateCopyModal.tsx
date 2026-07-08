import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  ScheduleTemplateCopySource,
  TemplateCopyDaySummary,
  TemplateStaffingSummary,
} from "../helpers/scheduleTemplateCopy";
import { getTemplateCopySubmitButtonText } from "../helpers/scheduleTemplateCopyModalText";
import ScheduleTemplateCopyOptions from "./ScheduleTemplateCopyOptions";
import ScheduleTemplateCopySummary from "./ScheduleTemplateCopySummary";

type ScheduleTemplateCopyModalProps = {
  sourceTemplate: ScheduleTemplateCopySource;
  copyName: string;
  setCopyName: Dispatch<SetStateAction<string>>;
  includeAssignments: boolean;
  setIncludeAssignments: Dispatch<SetStateAction<boolean>>;
  includeInactiveDays: boolean;
  setIncludeInactiveDays: Dispatch<SetStateAction<boolean>>;
  includeNotes: boolean;
  setIncludeNotes: Dispatch<SetStateAction<boolean>>;
  inactiveDayCount: number;
  staffingSummary: TemplateStaffingSummary;
  copiedOpenShiftCount: number;
  daySummaries: TemplateCopyDaySummary[];
  nameIsBlank: boolean;
  nameExists: boolean;
  hasNoDays: boolean;
  copying: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export default function ScheduleTemplateCopyModal({
  sourceTemplate,
  copyName,
  setCopyName,
  includeAssignments,
  setIncludeAssignments,
  includeInactiveDays,
  setIncludeInactiveDays,
  includeNotes,
  setIncludeNotes,
  inactiveDayCount,
  staffingSummary,
  copiedOpenShiftCount,
  daySummaries,
  nameIsBlank,
  nameExists,
  hasNoDays,
  copying,
  onClose,
  onSubmit,
}: ScheduleTemplateCopyModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              Kopiér skabelon
            </p>
            <h2 className="text-2xl font-black">Kopiér {sourceTemplate.name}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Opret en ny vagtsskabelon med samme ugedage, jobfunktioner og
              bemanding. Du kan justere kopien bagefter uden at ændre originalen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            disabled={copying}
          >
            Luk
          </button>
        </div>

        <ScheduleTemplateCopySummary
          staffingSummary={staffingSummary}
          copiedOpenShiftCount={copiedOpenShiftCount}
          daySummaries={daySummaries}
          includeAssignments={includeAssignments}
          includeNotes={includeNotes}
          hasNoDays={hasNoDays}
        />

        <ScheduleTemplateCopyOptions
          inactiveDayCount={inactiveDayCount}
          includeInactiveDays={includeInactiveDays}
          setIncludeInactiveDays={setIncludeInactiveDays}
          includeNotes={includeNotes}
          setIncludeNotes={setIncludeNotes}
          includeAssignments={includeAssignments}
          setIncludeAssignments={setIncludeAssignments}
          copiedOpenShiftCount={copiedOpenShiftCount}
          copying={copying}
        />

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Navn på ny skabelon
            <input
              value={copyName}
              onChange={(event) => setCopyName(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={`Kopi af ${sourceTemplate.name}`}
              autoFocus
              disabled={copying}
            />
            {nameIsBlank && (
              <span className="mt-2 block rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
                Indtast et navn på den nye vagtsskabelon.
              </span>
            )}
            {!nameIsBlank && nameExists && (
              <span className="mt-2 block rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                Der findes allerede en skabelon med dette navn. Vælg et andet
                navn til kopien.
              </span>
            )}
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={copying || nameIsBlank || nameExists || hasNoDays}
          >
            {getTemplateCopySubmitButtonText({
              copying,
              nameIsBlank,
              nameExists,
              hasNoDays,
            })}
          </button>
        </form>
      </div>
    </div>
  );
}
