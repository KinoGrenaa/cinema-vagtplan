"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TimeEntryMinuteStep } from "@/app/hooks/useTimeEntryMinuteStep";
import ProjectDateTimePicker from "@/app/components/date/ProjectDateTimePicker";
import ProjectTimePicker from "@/app/components/date/ProjectTimePicker";

import {
  formatTimeDK,
  roundLocalDateTimeToMinuteStep,
  toInputDateTime,
} from "@/app/utils/dateTime";
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
  minuteStep: TimeEntryMinuteStep;
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
  minuteStep: TimeEntryMinuteStep;
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

function getClockTime(
  value: string,
) {
  if (
    !value ||
    !value.includes("T")
  ) {
    return "";
  }

  return value.slice(11, 16);
}

function replaceClockTime(
  value: string,
  nextTime: string,
) {
  if (
    !value ||
    !value.includes("T") ||
    !nextTime
  ) {
    return value;
  }

  return (
    value.slice(0, 11) +
    nextTime
  );
}

function getPlannedRoundingMessage(
  label: "mødetid" | "fyraften",
  plannedValue: string,
  roundedValue: string,
  minuteStep: TimeEntryMinuteStep,
) {
  if (
    minuteStep === 1 ||
    !plannedValue ||
    !roundedValue ||
    plannedValue === roundedValue
  ) {
    return null;
  }

  const plannedTime =
    getClockTime(
      plannedValue,
    );

  const roundedTime =
    getClockTime(
      roundedValue,
    );

  if (
    !plannedTime ||
    !roundedTime
  ) {
    return null;
  }

  const crossesDate =
    plannedValue.slice(
      0,
      10,
    ) !==
    roundedValue.slice(
      0,
      10,
    );

  return (
    "Planlagt " +
    label +
    " " +
    plannedTime +
    " afrundes til " +
    roundedTime +
    (crossesDate
      ? " næste dag"
      : "") +
    " efter biografens " +
    minuteStep +
    "-minutters registreringsregel."
  );
}

export function TimeRegistrationModal({
  open,
  minuteStep,
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
  const autoSelectedForOpenRef =
    useRef(false);

  useEffect(() => {
    if (!open) {
      autoSelectedForOpenRef.current =
        false;
      return;
    }

    /*
     * Ved en allerede ?ben tidsregistrering
     * er vi i Clock ud-flowet. Her m? vi ikke
     * v?lge en ny vagt.
     */
    if (
      openTimeEntry ||
      autoSelectedForOpenRef.current
    ) {
      return;
    }

    const nextOption =
      shiftsForTimeRegistration.filter(({ timeEntry }) => !timeEntry)
        .sort(
          (
            left,
            right,
          ) =>
            new Date(
              left.shift.startTime,
            ).getTime() -
            new Date(
              right.shift.startTime,
            ).getTime(),
        )[0];

    if (!nextOption) {
      return;
    }

    const shift =
      nextOption.shift;

    autoSelectedForOpenRef.current =
      true;

    setClockShiftId(
      shift.id,
    );

    setClockInTime(
      roundLocalDateTimeToMinuteStep(
        toInputDateTime(
          shift.startTime,
        ),
        minuteStep,
      ),
    );

    setClockOutTime(
      roundLocalDateTimeToMinuteStep(
        toInputDateTime(
          shift.endTime,
        ),
        minuteStep,
      ),
    );

    setClockNote("");
  }, [
    open,
    openTimeEntry,
    minuteStep,
    shiftsForTimeRegistration,
    setClockShiftId,
    setClockInTime,
    setClockOutTime,
    setClockNote,
  ]);

  const plannedClockInTime =
    selectedClockShift
      ? toInputDateTime(
          selectedClockShift.startTime,
        )
      : "";

  const roundedPlannedClockInTime =
    plannedClockInTime
      ? roundLocalDateTimeToMinuteStep(
          plannedClockInTime,
          minuteStep,
        )
      : "";

  const plannedClockOutTime =
    selectedClockShift
      ? toInputDateTime(
          selectedClockShift.endTime,
        )
      : "";

  const roundedPlannedClockOutTime =
    plannedClockOutTime
      ? roundLocalDateTimeToMinuteStep(
          plannedClockOutTime,
          minuteStep,
        )
      : "";

  const clockInRoundingMessage =
    getPlannedRoundingMessage(
      "mødetid",
      plannedClockInTime,
      roundedPlannedClockInTime,
      minuteStep,
    );

  const clockOutRoundingMessage =
    getPlannedRoundingMessage(
      "fyraften",
      plannedClockOutTime,
      roundedPlannedClockOutTime,
      minuteStep,
    );

  const clockInBlockedByMissingNote =
    Boolean(
      !openTimeEntry &&
        clockShiftId &&
        roundedPlannedClockInTime &&
        clockInTime &&
        roundedPlannedClockInTime !==
          clockInTime &&
        !clockNote.trim(),
    );

  const clockOutBlockedByMissingNote =
    Boolean(
      openTimeEntry &&
        roundedPlannedClockOutTime &&
        clockOutTime &&
        roundedPlannedClockOutTime !==
          clockOutTime &&
        !clockNote.trim(),
    );

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
                setClockInTime(
                  roundLocalDateTimeToMinuteStep(
                    toInputDateTime(
                      shift.startTime,
                    ),
                    minuteStep,
                  ),
                );
                setClockOutTime(
                  roundLocalDateTimeToMinuteStep(
                    toInputDateTime(
                      shift.endTime,
                    ),
                    minuteStep,
                  ),
                );
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
                    · {shift.jobFunction.name}
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
                {selectedClockShift.jobFunction.name}
              </div>
            </div>
          )}

          {!openTimeEntry && clockShiftId && (
            <>
              <label className="block text-sm font-semibold">
                Faktisk mødetid
              </label>
              <ProjectTimePicker
                minuteStep={minuteStep}
                pickerOnly
                value={
                  getClockTime(
                    clockInTime,
                  )
                }
                onChange={(nextTime) =>
                  setClockInTime(
                    replaceClockTime(
                      clockInTime,
                      nextTime,
                    ),
                  )
                }
                ariaLabel={
                  "V\u00e6lg faktisk m\u00f8detid"
                }
              />
              {clockInRoundingMessage ? (
                <p className="text-xs leading-5 text-blue-700 dark:text-blue-300">
                  {clockInRoundingMessage}
                </p>
              ) : null}

              <textarea
                value={clockNote}
                onChange={(event) => setClockNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                placeholder="Forklar eventuel ændret mødetid"
              />
              {clockInBlockedByMissingNote && (
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  Skriv en note, fordi mødetiden afviger fra den planlagte tid.
                </p>
              )}
              <button
                onClick={onRegisterClockIn}
                disabled={clockInBlockedByMissingNote}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
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
              <ProjectTimePicker
                minuteStep={minuteStep}
                pickerOnly
                value={
                  getClockTime(
                    clockOutTime,
                  )
                }
                onChange={(nextTime) =>
                  setClockOutTime(
                    replaceClockTime(
                      clockOutTime,
                      nextTime,
                    ),
                  )
                }
                ariaLabel={
                  "V\u00e6lg faktisk fyraften"
                }
              />
              {clockOutRoundingMessage ? (
                <p className="text-xs leading-5 text-blue-700 dark:text-blue-300">
                  {clockOutRoundingMessage}
                </p>
              ) : null}

              <textarea
                value={clockNote}
                onChange={(event) => setClockNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                placeholder="Forklar eventuel ændret fyraften"
              />
              {clockOutBlockedByMissingNote && (
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  Skriv en note, fordi fyraften afviger fra den planlagte tid.
                </p>
              )}
              <button
                onClick={onRegisterClockOut}
                disabled={clockOutBlockedByMissingNote}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
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
  minuteStep,
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
            <ProjectDateTimePicker
              minuteStep={minuteStep}
              pickerOnly
              value={clockInTime}
              onChange={setClockInTime}
              ariaLabel={
                "V\u00e6lg manuel m\u00f8dedato og tid"
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Fyraften</label>
            <ProjectDateTimePicker
              minuteStep={minuteStep}
              pickerOnly
              value={clockOutTime}
              onChange={setClockOutTime}
              ariaLabel={
                "V\u00e6lg manuel fyraftensdato og tid"
              }
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
