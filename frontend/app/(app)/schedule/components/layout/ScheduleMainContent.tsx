"use client";

import type { ComponentProps } from "react";
import { SchedulePageHeader } from "./ScheduleHeader";
import ScheduleLeaveOverview from "../leave/ScheduleLeaveOverview";
import ScheduleShiftsPanel from "../shifts/ScheduleShiftsPanel";

type ScheduleShiftsPanelProps = ComponentProps<typeof ScheduleShiftsPanel>;

type ScheduleMainContentProps = {
  ai: ScheduleShiftsPanelProps["ai"];
  shifts: ScheduleShiftsPanelProps["shifts"];
  users: ScheduleShiftsPanelProps["users"];
  selectedDate: string;
  canManageShifts: boolean;
  needsMasterCinemaSelection: boolean;
  leaveRequests: ComponentProps<typeof ScheduleLeaveOverview>["leaveRequests"];
  movieShowings: ScheduleShiftsPanelProps["movieShowings"];
  showRegisterTimeButton: boolean;
  onOpenRegisterTimeModal: () => void;
  onOpenManualTimeModal: () => void;
  onOpenCreateShift: ScheduleShiftsPanelProps["onOpenCreateShift"];
  onPreviousDay: ScheduleShiftsPanelProps["onPreviousDay"];
  onToday: ScheduleShiftsPanelProps["onToday"];
  onDateChange: ScheduleShiftsPanelProps["onDateChange"];
  onNextDay: ScheduleShiftsPanelProps["onNextDay"];
  onSelectShift: ScheduleShiftsPanelProps["onSelectShift"];
};

export default function ScheduleMainContent({
  ai,
  shifts,
  users,
  selectedDate,
  canManageShifts,
  needsMasterCinemaSelection,
  leaveRequests,
  movieShowings,
  showRegisterTimeButton,
  onOpenRegisterTimeModal,
  onOpenManualTimeModal,
  onOpenCreateShift,
  onPreviousDay,
  onToday,
  onDateChange,
  onNextDay,
  onSelectShift,
}: ScheduleMainContentProps) {
  return (
    <div className="mx-auto space-y-6">
      <SchedulePageHeader
        aiGenerateDaySchedule={ai?.generateAiDaySchedule}
        aiGeneratingDaySchedule={ai?.generatingAiSchedule ?? false}
        showRegisterTimeButton={showRegisterTimeButton}
        onOpenRegisterTimeModal={onOpenRegisterTimeModal}
        onOpenManualTimeModal={onOpenManualTimeModal}
        disableManualTimeModal={needsMasterCinemaSelection}
      />

      {canManageShifts && (
        <ScheduleLeaveOverview
          leaveRequests={leaveRequests}
          selectedDate={selectedDate}
        />
      )}

      <ScheduleShiftsPanel
        ai={ai}
        shifts={shifts}
        movieShowings={
          movieShowings
        }
        users={users}
        leaveRequests={leaveRequests}
        selectedDate={selectedDate}
        canManageShifts={canManageShifts}
        needsMasterCinemaSelection={needsMasterCinemaSelection}
        onOpenCreateShift={onOpenCreateShift}
        onPreviousDay={onPreviousDay}
        onToday={onToday}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onSelectShift={onSelectShift}
      />

    </div>
  );
}
