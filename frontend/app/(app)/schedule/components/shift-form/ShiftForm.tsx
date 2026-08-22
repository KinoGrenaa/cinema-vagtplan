import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import ProjectTimePicker from "@/app/components/date/ProjectTimePicker";
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
const SHIFT_TIME_ENTRY_LOCK_MESSAGE =
  "Vagten kan ikke ændres, fordi der findes en tidsregistrering.";

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

function getDatePart(
  value: string,
) {
  if (
    !value ||
    !value.includes("T")
  ) {
    return "";
  }

  return value.slice(
    0,
    10,
  );
}

function getTimePart(
  value: string,
) {
  if (
    !value ||
    !value.includes("T")
  ) {
    return "";
  }

  return value.slice(
    11,
    16,
  );
}

function combineDateAndTime(
  date: string,
  time: string,
) {
  if (
    !date ||
    !time
  ) {
    return "";
  }

  return (
    date +
    "T" +
    time
  );
}

function parseCalendarDate(
  value: string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    ),
  );
}

function addCalendarDays(
  value: string,
  days: number,
) {
  const date =
    parseCalendarDate(
      value,
    );

  if (!date) {
    return value;
  }

  date.setUTCDate(
    date.getUTCDate() +
      days,
  );

  const year =
    String(
      date.getUTCFullYear(),
    );

  const month =
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate(),
    ).padStart(2, "0");

  return (
    year +
    "-" +
    month +
    "-" +
    day
  );
}

function getCalendarDayOffset(
  startDate: string,
  endDate: string,
) {
  const start =
    parseCalendarDate(
      startDate,
    );

  const end =
    parseCalendarDate(
      endDate,
    );

  if (
    !start ||
    !end
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
        (
          24 *
          60 *
          60 *
          1000
        ),
    ),
  );
}

function moveDateTimeToDate(
  value: string,
  date: string,
) {
  return combineDateAndTime(
    date,
    getTimePart(
      value,
    ),
  );
}

function formatShiftDateLabel(
  value: string,
) {
  const date =
    parseCalendarDate(
      value,
    );

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "da-DK",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
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

function userHasJobFunction(
  user: any,
  jobFunctionId: number,
) {
  if (
    !user ||
    jobFunctionId <= 0 ||
    !Array.isArray(
      user.userJobFunctions,
    )
  ) {
    return false;
  }

  return user.userJobFunctions.some(
    (assignment: any) =>
      Number(
        assignment?.jobFunctionId,
      ) ===
      jobFunctionId,
  );
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
  const shiftLockedByTimeEntry = Boolean(
    selectedShift?.timeEntries?.length,
  );
  const activeTradeTargetName =
    `${activeTrade?.targetUser?.firstName ?? ""} ${activeTrade?.targetUser?.lastName ?? ""}`.trim();
  const activeTradeLabel = activeTrade
    ? activeTrade.type === "POOL"
      ? "I vagtpuljen"
      : `Direkte tilbud → ${activeTradeTargetName || "kollega"}`
    : null;
  const qualifiedUsers =
    useMemo(
      () => {
        if (
          jobFunctionId <= 0
        ) {
          return [];
        }

        return users.filter(
          (user) =>
            userHasJobFunction(
              user,
              jobFunctionId,
            ),
        );
      },
      [
        jobFunctionId,
        users,
      ],
    );

  const employeeOptions =
    useMemo(
      () => {
        if (
          jobFunctionId <= 0
        ) {
          return selectedShift
            ? users
            : [];
        }

        if (
          !selectedShift ||
          userId <= 0 ||
          qualifiedUsers.some(
            (user) =>
              user.id === userId,
          )
        ) {
          return qualifiedUsers;
        }

        const currentUser =
          users.find(
            (user) =>
              user.id === userId,
          );

        return currentUser
          ? [
              currentUser,
              ...qualifiedUsers,
            ]
          : qualifiedUsers;
      },
      [
        jobFunctionId,
        qualifiedUsers,
        selectedShift,
        userId,
        users,
      ],
    );

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showMoveDatePicker, setShowMoveDatePicker] = useState(false);

  useEffect(() => {
    setShowMoveDatePicker(
      false,
    );
  }, [selectedShift?.id]);

  const editingShiftDate =
    getDatePart(
      startTime,
    ) ||
    getDatePart(
      endTime,
    ) ||
    selectedDate;
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
      !timingPreview ||
      timingManuallyAdjusted
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
  }, [
    selectedShift,
    setEndTime,
    setStartTime,
    timingManuallyAdjusted,
    timingPreview,
  ]);

  function handleMoveShiftDate(
    nextDate: string,
  ) {
    if (
      shiftLockedByTimeEntry ||
      !selectedShift ||
      !nextDate
    ) {
      return;
    }

    const previousStartDate =
      getDatePart(
        startTime,
      );

    const previousEndDate =
      getDatePart(
        endTime,
      );

    const endDayOffset =
      getCalendarDayOffset(
        previousStartDate,
        previousEndDate,
      );

    setStartTime(
      moveDateTimeToDate(
        startTime,
        nextDate,
      ),
    );

    setEndTime(
      moveDateTimeToDate(
        endTime,
        addCalendarDays(
          nextDate,
          endDayOffset,
        ),
      ),
    );

    setShowMoveDatePicker(
      false,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (shiftLockedByTimeEntry) {
      event.preventDefault();
      return;
    }

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
            {shiftLockedByTimeEntry
              ? "Vis vagt"
              : selectedShift
                ? "Rediger vagt"
                : "Opret vagt"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vælg tidspunkt, medarbejder og jobfunktion for vagten.
          </p>
        </div>
      )}

      {shiftLockedByTimeEntry && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
          {SHIFT_TIME_ENTRY_LOCK_MESSAGE}
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
        {!selectedShift && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50 md:col-span-3">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Dato for vagten
            </div>

            <div className="mt-1 text-base font-bold capitalize text-gray-950 dark:text-white">
              {formatShiftDateLabel(
                selectedDate,
              )}
            </div>
          </div>
        )}

        {selectedShift && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50 md:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dato for vagten
                </div>

                <div className="mt-1 text-base font-bold capitalize text-gray-950 dark:text-white">
                  {formatShiftDateLabel(
                    editingShiftDate,
                  )}
                </div>
              </div>

              {!shiftLockedByTimeEntry &&
                !showMoveDatePicker && (
                <button
                  type="button"
                  onClick={() =>
                    setShowMoveDatePicker(
                      true,
                    )
                  }
                  className="self-start rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950 sm:self-auto"
                >
                  Flyt til anden dato
                </button>
              )}
            </div>

            {!shiftLockedByTimeEntry &&
              showMoveDatePicker && (
              <div className="mt-4 max-w-sm rounded-xl border border-blue-200 bg-white p-3 dark:border-blue-900 dark:bg-gray-900">
                <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {"V\u00e6lg ny dato"}
                </div>

                <ProjectDatePicker
                  value={editingShiftDate}
                  onChange={handleMoveShiftDate}
                  ariaLabel={
                    "V\u00e6lg ny dato for vagten"
                  }
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {"Flytningen gemmes f\u00f8rst, n\u00e5r du trykker Gem \u00e6ndringer."}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowMoveDatePicker(
                        false,
                      )
                    }
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>
            Jobfunktion
          </label>

          <select
            className={inputClass}
            value={jobFunctionId}
            onChange={(event) => {
              const nextJobFunctionId =
                Number(
                  event.target.value,
                );

              setJobFunctionId(
                nextJobFunctionId,
              );

              setTimingManuallyAdjusted(
                false,
              );

              if (
                nextJobFunctionId <= 0
              ) {
                setUserId(0);
                return;
              }

              if (
                userId > 0
              ) {
                const selectedUser =
                  users.find(
                    (user) =>
                      user.id === userId,
                  );

                if (
                  !userHasJobFunction(
                    selectedUser,
                    nextJobFunctionId,
                  )
                ) {
                  setUserId(0);
                }
              }
            }}
            disabled={
              Boolean(
                selectedShift,
              )
            }
          >
            <option value={0}>
              {"V\u00e6lg jobfunktion"}
            </option>

            {jobFunctions.map(
              (jobFunction) => (
                <option
                  key={
                    jobFunction.id
                  }
                  value={
                    jobFunction.id
                  }
                >
                  {
                    jobFunction.name
                  }
                </option>
              ),
            )}
          </select>

          {selectedShift &&
            !shiftLockedByTimeEntry && (
            <p
              className={
                helpTextClass
              }
            >
              {"Jobfunktionen kan ikke \u00e6ndres p\u00e5 en eksisterende vagt. Slet vagten og opret den korrekt i stedet."}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>
            Medarbejder
          </label>

          <select
            className={inputClass}
            value={userId}
            disabled={
              shiftLockedByTimeEntry ||
              (
                !selectedShift &&
                (
                  jobFunctionId <= 0 ||
                  timingPreviewLoading
                )
              )
            }
            onChange={(event) =>
              setUserId(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            <option value={0}>
              {jobFunctionId > 0
                ? "Ikke tildelt"
                : "V\u00e6lg jobfunktion f\u00f8rst"}
            </option>

            {employeeOptions.map(
              (user) => {
                const leaveConflict =
                  getUserLeaveConflict(
                    user.id,
                    leaveRequests,
                    startTime,
                    endTime,
                  );

                const hasApprovedLeave =
                  leaveConflict ===
                  "APPROVED";

                const hasPendingLeave =
                  leaveConflict ===
                  "PENDING";

                const isCurrentSelectedUser =
                  user.id ===
                  userId;

                const displayName =
                  getUserDisplayName(
                    user,
                  );

                return (
                  <option
                    key={user.id}
                    value={user.id}
                    disabled={
                      hasApprovedLeave &&
                      !isCurrentSelectedUser
                    }
                    className={
                      hasApprovedLeave
                        ? "text-gray-400"
                        : hasPendingLeave
                          ? "text-yellow-700"
                          : undefined
                    }
                  >
                    {displayName}
                    {hasApprovedLeave
                      ? " \u2014 godkendt fri"
                      : ""}
                    {hasPendingLeave
                      ? " \u2014 afventer frav\u00e6r"
                      : ""}
                  </option>
                );
              },
            )}
          </select>

          {!selectedShift &&
            jobFunctionId > 0 &&
            !timingPreviewLoading &&
            qualifiedUsers.length ===
              0 && (
              <p
                className={
                  helpTextClass
                }
              >
                Ingen aktive medarbejdere er kvalificeret til denne jobfunktion.
              </p>
            )}

          {selectedUserLeaveConflict ===
            "APPROVED" && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              Den valgte medarbejder har godkendt fri i dette tidsrum.
            </p>
          )}

          {selectedUserLeaveConflict ===
            "PENDING" && (
            <p className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
              {"Den valgte medarbejder har en afventende frav\u00e6rsans\u00f8gning i dette tidsrum."}
            </p>
          )}

          {leaveRequests.length >
            0 &&
            startTime &&
            endTime && (
              <p
                className={
                  helpTextClass
                }
              >
                {"Medarbejdere med godkendt fri markeres i listen og kan ikke v\u00e6lges."}
              </p>
            )}
        </div>

        <div>
          <label className={labelClass}>
            Start
          </label>

          <ProjectTimePicker
            value={
              getTimePart(
                startTime,
              )
            }
            disabled={
              shiftLockedByTimeEntry ||
              (
                !selectedShift &&
                (
                  jobFunctionId <= 0 ||
                  timingPreviewLoading
                )
              )
            }
            onChange={(nextTime) => {
              if (
                selectedShift
              ) {
                setStartTime(
                  combineDateAndTime(
                    getDatePart(
                      startTime,
                    ) ||
                      editingShiftDate,
                    nextTime,
                  ),
                );

                return;
              }

              setStartTime(
                combineDateAndTime(
                  selectedDate,
                  nextTime,
                ),
              );

              const currentEndTime =
                getTimePart(
                  endTime,
                );

              if (
                currentEndTime
              ) {
                const nextEndDate =
                  currentEndTime <
                  nextTime
                    ? addCalendarDays(
                        selectedDate,
                        1,
                      )
                    : selectedDate;

                setEndTime(
                  combineDateAndTime(
                    nextEndDate,
                    currentEndTime,
                  ),
                );
              }

              if (
                timingPreview
              ) {
                setTimingManuallyAdjusted(
                  true,
                );
              }
            }}
            ariaLabel={
              "V\u00e6lg starttid"
            }
          />
        </div>

        <div>
          <label className={labelClass}>
            Slut
          </label>

          <ProjectTimePicker
            value={
              getTimePart(
                endTime,
              )
            }
            disabled={
              shiftLockedByTimeEntry ||
              (
                !selectedShift &&
                (
                  jobFunctionId <= 0 ||
                  timingPreviewLoading
                )
              )
            }
            onChange={(nextTime) => {
              if (
                selectedShift
              ) {
                setEndTime(
                  combineDateAndTime(
                    getDatePart(
                      endTime,
                    ) ||
                      editingShiftDate,
                    nextTime,
                  ),
                );

                return;
              }

              const currentStartTime =
                getTimePart(
                  startTime,
                );

              const nextEndDate =
                currentStartTime &&
                nextTime <
                  currentStartTime
                  ? addCalendarDays(
                      selectedDate,
                      1,
                    )
                  : selectedDate;

              setEndTime(
                combineDateAndTime(
                  nextEndDate,
                  nextTime,
                ),
              );

              if (
                timingPreview
              ) {
                setTimingManuallyAdjusted(
                  true,
                );
              }
            }}
            ariaLabel={
              "V\u00e6lg sluttid"
            }
          />
        </div>

        <div>
          <label className={labelClass}>
            Note
          </label>

          <input
            className={inputClass}
            value={note}
            disabled={shiftLockedByTimeEntry}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            placeholder="Fx aftenvagt"
          />
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
              shiftLockedByTimeEntry ||
              (
                !selectedShift &&
                jobFunctionId > 0 &&
                timingPreviewLoading
              )
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
          {!shiftLockedByTimeEntry && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl bg-red-600 px-5 py-2 text-white transition hover:bg-red-700"
            >
              Slet vagt
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-gray-200 px-5 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            {shiftLockedByTimeEntry ? "Luk" : "Annuller"}
          </button>

          {!shiftLockedByTimeEntry &&
          (userId > 0 && activeTradeLabel ? (
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
          ) : null)}
          {!shiftLockedByTimeEntry &&
            onSendStaffingRequest &&
            userId <= 0 && (
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
