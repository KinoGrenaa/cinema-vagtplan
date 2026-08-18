"use client";

import { useEffect, useState } from "react";
import ProjectDateTimePicker from "@/app/components/date/ProjectDateTimePicker";

import BaseModal from "../BaseModal";

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
          <ProjectDateTimePicker
            value={newClockIn}
            onChange={setNewClockIn}
            clearable
            ariaLabel={
              "V\u00e6lg clock ind dato og tid"
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Clock ud</label>
          <ProjectDateTimePicker
            value={newClockOut}
            onChange={setNewClockOut}
            clearable
            ariaLabel={
              "V\u00e6lg clock ud dato og tid"
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Intern note om rettelsen
          </label>
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            {loading ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
