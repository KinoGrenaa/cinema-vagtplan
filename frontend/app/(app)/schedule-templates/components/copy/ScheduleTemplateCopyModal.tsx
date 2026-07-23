import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

import type {
  ScheduleTemplateCopySource,
  TemplateCopyDaySummary,
  TemplateStaffingSummary,
} from "../../helpers/copy/scheduleTemplateCopy";
import { getTemplateCopySubmitButtonText } from "../../helpers/copy/scheduleTemplateCopyModalText";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Kopiér skabelon
            </p>
            <h2 className="text-2xl font-black">
              Kopiér {sourceTemplate.name}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Opret en ny vagtsskabelon med samme ugedage, jobfunktioner og
              bemanding. Du kan justere kopien bagefter uden at ændre
              originalen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
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
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
            Navn på ny skabelon
            <input
              value={copyName}
              onChange={(event) => setCopyName(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              placeholder={`Kopi af ${sourceTemplate.name}`}
              autoFocus
              disabled={copying}
            />
            {nameIsBlank && (
              <span className="mt-2 block rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                Indtast et navn på den nye vagtsskabelon.
              </span>
            )}
            {!nameIsBlank && nameExists && (
              <span className="mt-2 block rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                Der findes allerede en skabelon med dette navn. Vælg et andet
                navn til kopien.
              </span>
            )}
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
            disabled={
              copying ||
              nameIsBlank ||
              nameExists ||
              hasNoDays
            }
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
