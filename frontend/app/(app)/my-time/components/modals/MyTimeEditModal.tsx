"use client";

import type { TimeEntry } from "../../helpers/core/myTimeTypes";

type MyTimeEditModalProps = {
  editingEntry: TimeEntry | null;
  editClockIn: string;
  editClockOut: string;
  editClockInNote: string;
  editClockOutNote: string;
  savingEdit: boolean;
  onClockInChange: (value: string) => void;
  onClockOutChange: (value: string) => void;
  onClockInNoteChange: (value: string) => void;
  onClockOutNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 dark:disabled:bg-gray-900 dark:disabled:text-gray-500";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function MyTimeEditModal({
  editingEntry,
  editClockIn,
  editClockOut,
  editClockInNote,
  editClockOutNote,
  savingEdit,
  onClockInChange,
  onClockOutChange,
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            <span className="mb-1 block">Mødetid</span>
            <input
              type="datetime-local"
              value={editClockIn}
              onChange={(event) => onClockInChange(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            <span className="mb-1 block">Fyraften</span>
            <input
              type="datetime-local"
              value={editClockOut}
              onChange={(event) => onClockOutChange(event.target.value)}
              className={inputClass}
            />
          </label>
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
