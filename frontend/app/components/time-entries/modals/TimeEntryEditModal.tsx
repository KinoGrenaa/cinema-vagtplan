"use client";

import { useEffect, useState } from "react";
import BaseModal from "../../modals/BaseModal";

type Props = {
  open: boolean;
  clockIn: string;
  clockOut?: string | null;
  loading?: boolean;

  onClose: () => void;

  onSave: (data: {
    clockIn: string;
    clockOut?: string | null;
    adminNote: string;
  }) => Promise<void>;
};

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export default function TimeEntryEditModal({
  open,
  clockIn,
  clockOut,
  loading = false,
  onClose,
  onSave,
}: Props) {
  const [newClockIn, setNewClockIn] = useState("");
  const [newClockOut, setNewClockOut] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setNewClockIn(toInputDateTime(clockIn));
    setNewClockOut(toInputDateTime(clockOut));
    setAdminNote("");
    setError("");
  }, [open, clockIn, clockOut]);

  async function handleSave() {
    if (!adminNote.trim()) {
      setError("Intern note er påkrævet");
      return;
    }

    await onSave({
      clockIn: new Date(newClockIn).toISOString(),
      clockOut: newClockOut ? new Date(newClockOut).toISOString() : null,
      adminNote: adminNote.trim(),
    });
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Redigér timeregistrering"
      width="md"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Clock ind</label>

          <input
            type="datetime-local"
            value={newClockIn}
            onChange={(e) => setNewClockIn(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Clock ud</label>

          <input
            type="datetime-local"
            value={newClockOut}
            onChange={(e) => setNewClockOut(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Intern note om rettelsen
          </label>

          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2"
          >
            Annuller
          </button>

          <button
            disabled={loading}
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Gem ændringer
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
