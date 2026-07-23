"use client";

import type { Dispatch, SetStateAction } from "react";

import { formatTimeDK, toInputDateTime } from "@/app/utils/dateTime";
import type { Shift } from "../../../../../../shared/types";

type TimeEntryStatus = "APPROVED" | "PENDING" | "NEEDS_CHANGES" | string;

type ShiftTimeRegistrationOption = {
  shift: Shift;
  timeEntry: {
    status?: TimeEntryStatus | null;
  } | null;
};

type TimeRegistrationModalProps = {
  open: boolean;
  onClose: () => void;
  openTimeEntry: unknown | null;
  clockShiftId: number | null;
  setClockShiftId: Dispatch<SetStateAction<number | null>>;
  shifts: Shift[];
  shiftsForTimeRegistration: ShiftTimeRegistrationOption[];
  selectedClockShift?: Shift;
  clockInTime: string;
  setClockInTime: Dispatch<SetStateAction<string>>;
  clockOutTime: string;
  setClockOutTime: Dispatch<SetStateAction<string>>;
  clockNote: string;
  setClockNote: Dispatch<SetStateAction<string>>;
  onRegisterClockIn: () => void;
  onRegisterClockOut: () => void;
};

type ManualTimeRegistrationModalProps = {
  open: boolean;
  onClose: () => void;
  clockInTime: string;
  setClockInTime: Dispatch<SetStateAction<string>>;
  clockOutTime: string;
  setClockOutTime: Dispatch<SetStateAction<string>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
};

function getTimeEntryStatusText(status?: TimeEntryStatus | null) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "PENDING") return "Afventer godkendelse";
  if (status === "NEEDS_CHANGES") return "Kræver rettelse";
  return "";
}

export function TimeRegistrationModal({
  open,
  onClose,
  openTimeEntry,
  clockShiftId,
  setClockShiftId,
  shifts,
  shiftsForTimeRegistration,
  selectedClockShift,
  clockInTime,
  setClockInTime,
  clockOutTime,
  setClockOutTime,
  clockNote,
  setClockNote,
  onRegisterClockIn,
  onRegisterClockOut,
}: TimeRegistrationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Registrer tid</h2>
          <button type="button" onClick={onClose} aria-label="Luk" className="rounded-lg px-2 py-1 text-2xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:active:bg-gray-700 dark:focus-visible:ring-gray-400">
            ×
          </button>
        </div>

        <div className="space-y-4">
          {!openTimeEntry && (
            <select
              value={clockShiftId || ""}
              onChange={(event) => {
                const shiftId = Number(event.target.value);
                setClockShiftId(shiftId);
                const shift = shifts.find(
                  (candidate) => candidate.id === shiftId,
                );
                if (!shift) return;
                setClockInTime(toInputDateTime(shift.startTime));
                setClockOutTime(toInputDateTime(shift.endTime));
                setClockNote("");
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">Vælg vagt</option>
              {shiftsForTimeRegistration.map(({ shift, timeEntry }) => {
                const isDisabled = Boolean(timeEntry);
                const statusText = getTimeEntryStatusText(timeEntry?.status);

                return (
                  <option key={shift.id} value={shift.id} disabled={isDisabled}>
                    {formatTimeDK(shift.startTime)} - {formatTimeDK(shift.endTime)}{" "}
                    · {shift.workType.name}
                    {statusText ? ` · ${statusText}` : ""}
                  </option>
                );
              })}
            </select>
          )}

          {selectedClockShift && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Planlagt vagt
              </div>
              <div className="mt-1 text-lg font-bold">
                {formatTimeDK(selectedClockShift.startTime)} -{" "}
                {formatTimeDK(selectedClockShift.endTime)}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {selectedClockShift.workType.name}
              </div>
            </div>
          )}

          {!openTimeEntry && clockShiftId && (
            <>
              <label className="block text-sm font-semibold">
                Faktisk mødetid
              </label>
              <input
                type="datetime-local"
                value={clockInTime}
                onChange={(event) => setClockInTime(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              />
              <textarea
                value={clockNote}
                onChange={(event) => setClockNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                placeholder="Forklar eventuel ændret mødetid"
              />
              <button
                onClick={onRegisterClockIn}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              >
                Registrer mødetid
              </button>
            </>
          )}

          {Boolean(openTimeEntry) && (
            <>
              <label className="block text-sm font-semibold">
                Faktisk fyraften
              </label>
              <input
                type="datetime-local"
                value={clockOutTime}
                onChange={(event) => setClockOutTime(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              />
              <textarea
                value={clockNote}
                onChange={(event) => setClockNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                placeholder="Forklar eventuel ændret fyraften"
              />
              <button
                onClick={onRegisterClockOut}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              >
                Registrer fyraften
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ManualTimeRegistrationModal({
  open,
  onClose,
  clockInTime,
  setClockInTime,
  clockOutTime,
  setClockOutTime,
  note,
  setNote,
  onSubmit,
}: ManualTimeRegistrationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Manuel registrering</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Bruges til arbejde uden planlagt vagt. Registreringen sendes til
              godkendelse.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Luk" className="rounded-lg px-2 py-1 text-2xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:active:bg-gray-700 dark:focus-visible:ring-gray-400">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Mødetid</label>
            <input
              type="datetime-local"
              value={clockInTime}
              onChange={(event) => setClockInTime(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Fyraften</label>
            <input
              type="datetime-local"
              value={clockOutTime}
              onChange={(event) => setClockOutTime(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Note / begrundelse
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              placeholder="Skriv hvorfor timerne registreres uden planlagt vagt"
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Send til godkendelse
          </button>
        </div>
      </div>
    </div>
  );
}
