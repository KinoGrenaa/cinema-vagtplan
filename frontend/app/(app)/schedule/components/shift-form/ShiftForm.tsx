import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toInputDateTime } from "@/app/utils/dateTime";
import { useScheduleJobFunctionTimingPreview } from "../../hooks/data/useScheduleJobFunctionTimingPreview";
import {
  formatJobFunctionTimingPreviewRange,
  getJobFunctionTimingPreviewOverlap,
} from "../../helpers/derived/scheduleJobFunctionShift";
import type { Shift } from "../../../../../../shared/types";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveRequest = {
  id: number;
  userId?: number | null;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  user?: {
    id?: number | null;
    firstName?: string;
    lastName?: string;
  } | null;
};

type ShiftFormProps = {
  users: any[];
  jobFunctions: any[];
  shifts: Shift[];
  selectedDate: string;
  leaveRequests?: LeaveRequest[];
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  userId: number;
  setUserId: (value: number) => void;
  jobFunctionId: number;
  setJobFunctionId: (value: number) => void;
  selectedShift: any;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onCancel: () => void;
  onOfferTrade: () => void;
  onSendStaffingRequest?: () => void;
  showHeader?: boolean;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const helpTextClass = "mt-1 text-xs text-gray-500 dark:text-gray-400";

function openDateTimePicker(id: string) {
  const input = document.getElementById(id) as HTMLInputElement | null;

  if (input?.showPicker) {
    input.showPicker();
  } else {
    input?.focus();
  }
}

function getLeaveUserId(leaveRequest: LeaveRequest): number | null {
  if (typeof leaveRequest.userId === "number") {
    return leaveRequest.userId;
  }

  if (typeof leaveRequest.user?.id === "number") {
    return leaveRequest.user.id;
  }

  return null;
}

function datesOverlap(
  shiftStartTime: string,
  shiftEndTime: string,
  leaveStartDate: string,
  leaveEndDate: string,
) {
  if (!shiftStartTime || !shiftEndTime || !leaveStartDate || !leaveEndDate) {
    return false;
  }

  const shiftStart = new Date(shiftStartTime).getTime();
  const shiftEnd = new Date(shiftEndTime).getTime();
  const leaveStart = new Date(leaveStartDate).getTime();
  const leaveEnd = new Date(leaveEndDate).getTime();

  if (
    Number.isNaN(shiftStart) ||
    Number.isNaN(shiftEnd) ||
    Number.isNaN(leaveStart) ||
    Number.isNaN(leaveEnd)
  ) {
    return false;
  }

  return shiftStart < leaveEnd && shiftEnd > leaveStart;
}

function getUserLeaveConflict(
  userId: number,
  leaveRequests: LeaveRequest[],
  startTime: string,
  endTime: string,
): LeaveStatus | null {
  const relevantLeaveRequests = leaveRequests.filter((leaveRequest) => {
    const leaveUserId = getLeaveUserId(leaveRequest);

    return (
      leaveUserId === userId &&
      (leaveRequest.status === "APPROVED" ||
        leaveRequest.status === "PENDING") &&
      datesOverlap(
        startTime,
        endTime,
        leaveRequest.startDate,
        leaveRequest.endDate,
      )
    );
  });

  if (
    relevantLeaveRequests.some(
      (leaveRequest) => leaveRequest.status === "APPROVED",
    )
  ) {
    return "APPROVED";
  }

  if (
    relevantLeaveRequests.some(
      (leaveRequest) => leaveRequest.status === "PENDING",
    )
  ) {
    return "PENDING";
  }

  return null;
}

function getUserDisplayName(user: any) {
  return (
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Ukendt medarbejder"
  );
}

function formatInputTime(value: string) {
  if (!value || !value.includes("T")) {
    return value;
  }

  return value.slice(11, 16);
}

function getDateTimeValue(value: string): number | null {
  if (!value) {
    return null;
  }

  const dateTimeValue = new Date(value).getTime();

  if (Number.isNaN(dateTimeValue)) {
    return null;
  }

  return dateTimeValue;
}

function validateShiftForm({
  startTime,
  endTime,
  userId,
  jobFunctionId,
  selectedUserLeaveConflict,
}: {
  startTime: string;
  endTime: string;
  userId: number;
  jobFunctionId: number;
  selectedUserLeaveConflict: LeaveStatus | null;
}) {
  const errors: string[] = [];
  const startDateTime = getDateTimeValue(startTime);
  const endDateTime = getDateTimeValue(endTime);

  if (startDateTime === null) {
    errors.push("Starttidspunkt skal udfyldes.");
  }

  if (endDateTime === null) {
    errors.push("Sluttidspunkt skal udfyldes.");
  }

  if (startDateTime !== null && endDateTime !== null) {
    if (endDateTime <= startDateTime) {
      errors.push("Sluttidspunkt skal være efter starttidspunkt.");
    }
  }

  if (!jobFunctionId || jobFunctionId <= 0) {
    errors.push("Jobfunktion skal vælges.");
  }

  if (userId > 0 && selectedUserLeaveConflict === "APPROVED") {
    errors.push("Den valgte medarbejder har godkendt fri i dette tidsrum.");
  }

  return errors;
}

export default function ShiftForm({
  users,
  jobFunctions,
  shifts,
  selectedDate,
  leaveRequests = [],
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  note,
  setNote,
  userId,
  setUserId,
  jobFunctionId,
  setJobFunctionId,
  selectedShift,
  onSubmit,
  onDelete,
  onCancel,
  onOfferTrade,
  onSendStaffingRequest,
  showHeader = true,
}: ShiftFormProps) {
  const selectedUserLeaveConflict = getUserLeaveConflict(
    userId,
    leaveRequests,
    startTime,
    endTime,
  );
  const activeTrade = selectedShift?.trades?.[0] ?? null;
  const activeTradeTargetName =
    `${activeTrade?.targetUser?.firstName ?? ""} ${activeTrade?.targetUser?.lastName ?? ""}`.trim();
  const activeTradeLabel = activeTrade
    ? activeTrade.type === "POOL"
      ? "I vagtpuljen"
      : `Direkte tilbud → ${activeTradeTargetName || "kollega"}`
    : null;
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [timingManuallyAdjusted, setTimingManuallyAdjusted] =
    useState(false);
  const {
    preview: timingPreview,
    loading: timingPreviewLoading,
    error: timingPreviewError,
  } = useScheduleJobFunctionTimingPreview({
    enabled:
      !selectedShift &&
      jobFunctionId > 0,
    selectedDate,
    jobFunctionId:
      !selectedShift &&
      jobFunctionId > 0
        ? jobFunctionId
        : null,
  });
  const timingPreviewOverlap = useMemo(
    () =>
      timingPreview &&
      jobFunctionId > 0
        ? getJobFunctionTimingPreviewOverlap(
            timingPreview,
            shifts,
            jobFunctionId,
          )
        : null,
    [
      jobFunctionId,
      shifts,
      timingPreview,
    ],
  );

  useEffect(() => {
    if (
      selectedShift ||
      !timingPreview
    ) {
      return;
    }

    setStartTime(
      toInputDateTime(
        timingPreview.startTime,
      ),
    );
    setEndTime(
      toInputDateTime(
        timingPreview.endTime,
      ),
    );
    setTimingManuallyAdjusted(false);
  }, [
    selectedShift,
    setEndTime,
    setStartTime,
    timingPreview,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateShiftForm({
      startTime,
      endTime,
      userId,
      jobFunctionId,
      selectedUserLeaveConflict,
    });

    if (errors.length > 0) {
      event.preventDefault();
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    onSubmit(event);
  }

  return (
    <div className="space-y-5">
      {showHeader && (
        <div>
          <h2 className="text-2xl font-bold">
            {selectedShift ? "Rediger vagt" : "Opret vagt"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vælg tidspunkt, medarbejder og jobfunktion for vagten.
          </p>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Vagten kan ikke gemmes endnu:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div>
          <label className={labelClass}>Start</label>
          <div className="flex gap-2">
            <input
              id="shiftStartTime"
              type="datetime-local"
              className={inputClass}
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (!selectedShift && timingPreview) {
                  setTimingManuallyAdjusted(true);
                }
              }}
            />

            <button
              type="button"
              onClick={() => openDateTimePicker("shiftStartTime")}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
              title="Vælg starttidspunkt"
            >
              📅
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Slut</label>
          <div className="flex gap-2">
            <input
              id="shiftEndTime"
              type="datetime-local"
              className={inputClass}
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                if (!selectedShift && timingPreview) {
                  setTimingManuallyAdjusted(true);
                }
              }}
            />

            <button
              type="button"
              onClick={() => openDateTimePicker("shiftEndTime")}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
              title="Vælg sluttidspunkt"
            >
              📅
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Note</label>
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Fx aftenvagt"
          />
        </div>

        <div>
          <label className={labelClass}>Medarbejder</label>
          <select
            className={inputClass}
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
          >
            <option value={0}>Ikke tildelt</option>

            {users.map((user) => {
              const leaveConflict = getUserLeaveConflict(
                user.id,
                leaveRequests,
                startTime,
                endTime,
              );
              const hasApprovedLeave = leaveConflict === "APPROVED";
              const hasPendingLeave = leaveConflict === "PENDING";
              const isCurrentSelectedUser = user.id === userId;
              const displayName = getUserDisplayName(user);

              return (
                <option
                  key={user.id}
                  value={user.id}
                  disabled={hasApprovedLeave && !isCurrentSelectedUser}
                  className={
                    hasApprovedLeave
                      ? "text-gray-400"
                      : hasPendingLeave
                        ? "text-yellow-700"
                        : undefined
                  }
                >
                  {displayName}
                  {hasApprovedLeave ? " — godkendt fri" : ""}
                  {hasPendingLeave ? " — afventer fravær" : ""}
                </option>
              );
            })}
          </select>

          {selectedUserLeaveConflict === "APPROVED" && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              Den valgte medarbejder har godkendt fri i dette tidsrum.
            </p>
          )}

          {selectedUserLeaveConflict === "PENDING" && (
            <p className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
              Den valgte medarbejder har en afventende fraværsansøgning i dette
              tidsrum.
            </p>
          )}

          {leaveRequests.length > 0 && startTime && endTime && (
            <p className={helpTextClass}>
              Medarbejdere med godkendt fri markeres i listen og kan ikke
              vælges.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Jobfunktion</label>
          <select
            className={inputClass}
            value={jobFunctionId}
            onChange={(e) => setJobFunctionId(Number(e.target.value))}
            disabled={Boolean(selectedShift)}
          >
            <option value={0}>Vælg jobfunktion</option>

            {jobFunctions.map((jobFunction) => (
              <option key={jobFunction.id} value={jobFunction.id}>
                {jobFunction.name}
              </option>
            ))}
          </select>

          {selectedShift && (
            <p className={helpTextClass}>
              Jobfunktionen kan ikke ændres på en eksisterende vagt. Slet
              vagten og opret den korrekt i stedet.
            </p>
          )}
        </div>

        {!selectedShift &&
          jobFunctionId > 0 && (
            <div className="md:col-span-3">
              {timingPreviewLoading ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100">
                  Beregner vagtens mødetid og fyraften ud fra dagens
                  filmprogram...
                </div>
              ) : timingPreview ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/25">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        Beregnet forslag
                      </p>
                      <p className="mt-1 text-xl font-black text-gray-950 dark:text-white">
                        {formatJobFunctionTimingPreviewRange(
                          timingPreview,
                        )}
                      </p>
                      {timingManuallyAdjusted && (
                        <p className="mt-2 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
                          {`Aktuelle tider: ${formatInputTime(
                            startTime,
                          )}–${formatInputTime(
                            endTime,
                          )} · manuelt ændret`}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {timingPreview.usedFallback
                          ? "Der var ingen relevante filmvisninger, så jobfunktionens standardtider bruges."
                          : timingPreview.sourceMovieShowings.length > 0
                            ? `Baseret på ${timingPreview.sourceMovieShowings.length} ${
                                timingPreview.sourceMovieShowings.length === 1
                                  ? "filmvisning"
                                  : "filmvisninger"
                              }.`
                            : "Tiderne følger jobfunktionens faste indstillinger."}
                      </p>
                    </div>

                    {timingPreviewOverlap && (
                      <span
                        className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                          timingPreviewOverlap.level === "error"
                            ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                            : timingPreviewOverlap.level === "warning"
                              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200"
                              : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/35 dark:text-green-200"
                        }`}
                      >
                        {timingPreviewOverlap.message}
                      </span>
                    )}
                  </div>

                  {timingPreview.sourceMovieShowings.length > 0 && (
                    <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-700 dark:bg-gray-950/70 dark:text-gray-300">
                      Filmgrundlag:{" "}
                      {timingPreview.sourceMovieShowings
                        .slice(0, 4)
                        .map((showing) => showing.title)
                        .join(", ")}
                      {timingPreview.sourceMovieShowings.length > 4
                        ? ` og ${
                            timingPreview.sourceMovieShowings.length - 4
                          } flere`
                        : ""}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Forslaget udfylder start og slut automatisk. Du kan rette
                    tiderne manuelt, før vagten oprettes.
                  </p>
                </div>
              ) : timingPreviewError ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                  <p className="font-semibold">
                    Tiderne kunne ikke beregnes automatisk.
                  </p>
                  <p className="mt-1 text-xs">
                    {timingPreviewError} Indstil start og slut manuelt.
                  </p>
                </div>
              ) : null}
            </div>
          )}

        <div className="flex flex-wrap items-end justify-end gap-3 md:col-span-3">
          {!selectedShift && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl bg-gray-200 px-5 py-3 font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
            >
              Annuller
            </button>
          )}

          <button
            type="submit"
            disabled={
              !selectedShift &&
              jobFunctionId > 0 &&
              timingPreviewLoading
            }
            className="w-full rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 md:w-auto md:min-w-64"
          >
            {!selectedShift &&
            jobFunctionId > 0 &&
            timingPreviewLoading
              ? "Beregner tider..."
              : selectedShift
                ? "Gem ændringer"
                : "Opret vagt"}
          </button>
        </div>
      </form>

      {selectedShift && (
        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-600 px-5 py-2 text-white transition hover:bg-red-700"
          >
            Slet vagt
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-gray-200 px-5 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>

          {userId > 0 && activeTradeLabel ? (
            <span className="inline-flex items-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              {activeTradeLabel}
            </span>
          ) : userId > 0 ? (
            <button
              type="button"
              onClick={onOfferTrade}
              className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            >
              Send i byttepulje
            </button>
          ) : null}

          {onSendStaffingRequest && userId <= 0 && (
            <button
              type="button"
              onClick={onSendStaffingRequest}
              className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            >
              Send bemandingsforespørgsel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
