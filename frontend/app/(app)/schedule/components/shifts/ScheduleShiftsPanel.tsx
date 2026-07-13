import type { Shift, User } from "../../../../../../shared/types";
import AiSuggestionsPanel from "../ai/AiSuggestionsPanel";
import ShiftTimeline from "./ShiftTimeline";
import type { useScheduleAi } from "../../../../hooks/useScheduleAi";
import { ScheduleDateNavigation } from "../layout/ScheduleHeader";

type AiScheduleData = ReturnType<typeof useScheduleAi>;

type ScheduleShiftsPanelProps = {
  ai: AiScheduleData | null;
  shifts: Shift[];
  users: User[];
  selectedDate: string;
  canManageShifts: boolean;
  needsMasterCinemaSelection: boolean;
  onOpenStaffingRequest: () => void;
  onOpenCreateShiftModal: () => void;
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
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dagens vagter</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {canManageShifts
              ? "Administrer, flyt og resize vagter"
              : "Se dagens vagtplan"}
          </p>
        </div>

        {canManageShifts && !needsMasterCinemaSelection && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenStaffingRequest}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              Send forespørgsel
            </button>
            <button
              type="button"
              onClick={onOpenCreateShiftModal}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Opret vagt
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
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
            autoCreatingEmergencyShift={ai.autoCreatingEmergencyShift}
            autoStaffingNotifications={ai.autoStaffingNotifications}
            suggestedEmergencyReplacements={ai.suggestedEmergencyReplacements}
            sendingEmergencyRequest={ai.sendingEmergencyRequest}
            autoEscalationQueue={ai.autoEscalationQueue}
            sendingRealStaffingMessage={ai.sendingRealStaffingMessage}
            staffingLoopStatus={ai.staffingLoopStatus}
            autonomousStaffingStatus={ai.autonomousStaffingStatus}
            createAiSuggestedShift={ai.createAiSuggestedShift}
            autoCreateEmergencyShift={ai.autoCreateEmergencyShift}
            startAutoEscalation={ai.startAutoEscalation}
            sendRealStaffingMessage={ai.sendRealStaffingMessage}
          />
        )}

        <ScheduleDateNavigation
          selectedDate={selectedDate}
          onPreviousDay={onPreviousDay}
          onToday={onToday}
          onDateChange={onDateChange}
          onNextDay={onNextDay}
        />

        <ShiftTimeline
          shifts={shifts}
          users={users}
          selectedDate={selectedDate}
          onSelectShift={canManageShifts ? onSelectShift : () => {}}
          onMoveShift={canManageShifts ? onMoveShift : () => {}}
          onChangeShiftUser={canManageShifts ? onChangeShiftUser : () => {}}
          onResizeShift={canManageShifts ? onResizeShift : () => {}}
        />
      </div>
    </div>
  );
}
