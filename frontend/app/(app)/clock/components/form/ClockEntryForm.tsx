import type { FormEvent } from "react";

import type { Shift } from "../../../../../../shared/types";

import { formatTimeDK } from "@/app/utils/dateTime";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

type ClockEntryFormProps = {
  todayShifts: Shift[];
  selectedShiftId: number | null;
  clockIn: string;
  clockOut: string;
  note: string;
  loading: boolean;
  onSelectedShiftIdChange: (shiftId: number | null) => void;
  onClockInChange: (value: string) => void;
  onClockOutChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ClockEntryForm({
  todayShifts,
  selectedShiftId,
  clockIn,
  clockOut,
  note,
  loading,
  onSelectedShiftIdChange,
  onClockInChange,
  onClockOutChange,
  onNoteChange,
  onSubmit,
}: ClockEntryFormProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-2xl font-bold">Ny registrering</h2>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Vagt</label>
          <select
            className={inputClass}
            value={selectedShiftId ?? ""}
            onChange={(event) =>
              onSelectedShiftIdChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          >
            <option value="">Ingen tilknyttet vagt</option>
            {todayShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {formatTimeDK(shift.startTime)}
                {" - "}
                {formatTimeDK(shift.endTime)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Clock ind</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={clockIn}
            onChange={(event) => onClockInChange(event.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Clock ud</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={clockOut}
            onChange={(event) => onClockOutChange(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Note</label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Valgfri note..."
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {loading ? "Gemmer..." : "Gem registrering"}
          </button>
        </div>
      </form>
    </section>
  );
}
