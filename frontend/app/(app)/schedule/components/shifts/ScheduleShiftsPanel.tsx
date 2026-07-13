"use client";

import { useEffect, useMemo, useState } from "react";
import type { Shift, User } from "../../../../../../shared/types";
import AiSuggestionsPanel from "../ai/AiSuggestionsPanel";
import ShiftTimeline from "./ShiftTimeline";
import type { useScheduleAi } from "../../hooks/ai/useScheduleAi";
import { ScheduleDateNavigation } from "../layout/ScheduleHeader";
import {
  useScheduleJobFunctions,
  type ScheduleJobFunction,
} from "../../hooks/data/useScheduleJobFunctions";

type AiScheduleData = ReturnType<typeof useScheduleAi>;

type ScheduleShiftsPanelProps = {
  ai: AiScheduleData | null;
  shifts: Shift[];
  users: User[];
  selectedDate: string;
  canManageShifts: boolean;
  needsMasterCinemaSelection: boolean;
  onOpenStaffingRequest: () => void;
  onOpenCreateShiftModal: (workTypeId?: number) => void;
  onPreviousDay: () => void;
  onToday: () => void;
  onDateChange: (date: string) => void;
  onNextDay: () => void;
  onSelectShift: (shift: Shift) => void;
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

function getWorkTypeId(jobFunction: ScheduleJobFunction) {
  const workTypeId =
    jobFunction.workTypeId ?? jobFunction.workType?.id ?? null;

  return typeof workTypeId === "number" && workTypeId > 0
    ? workTypeId
    : null;
}

export default function ScheduleShiftsPanel({
  ai,
  shifts,
  users,
  selectedDate,
  canManageShifts,
  needsMasterCinemaSelection,
  onOpenStaffingRequest,
  onOpenCreateShiftModal,
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
    canManageShifts && !needsMasterCinemaSelection,
  );
  const [selectedJobFunctionId, setSelectedJobFunctionId] =
    useState(0);

  const availableJobFunctions = useMemo(
    () =>
      jobFunctions.filter(
        (jobFunction) =>
          jobFunction.isActive &&
          jobFunction.workType?.isActive !== false &&
          getWorkTypeId(jobFunction) !== null,
      ),
    [jobFunctions],
  );

  const missingWorkTypeCount = useMemo(
    () =>
      jobFunctions.filter(
        (jobFunction) =>
          jobFunction.isActive &&
          getWorkTypeId(jobFunction) === null,
      ).length,
    [jobFunctions],
  );

  useEffect(() => {
    if (
      selectedJobFunctionId > 0 &&
      availableJobFunctions.some(
        (jobFunction) =>
          jobFunction.id === selectedJobFunctionId,
      )
    ) {
      return;
    }

    setSelectedJobFunctionId(
      availableJobFunctions[0]?.id ?? 0,
    );
  }, [availableJobFunctions, selectedJobFunctionId]);

  function handleAddJobFunction() {
    const jobFunction = availableJobFunctions.find(
      (item) => item.id === selectedJobFunctionId,
    );
    const workTypeId = jobFunction
      ? getWorkTypeId(jobFunction)
      : null;

    if (!workTypeId) {
      return;
    }

    onOpenCreateShiftModal(workTypeId);
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

        {canManageShifts && !needsMasterCinemaSelection && (
          <button
            type="button"
            onClick={onOpenStaffingRequest}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Send forespørgsel
          </button>
        )}
      </div>

      <ScheduleDateNavigation
        selectedDate={selectedDate}
        onPreviousDay={onPreviousDay}
        onToday={onToday}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
      />

      {canManageShifts && !needsMasterCinemaSelection && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
                Tilføj jobfunktion
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                Åbner en untildelt vagt med jobfunktionens
                løntype forudvalgt. Tidspunktet kan justeres,
                før vagten oprettes.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <select
                value={selectedJobFunctionId}
                onChange={(event) =>
                  setSelectedJobFunctionId(
                    Number(event.target.value),
                  )
                }
                disabled={
                  jobFunctionsLoading ||
                  availableJobFunctions.length === 0
                }
                className="min-w-56 rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-gray-950 dark:text-white"
                aria-label="Vælg jobfunktion"
              >
                {jobFunctionsLoading && (
                  <option value={0}>
                    Henter jobfunktioner...
                  </option>
                )}
                {!jobFunctionsLoading &&
                  availableJobFunctions.length === 0 && (
                    <option value={0}>
                      Ingen jobfunktioner kan tilføjes
                    </option>
                  )}
                {availableJobFunctions.map((jobFunction) => (
                  <option
                    key={jobFunction.id}
                    value={jobFunction.id}
                  >
                    {jobFunction.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddJobFunction}
                disabled={
                  jobFunctionsLoading ||
                  selectedJobFunctionId <= 0
                }
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Tilføj på tidslinjen
              </button>
            </div>
          </div>

          {missingWorkTypeCount > 0 && (
            <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">
              {missingWorkTypeCount === 1
                ? "1 aktiv jobfunktion mangler Oprettes som og kan derfor ikke tilføjes."
                : `${missingWorkTypeCount} aktive jobfunktioner mangler Oprettes som og kan derfor ikke tilføjes.`}
            </p>
          )}

          {jobFunctionsError && (
            <p className="mt-3 text-xs font-medium text-red-700 dark:text-red-300">
              Jobfunktionerne kunne ikke hentes:{" "}
              {jobFunctionsError}
            </p>
          )}
        </div>
      )}

      {ai && (
        <AiSuggestionsPanel
          shifts={shifts}
          staffingWarnings={ai.staffingWarnings}
          staffingSuggestions={ai.staffingSuggestions}
          recommendedEmployees={ai.recommendedEmployees}
          aiScheduleSuggestions={ai.aiScheduleSuggestions}
          creatingAiShift={ai.creatingAiShift}
          liveStaffingAlerts={ai.liveStaffingAlerts}
          emergencyAiActions={ai.emergencyAiActions}
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
          autoEscalationQueue={ai.autoEscalationQueue}
          sendingRealStaffingMessage={
            ai.sendingRealStaffingMessage
          }
          staffingLoopStatus={ai.staffingLoopStatus}
          autonomousStaffingStatus={
            ai.autonomousStaffingStatus
          }
          createAiSuggestedShift={
            ai.createAiSuggestedShift
          }
          autoCreateEmergencyShift={
            ai.autoCreateEmergencyShift
          }
          startAutoEscalation={ai.startAutoEscalation}
          sendRealStaffingMessage={
            ai.sendRealStaffingMessage
          }
        />
      )}

      <ShiftTimeline
        shifts={shifts}
        users={users}
        selectedDate={selectedDate}
        onSelectShift={
          canManageShifts ? onSelectShift : () => {}
        }
        onMoveShift={
          canManageShifts ? onMoveShift : () => {}
        }
        onChangeShiftUser={
          canManageShifts ? onChangeShiftUser : () => {}
        }
        onResizeShift={
          canManageShifts ? onResizeShift : () => {}
        }
      />
    </section>
  );
}
