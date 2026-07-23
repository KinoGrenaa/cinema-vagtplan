import { useState, type FormEvent } from "react";

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
  workTypes: any[];
  leaveRequests?: LeaveRequest[];
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  userId: number;
  setUserId: (value: number) => void;
  workTypeId: number;
  setWorkTypeId: (value: number) => void;
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
  workTypeId,
  selectedUserLeaveConflict,
}: {
  startTime: string;
  endTime: string;
  userId: number;
  workTypeId: number;
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

  if (!workTypeId || workTypeId <= 0) {
    errors.push("Arbejdstype skal vælges.");
  }

  if (userId > 0 && selectedUserLeaveConflict === "APPROVED") {
    errors.push("Den valgte medarbejder har godkendt fri i dette tidsrum.");
  }

  return errors;
}

export default function ShiftForm({
  users,
  workTypes,
  leaveRequests = [],
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  note,
  setNote,
  userId,
  setUserId,
  workTypeId,
  setWorkTypeId,
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateShiftForm({
      startTime,
      endTime,
      userId,
      workTypeId,
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
            Vælg tidspunkt, medarbejder og arbejdstype for vagten.
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
              onChange={(e) => setStartTime(e.target.value)}
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
              onChange={(e) => setEndTime(e.target.value)}
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
          <label className={labelClass}>Arbejdstype</label>
          <select
            className={inputClass}
            value={workTypeId}
            onChange={(e) => setWorkTypeId(Number(e.target.value))}
          >
            <option value={0}>Vælg vagttype</option>

            {workTypes.map((workType) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {selectedShift ? "Gem ændringer" : "Opret vagt"}
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

          {selectedShift.userId && selectedShift.userId > 0 && (
            <button
              type="button"
              onClick={onOfferTrade}
              className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            >
              Send i byttepulje
            </button>
          )}

          {onSendStaffingRequest && (
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
