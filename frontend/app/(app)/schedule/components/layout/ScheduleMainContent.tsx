"use client";

import type { ComponentProps } from "react";
import MovieProgram from "../movie-program/MovieProgram";
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
  movieShowings: ComponentProps<typeof MovieProgram>["movieShowings"];
  onOpenRegisterTimeModal: () => void;
  onOpenManualTimeModal: () => void;
  onOpenStaffingRequest: ScheduleShiftsPanelProps["onOpenStaffingRequest"];
  onOpenCreateShiftModal: ScheduleShiftsPanelProps["onOpenCreateShiftModal"];
  onPreviousDay: ScheduleShiftsPanelProps["onPreviousDay"];
  onToday: ScheduleShiftsPanelProps["onToday"];
  onDateChange: ScheduleShiftsPanelProps["onDateChange"];
  onNextDay: ScheduleShiftsPanelProps["onNextDay"];
  onSelectShift: ScheduleShiftsPanelProps["onSelectShift"];
  onMoveShift: ScheduleShiftsPanelProps["onMoveShift"];
  onChangeShiftUser: ScheduleShiftsPanelProps["onChangeShiftUser"];
  onResizeShift: ScheduleShiftsPanelProps["onResizeShift"];
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
  onOpenRegisterTimeModal,
  onOpenManualTimeModal,
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
}: ScheduleMainContentProps) {
  return (
    <div className="mx-auto space-y-6">
      <SchedulePageHeader
        aiGenerateDaySchedule={ai?.generateAiDaySchedule}
        aiGeneratingDaySchedule={ai?.generatingAiSchedule ?? false}
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
        users={users}
        leaveRequests={leaveRequests}
        selectedDate={selectedDate}
        canManageShifts={canManageShifts}
        needsMasterCinemaSelection={needsMasterCinemaSelection}
        onOpenStaffingRequest={onOpenStaffingRequest}
        onOpenCreateShiftModal={onOpenCreateShiftModal}
        onPreviousDay={onPreviousDay}
        onToday={onToday}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onSelectShift={onSelectShift}
        onMoveShift={onMoveShift}
        onChangeShiftUser={onChangeShiftUser}
        onResizeShift={onResizeShift}
      />

      {!needsMasterCinemaSelection && (
        <MovieProgram
          movieShowings={movieShowings}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
