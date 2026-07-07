import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  ScheduleTemplateCopySource,
  TemplateCopyDaySummary,
  TemplateStaffingSummary,
} from "../helpers/scheduleTemplateCopy";

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

const weekdayLabels = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 7, label: "Søndag" },
];

function formatWeekday(value: number) {
  return (
    weekdayLabels.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

function formatShiftText(shiftCount: number) {
  if (shiftCount === 1) return "1 vagt";
  return `${shiftCount} vagter`;
}

function formatFixedStaffingText(assignedShiftCount: number) {
  if (assignedShiftCount === 1) return "1 fast medarbejder";
  return `${assignedShiftCount} faste medarbejdere`;
}

function formatJobFunctionText(jobFunctionCount: number) {
  if (jobFunctionCount === 1) return "1 jobfunktion";
  return `${jobFunctionCount} jobfunktioner`;
}

function formatWeekdayCountText(dayCount: number) {
  if (dayCount === 1) return "1 ugedag";
  return `${dayCount} ugedage`;
}

function formatTemplateCopyDayDetail(
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
    formatShiftText(summary.shiftCount),
    formatJobFunctionText(summary.jobFunctionCount),
  ];

  if (includeAssignments) {
    parts.push(formatFixedStaffingText(summary.assignedShiftCount));
  } else {
    parts.push("Faste medarbejdere kopieres ikke");
  }

  if (copiedOpenShiftCount > 0) {
    parts.push(formatOpenShiftText(copiedOpenShiftCount));
  }

  return parts.join(" · ");
}

function getSubmitButtonText({
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

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            Det kopieres
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
              {formatWeekdayCountText(staffingSummary.dayCount)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
              {formatShiftText(staffingSummary.shiftCount)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
              {formatJobFunctionText(staffingSummary.jobFunctionCount)}
            </span>
            {includeAssignments ? (
              <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                {formatFixedStaffingText(staffingSummary.assignedShiftCount)}
              </span>
            ) : (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
                Faste medarbejdere kopieres ikke
              </span>
            )}
            {copiedOpenShiftCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                {formatOpenShiftText(copiedOpenShiftCount)}
              </span>
            )}
            {!includeNotes && (
              <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                Noter kopieres ikke
              </span>
            )}
          </div>
        </div>

        {hasNoDays && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Kopien har ingen ugedage lige nu. Slå inaktive ugedage til igen,
            eller vælg en skabelon med aktive ugedage.
          </div>
        )}

        {daySummaries.length > 0 && (
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              Ugedage i kopien
            </p>
            <div className="mt-2 space-y-2">
              {daySummaries.map((daySummary) => (
                <div
                  key={daySummary.weekday}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-900"
                >
                  <div>
                    <p className="font-black text-gray-950 dark:text-white">
                      {formatWeekday(daySummary.weekday)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatTemplateCopyDayDetail(
                        daySummary,
                        includeAssignments,
                      )}
                    </p>
                  </div>
                  {!daySummary.isActive && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      Inaktiv
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {inactiveDayCount > 0 && (
          <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
            <label className="flex cursor-pointer items-start gap-3 font-semibold">
              <input
                type="checkbox"
                checked={includeInactiveDays}
                onChange={(event) =>
                  setIncludeInactiveDays(event.target.checked)
                }
                className="mt-1 h-4 w-4"
                disabled={copying}
              />
              <span>
                <span className="block font-black">Kopiér inaktive ugedage</span>
                <span className="mt-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Slå fra hvis kopien kun skal indeholde aktive ugedage.
                </span>
              </span>
            </label>
            {!includeInactiveDays && (
              <p className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {formatWeekdayCountText(inactiveDayCount)} springes over i kopien.
              </p>
            )}
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
          <label className="flex cursor-pointer items-start gap-3 font-semibold">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(event) => setIncludeNotes(event.target.checked)}
              className="mt-1 h-4 w-4"
              disabled={copying}
            />
            <span>
              <span className="block font-black">Kopiér noter</span>
              <span className="mt-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Slå fra hvis kopien skal starte uden beskrivelse, ugedagsnoter
                og jobfunktionsnoter.
              </span>
            </span>
          </label>
          {!includeNotes && (
            <p className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
              Beskrivelse og noter udelades i kopien.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <label className="flex cursor-pointer items-start gap-3 font-semibold">
            <input
              type="checkbox"
              checked={includeAssignments}
              onChange={(event) => setIncludeAssignments(event.target.checked)}
              className="mt-1 h-4 w-4"
              disabled={copying}
            />
            <span>
              <span className="block font-black">Kopiér faste medarbejdere</span>
              <span className="mt-1 block text-xs font-semibold text-blue-900 dark:text-blue-200">
                Slå fra hvis kopien skal starte med åbne vagter, som
                medarbejderne kan ønske.
              </span>
            </span>
          </label>
          {!includeAssignments && copiedOpenShiftCount > 0 && (
            <p className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold text-blue-950 dark:bg-gray-950 dark:text-blue-100">
              {formatOpenShiftText(copiedOpenShiftCount)} oprettes som åbne
              vagter i kopien.
            </p>
          )}
        </div>

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
            {getSubmitButtonText({
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
