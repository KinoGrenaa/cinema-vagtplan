import type { FormEvent } from "react";

import type { Shift } from "../../../../../../shared/types";

import { formatTimeDK } from "@/app/utils/dateTime";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
          Ny registrering
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Vælg eventuelt en vagt, og angiv start- og sluttidspunkt.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="clock-shift" className={labelClass}>
            Vagt
          </label>
          <select
            id="clock-shift"
            className={inputClass}
            value={selectedShiftId ?? ""}
            disabled={loading}
            onChange={(event) =>
              onSelectedShiftIdChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          >
            <option value="">Ingen tilknyttet vagt</option>
            {todayShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {formatTimeDK(shift.startTime)} - {formatTimeDK(shift.endTime)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="clock-in" className={labelClass}>
            Clock ind
          </label>
          <input
            id="clock-in"
            type="datetime-local"
            className={inputClass}
            value={clockIn}
            disabled={loading}
            onChange={(event) => onClockInChange(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="clock-out" className={labelClass}>
            Clock ud
          </label>
          <input
            id="clock-out"
            type="datetime-local"
            className={inputClass}
            value={clockOut}
            disabled={loading}
            onChange={(event) => onClockOutChange(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="clock-note" className={labelClass}>
            Note
          </label>
          <textarea
            id="clock-note"
            className={`${inputClass} min-h-28 resize-y py-3`}
            value={note}
            disabled={loading}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Valgfri note..."
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-300 dark:active:bg-blue-200 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {loading ? "Gemmer..." : "Gem registrering"}
          </button>
        </div>
      </form>
    </section>
  );
}
