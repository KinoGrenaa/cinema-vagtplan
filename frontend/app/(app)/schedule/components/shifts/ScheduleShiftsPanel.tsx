"use client";

import {
  toast,
} from "sonner";

import { useEffect, useMemo, useState } from "react";
import type {
  LeaveRequest,
  Shift,
  User,
} from "../../../../../../shared/types";
import AiSuggestionsPanel from "../ai/AiSuggestionsPanel";
import ShiftTimeline from "./ShiftTimeline";
import type { useScheduleAi } from "../../hooks/ai/useScheduleAi";
import { ScheduleDateNavigation } from "../layout/ScheduleHeader";
import {
  useScheduleJobFunctions,
  type ScheduleJobFunction,
} from "../../hooks/data/useScheduleJobFunctions";
import {
  useScheduleJobFunctionTimingPreview,
} from "../../hooks/data/useScheduleJobFunctionTimingPreview";
import {
  buildUnassignedJobFunctionShift,
  buildUnassignedJobFunctionShiftFromTimingPreview,
  formatJobFunctionShiftDuration,
  formatJobFunctionTimingPreviewRange,
  getJobFunctionShiftDurationMinutes,
  getJobFunctionTimingPreviewOverlap,
} from "../../helpers/derived/scheduleJobFunctionShift";

type AiScheduleData = ReturnType<typeof useScheduleAi>;

type ScheduleLeaveRequest = LeaveRequest & {
  userId?: number | null;
  user?: {
    id?: number | null;
    firstName?: string;
    lastName?: string;
  } | null;
};

type ScheduleShift = Shift & {
  userId?: number | null;
  user?: {
    id?: number | null;
    firstName?: string;
    lastName?: string;
  } | null;
  jobFunction?: {
    name?: string;
  } | null;
};

type ScheduleLeaveConflict = {
  shiftId: number;
  employeeName: string;
  jobFunctionName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  leaveStartTime: string;
  leaveEndTime: string;
};

function getLeaveUserId(
  request: ScheduleLeaveRequest,
) {
  return (
    request.userId ??
    request.user?.id ??
    null
  );
}

function getShiftUserId(
  shift: ScheduleShift,
) {
  return (
    shift.userId ??
    shift.user?.id ??
    null
  );
}

function periodsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  const firstStartTime =
    new Date(firstStart).getTime();
  const firstEndTime =
    new Date(firstEnd).getTime();
  const secondStartTime =
    new Date(secondStart).getTime();
  const secondEndTime =
    new Date(secondEnd).getTime();

  if (
    [
      firstStartTime,
      firstEndTime,
      secondStartTime,
      secondEndTime,
    ].some(Number.isNaN)
  ) {
    return false;
  }

  return (
    firstStartTime < secondEndTime &&
    firstEndTime > secondStartTime
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(
    "da-DK",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getEmployeeName(
  shift: ScheduleShift,
  users: User[],
  userId: number,
) {
  const shiftName =
    `${shift.user?.firstName ?? ""} ${
      shift.user?.lastName ?? ""
    }`.trim();

  if (shiftName) {
    return shiftName;
  }

  const user = users.find(
    (item) => item.id === userId,
  );
  const userName =
    `${user?.firstName ?? ""} ${
      user?.lastName ?? ""
    }`.trim();

  return (
    userName ||
    `Medarbejder #${userId}`
  );
}

function getJobFunctionName(
  shift: ScheduleShift,
) {
  return (
    shift.jobFunction?.name ??
    "Vagt"
  );
}

function getApprovedLeaveConflicts(
  shifts: Shift[],
  leaveRequests: LeaveRequest[],
  users: User[],
): ScheduleLeaveConflict[] {
  const approvedLeaveRequests =
    leaveRequests.filter(
      (request) =>
        request.status === "APPROVED",
    ) as ScheduleLeaveRequest[];

  return shifts.flatMap((shift) => {
    const scheduleShift =
      shift as ScheduleShift;
    const userId =
      getShiftUserId(scheduleShift);

    if (!userId) {
      return [];
    }

    const leaveRequest =
      approvedLeaveRequests.find(
        (request) =>
          getLeaveUserId(request) ===
            userId &&
          periodsOverlap(
            shift.startTime,
            shift.endTime,
            request.startDate,
            request.endDate,
          ),
      );

    if (!leaveRequest) {
      return [];
    }

    return [
      {
        shiftId: shift.id,
        employeeName:
          getEmployeeName(
            scheduleShift,
            users,
            userId,
          ),
        jobFunctionName:
          getJobFunctionName(
            scheduleShift,
          ),
        shiftStartTime:
          shift.startTime,
        shiftEndTime: shift.endTime,
        leaveStartTime:
          leaveRequest.startDate,
        leaveEndTime:
          leaveRequest.endDate,
      },
    ];
  });
}

type ScheduleShiftsPanelProps = {
  ai: AiScheduleData | null;
  shifts: Shift[];
  users: User[];
  leaveRequests: LeaveRequest[];
  selectedDate: string;
  canManageShifts: boolean;
  needsMasterCinemaSelection: boolean;
  onOpenStaffingRequest: () => void;
  onCreateUnassignedShift: (
    input: {
      startTime: string;
      endTime: string;
      note: string;
      userId: null;
      jobFunctionId: number;
    },
  ) => Promise<void>;
  onPreviousDay: () => void;
  onToday: () => void;
  onDateChange: (
    date: string,
  ) => void;
  onNextDay: () => void;
  onSelectShift: (
    shift: Shift,
  ) => void;
  onMoveShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) => void | Promise<void>;
  onChangeShiftUser: (
    shift: Shift,
    newUserId: number | null,
  ) => void | Promise<void>;
  onResizeShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) => void | Promise<void>;
};

function getJobFunctionId(jobFunction: ScheduleJobFunction) {
  return Number.isInteger(jobFunction.id) && jobFunction.id > 0
    ? jobFunction.id
    : null;
}

export default function ScheduleShiftsPanel({
  ai,
  shifts,
  users,
  leaveRequests,
  selectedDate,
  canManageShifts,
  needsMasterCinemaSelection,
  onOpenStaffingRequest,
  onCreateUnassignedShift,
  onPreviousDay,
  onToday,
  onDateChange,
  onNextDay,
  onSelectShift,
  onMoveShift,
  onChangeShiftUser,
  onResizeShift,
}: ScheduleShiftsPanelProps) {
  const {
    jobFunctions,
    loading: jobFunctionsLoading,
    error: jobFunctionsError,
  } = useScheduleJobFunctions(
    canManageShifts &&
      !needsMasterCinemaSelection,
  );
  const [
    selectedJobFunctionSelectionId,
    setSelectedJobFunctionSelectionId,
  ] = useState(0);
  const [
    isPlacingJobFunction,
    setIsPlacingJobFunction,
  ] = useState(false);
  const [
    isCreatingJobFunctionShift,
    setIsCreatingJobFunctionShift,
  ] = useState(false);
  const [
    placementError,
    setPlacementError,
  ] = useState<string | null>(
    null,
  );

  const approvedLeaveConflicts =
    useMemo(
      () =>
        getApprovedLeaveConflicts(
          shifts,
          leaveRequests,
          users,
        ),
      [
        leaveRequests,
        shifts,
        users,
      ],
    );

  const availableJobFunctions =
    useMemo(
      () =>
        jobFunctions.filter(
          (jobFunction) =>
            jobFunction.isActive && getJobFunctionId(jobFunction) !== null,
        ),
      [jobFunctions],
    );

  const selectedJobFunction =
    useMemo(
      () =>
        availableJobFunctions.find(
          (jobFunction) =>
            jobFunction.id ===
            selectedJobFunctionSelectionId,
        ) ?? null,
      [
        availableJobFunctions,
        selectedJobFunctionSelectionId,
      ],
    );

  const selectedJobFunctionId =
    selectedJobFunction
      ? getJobFunctionId(
          selectedJobFunction,
        )
      : null;
  const selectedDurationMinutes =
    selectedJobFunction
      ? getJobFunctionShiftDurationMinutes(
          selectedJobFunction,
        )
      : null;
  const {
    preview: timingPreview,
    loading:
      timingPreviewLoading,
    error: timingPreviewError,
  } =
    useScheduleJobFunctionTimingPreview({
      enabled:
        canManageShifts &&
        !needsMasterCinemaSelection,
      selectedDate,
      jobFunctionId:
        selectedJobFunctionId,
    });
  const timingPreviewOverlap =
    useMemo(
      () =>
        timingPreview &&
        selectedJobFunctionId
          ? getJobFunctionTimingPreviewOverlap(
              timingPreview,
              shifts,
              selectedJobFunctionId,
            )
          : null,
      [
        selectedJobFunctionId,
        shifts,
        timingPreview,
      ],
    );



  useEffect(() => {
    if (
      selectedJobFunctionSelectionId > 0 &&
      availableJobFunctions.some(
        (jobFunction) =>
          jobFunction.id ===
          selectedJobFunctionSelectionId,
      )
    ) {
      return;
    }

    setSelectedJobFunctionSelectionId(
      availableJobFunctions[0]
        ?.id ?? 0,
    );
    setIsPlacingJobFunction(false);
  }, [
    availableJobFunctions,
    selectedJobFunctionSelectionId,
  ]);

  useEffect(() => {
    setIsPlacingJobFunction(false);
  }, [selectedDate]);

  function handleToggleJobFunctionPlacement() {
    if (!selectedJobFunctionId) {
      return;
    }

    setIsPlacingJobFunction(
      (current) => !current,
    );
  }

  async function handleCreateFromTimingRule() {
    if (
      !selectedJobFunctionId ||
      !selectedJobFunction ||
      !timingPreview ||
      isCreatingJobFunctionShift
    ) {
      return;
    }

    setPlacementError(null);
    setIsCreatingJobFunctionShift(
      true,
    );

    try {
      await onCreateUnassignedShift(
        buildUnassignedJobFunctionShiftFromTimingPreview({
          preview:
            timingPreview,
          jobFunctionId:
            selectedJobFunctionId,
        }),
      );
      setIsPlacingJobFunction(
        false,
      );
      toast.success(
        `${selectedJobFunction.name} er oprettet som untildelt vagt`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vagten kunne ikke oprettes.";

      setPlacementError(message);
      toast.error(
        "Vagten kunne ikke oprettes",
      );
    } finally {
      setIsCreatingJobFunctionShift(
        false,
      );
    }
  }

  async function handleCreateAtTime(
    hour: number,
    minute: number,
  ) {
    if (
      !selectedJobFunctionId ||
      !selectedJobFunction ||
      isCreatingJobFunctionShift
    ) {
      return;
    }

    setPlacementError(null);
    setIsCreatingJobFunctionShift(
      true,
    );

    try {
      await onCreateUnassignedShift(
        buildUnassignedJobFunctionShift({
          selectedDate,
          startMinutes:
            hour * 60 + minute,
          jobFunctionId:
            selectedJobFunctionId,
          jobFunction:
            selectedJobFunction,
        }),
      );

      setIsPlacingJobFunction(
        false,
      );
      toast.success(
        `${selectedJobFunction.name} er oprettet som untildelt vagt`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vagten kunne ikke oprettes.";

      setPlacementError(message);
      toast.error(
        "Vagten kunne ikke oprettes",
      );
    } finally {
      setIsCreatingJobFunctionShift(
        false,
      );
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Dagens vagter
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {canManageShifts
              ? "Administrer, flyt og resize vagter"
              : "Se dagens vagtplan"}
          </p>
        </div>

        {canManageShifts &&
          !needsMasterCinemaSelection && (
            <button
              type="button"
              onClick={
                onOpenStaffingRequest
              }
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
            >
              Send forespørgsel
            </button>
          )}
      </div>

      <ScheduleDateNavigation
        selectedDate={selectedDate}
        onPreviousDay={
          onPreviousDay
        }
        onToday={onToday}
        onDateChange={
          onDateChange
        }
        onNextDay={onNextDay}
      />

      {canManageShifts &&
        approvedLeaveConflicts.length >
          0 && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Vagter med godkendt
                fravær
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Disse vagter er
                bevidste undtagelser
                eller kræver
                opfølgning. Godkendt
                fravær ændres ikke
                automatisk.
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {approvedLeaveConflicts.map(
                (conflict) => (
                  <button
                    key={
                      conflict.shiftId
                    }
                    type="button"
                    onClick={() => {
                      const shift =
                        shifts.find(
                          (item) =>
                            item.id ===
                            conflict.shiftId,
                        );

                      if (shift) {
                        onSelectShift(
                          shift,
                        );
                      }
                    }}
                    className="block w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-amber-100 dark:border-amber-900 dark:bg-gray-950 dark:hover:bg-amber-950/50"
                  >
                    <span className="font-bold text-gray-950 dark:text-white">
                      {
                        conflict.employeeName
                      }
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {" · "}
                      {
                        conflict.jobFunctionName
                      }
                      {" · "}
                      {formatDateTime(
                        conflict.shiftStartTime,
                      )}
                      {" – "}
                      {formatDateTime(
                        conflict.shiftEndTime,
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Fravær:{" "}
                      {formatDateTime(
                        conflict.leaveStartTime,
                      )}
                      {" – "}
                      {formatDateTime(
                        conflict.leaveEndTime,
                      )}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}

      {ai && (
        <AiSuggestionsPanel
          shifts={shifts}
          staffingWarnings={
            ai.staffingWarnings
          }
          staffingSuggestions={
            ai.staffingSuggestions
          }
          recommendedEmployees={
            ai.recommendedEmployees
          }
          aiScheduleSuggestions={
            ai.aiScheduleSuggestions
          }
          creatingAiShift={
            ai.creatingAiShift
          }
          liveStaffingAlerts={
            ai.liveStaffingAlerts
          }
          emergencyAiActions={
            ai.emergencyAiActions
          }
          autoCreatingEmergencyShift={
            ai.autoCreatingEmergencyShift
          }
          autoStaffingNotifications={
            ai.autoStaffingNotifications
          }
          suggestedEmergencyReplacements={
            ai.suggestedEmergencyReplacements
          }
          sendingEmergencyRequest={
            ai.sendingEmergencyRequest
          }
          autoEscalationQueue={
            ai.autoEscalationQueue
          }
          sendingRealStaffingMessage={
            ai.sendingRealStaffingMessage
          }
          staffingLoopStatus={
            ai.staffingLoopStatus
          }
          autonomousStaffingStatus={
            ai.autonomousStaffingStatus
          }
          createAiSuggestedShift={
            ai.createAiSuggestedShift
          }
          autoCreateEmergencyShift={
            ai.autoCreateEmergencyShift
          }
          startAutoEscalation={
            ai.startAutoEscalation
          }
          sendRealStaffingMessage={
            ai.sendRealStaffingMessage
          }
        />
      )}

      <div className="mt-4 space-y-3">
        {canManageShifts &&
          !needsMasterCinemaSelection && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900 dark:bg-blue-950/25">
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
                    Opret untildelt vagt
                  </p>
                  <p className="mt-1 max-w-3xl text-xs text-blue-800 dark:text-blue-200">
                    Vælg den vagt, du vil oprette. Tiderne beregnes automatisk
                    ud fra dagens filmprogram.
                  </p>
                </div>
                <label className="block max-w-xl">
                  <span className="mb-1 block text-xs font-semibold text-blue-950 dark:text-blue-100">
                    Jobfunktion
                  </span>
                <select
                  value={
                    selectedJobFunctionSelectionId
                  }
                  onChange={(event) => {
                    setSelectedJobFunctionSelectionId(
                      Number(
                        event.target.value,
                      ),
                    );
                    setIsPlacingJobFunction(
                      false,
                    );
                    setPlacementError(
                      null,
                    );
                  }}
                  disabled={
                    jobFunctionsLoading ||
                    availableJobFunctions.length ===
                      0
                  }
                  className="min-w-64 rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-gray-950 dark:text-white"
                  aria-label="Vælg jobfunktion til automatisk beregning"
                >
                  {jobFunctionsLoading && (
                    <option value={0}>
                      Henter jobfunktioner...
                    </option>
                  )}
                  {!jobFunctionsLoading &&
                    availableJobFunctions.length ===
                      0 && (
                      <option value={0}>
                        Ingen jobfunktioner kan tilføjes
                      </option>
                    )}
                  {availableJobFunctions.map(
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
                </label>
              </div>

              {jobFunctionsError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                >
                  Jobfunktionerne kunne ikke hentes:{" "}
                  {jobFunctionsError}
                </p>
              )}

              {selectedJobFunction && (
                <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-900 dark:bg-gray-950">
                  {timingPreviewLoading ? (
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Beregner vagtens mødetid og fyraften...
                    </p>
                  ) : timingPreview ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                            Beregnet vagt
                          </p>
                          <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
                            {formatJobFunctionTimingPreviewRange(
                              timingPreview,
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {timingPreview.usedFallback
                              ? "Der var ingen relevante filmvisninger, så vagtens standardtider bruges."
                              : timingPreview.sourceMovieShowings.length >
                                  0
                                ? `Baseret på ${timingPreview.sourceMovieShowings.length} ${timingPreview.sourceMovieShowings.length === 1 ? "filmvisning" : "filmvisninger"}.`
                                : "Tiderne følger vagtens faste indstillinger."}
                          </p>
                        </div>
                        {timingPreviewOverlap && (
                          <span
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              timingPreviewOverlap.level ===
                              "error"
                                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                                : timingPreviewOverlap.level ===
                                    "warning"
                                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200"
                                  : "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/35 dark:text-green-200"
                            }`}
                          >
                            {
                              timingPreviewOverlap.message
                            }
                          </span>
                        )}
                      </div>

                      {timingPreview.sourceMovieShowings.length >
                        0 && (
                        <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          Filmgrundlag:{" "}
                          {timingPreview.sourceMovieShowings
                            .slice(0, 4)
                            .map(
                              (showing) =>
                                showing.title,
                            )
                            .join(", ")}
                          {timingPreview.sourceMovieShowings.length >
                          4
                            ? ` og ${timingPreview.sourceMovieShowings.length - 4} flere`
                            : ""}
                        </p>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          onClick={
                            handleCreateFromTimingRule
                          }
                          disabled={
                            isCreatingJobFunctionShift
                          }
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          {isCreatingJobFunctionShift
                            ? "Opretter..."
                            : "Opret untildelt vagt"}
                        </button>
                        <button
                          type="button"
                          onClick={
                            handleToggleJobFunctionPlacement
                          }
                          disabled={
                            isCreatingJobFunctionShift
                          }
                          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
                        >
                          {isPlacingJobFunction
                            ? "Annuller manuel placering"
                            : "Placér manuelt i stedet"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p
                        role="alert"
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
                      >
                        {timingPreviewError ||
                          "Vagtens tider kunne ikke beregnes."}
                      </p>
                      <button
                        type="button"
                        onClick={
                          handleToggleJobFunctionPlacement
                        }
                        disabled={
                          isCreatingJobFunctionShift
                        }
                        className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
                      >
                        {isPlacingJobFunction
                          ? "Annuller manuel placering"
                          : "Placér manuelt som undtagelse"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isPlacingJobFunction &&
                selectedJobFunction && (
                  <p className="mt-3 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-950 dark:bg-blue-950/60 dark:text-blue-100">
                    Manuel undtagelse: Klik på et tomt tidspunkt i tidslinjen for
                    at oprette {selectedJobFunction.name}. Starttiden snapper til
                    nærmeste kvarter
                    {selectedDurationMinutes
                      ? ` · Varighed: ${formatJobFunctionShiftDuration(
                          selectedDurationMinutes,
                        )}`
                      : ""}.
                  </p>
                )}

              {placementError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-950 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100"
                >
                  {placementError}
                </p>
              )}
            </div>
          )}
        <ShiftTimeline
          shifts={shifts}
          users={users}
          selectedDate={selectedDate}
          createAtTimeLabel={
            isPlacingJobFunction
              ? selectedJobFunction?.name ??
                null
              : null
          }
        createDurationMinutes={
          isPlacingJobFunction
            ? selectedDurationMinutes
            : null
        }
        createJobFunctionId={
          isPlacingJobFunction
            ? selectedJobFunctionId
            : null
        }
        createPreviewColor={
          isPlacingJobFunction
            ? selectedJobFunction
                ?.color ?? null
            : null
        }
        onCreateAtTime={
            isPlacingJobFunction &&
          !isCreatingJobFunctionShift
            ? handleCreateAtTime
            : undefined
          }
          onSelectShift={
            canManageShifts
              ? onSelectShift
              : () => {}
          }
          onMoveShift={
            canManageShifts
              ? onMoveShift
              : () => {}
          }
          onChangeShiftUser={
            canManageShifts
              ? onChangeShiftUser
              : () => {}
          }
          onResizeShift={
            canManageShifts
              ? onResizeShift
              : () => {}
          }
        />
      </div>
    </section>
  );
}
