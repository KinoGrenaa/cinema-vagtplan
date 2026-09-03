"use client";
import ProjectDateTimePicker from "@/app/components/date/ProjectDateTimePicker";
import type { TimeEntryMinuteStep } from "@/app/hooks/useTimeEntryMinuteStep";

import type { TimeEntry } from "../../helpers/core/myTimeTypes";

type MyTimeEditModalProps = {
  editingEntry: TimeEntry | null;
  minuteStep: TimeEntryMinuteStep;
  editClockIn: string;
  editClockOut: string;
  editNote: string;
  editClockInNote: string;
  editClockOutNote: string;
  savingEdit: boolean;
  onClockInChange: (value: string) => void;
  onClockOutChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClockInNoteChange: (value: string) => void;
  onClockOutNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 dark:disabled:bg-gray-900 dark:disabled:text-gray-500";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

const plannedComparisonTimeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      timeZone: "Europe/Copenhagen",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  );

function formatPlannedComparisonTime(
  value: string | undefined,
  minuteStep: TimeEntryMinuteStep,
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const stepMilliseconds =
    minuteStep * 60 * 1000;
  const roundedTimestamp =
    Math.round(
      date.getTime() /
        stepMilliseconds,
    ) *
    stepMilliseconds;

  return plannedComparisonTimeFormatter.format(
    new Date(roundedTimestamp),
  );
}

function formatReturnMessageActor(
  entry: TimeEntry,
) {
  const actor =
    entry.revisions?.[0]?.changedByUser;

  if (!actor) {
    return "administrationen";
  }

  const fullName =
    `${actor.firstName || ""} ${actor.lastName || ""}`.trim();

  return (
    fullName ||
    actor.email ||
    "administrationen"
  );
}

export default function MyTimeEditModal({
  editingEntry,
  minuteStep,
  editClockIn,
  editClockOut,
  editNote,
  editClockInNote,
  editClockOutNote,
  savingEdit,
  onClockInChange,
  onClockOutChange,
  onNoteChange,
  onClockInNoteChange,
  onClockOutNoteChange,
  onClose,
  onSave,
}: MyTimeEditModalProps) {
  if (!editingEntry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-time-edit-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
      >
        <h2
          id="my-time-edit-title"
          className="text-2xl font-bold text-gray-950 dark:text-white"
        >
          Redigér timeregistrering
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Du kan kun rette timer, der ikke er godkendt endnu.
        </p>

        {editingEntry.status === "NEEDS_CHANGES" &&
          editingEntry.adminNote && (
            <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
              <p className="font-semibold">
                Besked fra{" "}
                {formatReturnMessageActor(
                  editingEntry,
                )}
              </p>
              <p className="mt-1">
                {editingEntry.adminNote}
              </p>
            </div>
          )}

        {editingEntry.shift?.startTime &&
          editingEntry.shift?.endTime && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
              <p className="font-semibold">
                Planlagt vagt
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatPlannedComparisonTime(
                  editingEntry.shift.startTime,
                  minuteStep,
                )}{" "}
                –
                {" "}
                {formatPlannedComparisonTime(
                  editingEntry.shift.endTime,
                  minuteStep,
                )}
              </p>
              {editingEntry.shift.jobFunction
                ?.name && (
                <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
                  {
                    editingEntry.shift
                      .jobFunction.name
                  }
                </p>
              )}
            </div>
          )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            <span className="mb-1 block">
              {"M\u00f8detid"}
            </span>

            <ProjectDateTimePicker
              minuteStep={minuteStep}
              pickerOnly
              value={editClockIn}
              onChange={onClockInChange}
              ariaLabel={
                "V\u00e6lg m\u00f8dedato og tid"
              }
            />
          </div>
          <div className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            <span className="mb-1 block">
              Fyraften
            </span>

            <ProjectDateTimePicker
              minuteStep={minuteStep}
              pickerOnly
              value={editClockOut}
              onChange={onClockOutChange}
              ariaLabel={
                "V\u00e6lg fyraftensdato og tid"
              }
            />
          </div>
          {!editingEntry.shift ? (
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 sm:col-span-2">
              <span className="mb-1 block">Note / begrundelse</span>
              <textarea
                value={editNote}
                onChange={(event) => onNoteChange(event.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Skriv hvorfor timerne er registreret uden planlagt vagt"
              />
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="mb-1 block">Mødetidsnote</span>
                <textarea
                  value={editClockInNote}
                  onChange={(event) => onClockInNoteChange(event.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Forklar evt. ændret mødetid"
                />
              </label>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="mb-1 block">Fyraftensnote</span>
                <textarea
                  value={editClockOutNote}
                  onChange={(event) => onClockOutNoteChange(event.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Forklar evt. ændret fyraften"
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={savingEdit}
            className={`rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-600 ${focusClass}`}
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={savingEdit}
            className={`rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-blue-50 dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 dark:disabled:bg-blue-950 dark:disabled:text-blue-700 ${focusClass}`}
          >
            {savingEdit ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}
