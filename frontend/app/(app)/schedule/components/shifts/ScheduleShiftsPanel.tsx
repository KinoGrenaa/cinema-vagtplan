"use client";
import Link from "next/link";

import { useMemo } from "react";
import type {
  LeaveRequest,
  Shift,
  User,
} from "../../../../../../shared/types";
import AiSuggestionsPanel from "../ai/AiSuggestionsPanel";
import ShiftTimeline from "./ShiftTimeline";
import type {
  MovieShowing,
} from "../movie-program/MovieProgram";
import type { useScheduleAi } from "../../hooks/ai/useScheduleAi";
import { ScheduleDateNavigation } from "../layout/ScheduleHeader";

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
  movieShowings: MovieShowing[];
  users: User[];
  leaveRequests: LeaveRequest[];
  selectedDate: string;
  canManageShifts: boolean;
  needsMasterCinemaSelection: boolean;
  onOpenCreateShift: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
  onDateChange: (
    date: string,
  ) => void;
  onNextDay: () => void;
  onSelectShift: (
    shift: Shift,
  ) => void;
};

export default function ScheduleShiftsPanel({
  ai,
  shifts,
  movieShowings,
  users,
  leaveRequests,
  selectedDate,
  canManageShifts,
  needsMasterCinemaSelection,
  onOpenCreateShift,
  onPreviousDay,
  onToday,
  onDateChange,
  onNextDay,
  onSelectShift,
}: ScheduleShiftsPanelProps) {
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

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Dagens vagter
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {canManageShifts
              ? "Klik på en vagt for at se eller redigere den"
              : "Se dagens vagtplan"}
          </p>
        </div>


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

      <div className="mt-4">
        {shifts.length > 0 ||
        movieShowings.length > 0 ? (
          <ShiftTimeline
            shifts={shifts}
            movieShowings={
              movieShowings
            }
            selectedDate={selectedDate}
            onSelectShift={
          canManageShifts
            ? onSelectShift
            : undefined
        }
            onOpenCreateShift={
              canManageShifts &&
              !needsMasterCinemaSelection
                ? onOpenCreateShift
                : undefined
            }
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/60">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Der er ingen planlagte vagter denne dag.
            </p>
            {canManageShifts &&
              !needsMasterCinemaSelection && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                  <button
                    type="button"
                    onClick={onOpenCreateShift}
                    className="inline-flex items-center gap-2 border-b border-gray-500 px-1 pb-1 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-500 dark:text-gray-200 dark:hover:border-gray-200 dark:hover:text-white"
                  >
                    <span aria-hidden="true">+</span>
                    Opret vagt
                  </button>
                  <Link
                    href="/shift-planning"
                    className="border-b border-gray-500 px-1 pb-1 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-500 dark:text-gray-200 dark:hover:border-gray-200 dark:hover:text-white"
                  >
                    Gå til vagtplanlægning
                  </Link>
                </div>
              )}
          </div>
        )}
      </div>
    </section>
  );
}
