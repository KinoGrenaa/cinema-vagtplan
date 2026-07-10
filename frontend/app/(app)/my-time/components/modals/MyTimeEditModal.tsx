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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Redigér timeregistrering</h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Du kan kun rette timer, der ikke er godkendt endnu.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Mødetid</label>

            <input
              type="datetime-local"
              value={editClockIn}
              onChange={(event) => onClockInChange(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Fyraften</label>

            <input
              type="datetime-local"
              value={editClockOut}
              onChange={(event) => onClockOutChange(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Mødetidsnote
            </label>

            <textarea
              value={editClockInNote}
              onChange={(event) => onClockInNoteChange(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Forklar evt. ændret mødetid"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Fyraftensnote
            </label>

            <textarea
              value={editClockOutNote}
              onChange={(event) => onClockOutNoteChange(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Forklar evt. ændret fyraften"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={savingEdit}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Annuller
          </button>

          <button
            onClick={onSave}
            disabled={savingEdit}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {savingEdit ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}
