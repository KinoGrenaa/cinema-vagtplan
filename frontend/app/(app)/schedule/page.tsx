"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import StaffingRequestModal from "./components/staffing/StaffingRequestModal";
import {
  ManualTimeRegistrationModal,
  TimeRegistrationModal,
} from "./components/time-registration/TimeRegistrationModals";
import ScheduleShiftFormModal from "./components/shift-form/ScheduleShiftFormModal";
import ScheduleMainContent from "./components/layout/ScheduleMainContent";
import { useScheduleShiftForm } from "./hooks/state/useScheduleShiftForm";
import { useScheduleShiftTimelineActions } from "./hooks/actions/useScheduleShiftTimelineActions";
import { useScheduleStaffingRequest } from "./hooks/actions/useScheduleStaffingRequest";
import { useScheduleTimeRegistration } from "./hooks/actions/useScheduleTimeRegistration";
import { useSchedule } from "../../hooks/useSchedule";
import AiScheduleFeatures from "./components/ai/AiScheduleFeatures";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalDateString,
  getTodayLocalDate,
} from "@/app/utils/dateTime";
import {
  getStaffingShiftOptionText,
  getUserDisplayName,
} from "./helpers/text/scheduleShiftText";
import { getMovieShowingsForDate } from "./helpers/derived/scheduleDerivedData";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

export default function SchedulePage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  const todayDefault = getTodayLocalDate();
  const [selectedDate, setSelectedDate] = useState(todayDefault);
  const scheduleDateQueryApplied = useRef(false);

  const {
    user: currentUser,
    loading,
    canManageShifts,
    needsMasterCinemaSelection,
    shifts,
    users,
    workTypes,
    movieShowings,
    leaveRequests,
    refreshDayData,
    createShift,
    updateShift,
    deleteShift,
    offerShiftTrade,
    createStaffingRequest,
    openTimeEntry,
    timeEntries,
    clockIn,
    clockOut,
    submitManualTime: submitManualTimeEntry,
  } = useSchedule(selectedDate, {
    onError: infoDialog.showError,
  });

  function showMissingActiveCinemaMessage() {
    infoDialog.showError(
      "Ingen aktiv biograf valgt",
      "Vælg en biograf i MASTER-panelet, før du bruger vagtplanen.",
    );
  }

  const filteredMovieShowings = useMemo(
    () => getMovieShowingsForDate(movieShowings, selectedDate),
    [movieShowings, selectedDate],
  );

  const {
    selectedShift,
    showShiftFormModal,
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
    openCreateShiftModal,
    hideShiftFormModal,
    closeShiftFormModal,
    resetShiftFormForDate,
    handleSubmit,
    handleDelete,
    handleSelectShift,
    handleOfferTrade,
  } = useScheduleShiftForm({
    selectedDate,
    users,
    workTypes,
    needsMasterCinemaSelection,
    showMissingActiveCinemaMessage,
    createShift,
    updateShift,
    deleteShift,
    offerShiftTrade,
    confirmDialog,
    infoDialog,
  });

  useEffect(() => {
    if (scheduleDateQueryApplied.current) return;

    scheduleDateQueryApplied.current = true;

    const queryDate = new URLSearchParams(window.location.search).get("date");

    if (!queryDate || !/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) return;

    setSelectedDate(queryDate);
    resetShiftFormForDate(queryDate);
  }, [resetShiftFormForDate]);

  const { handleMoveShift, handleChangeShiftUser, handleResizeShift } =
    useScheduleShiftTimelineActions({
      selectedDate,
      updateShift,
      infoDialog,
    });

  const {
    showClockModal,
    resetClockModal,
    clockShiftId,
    setClockShiftId,
    clockInTime,
    setClockInTime,
    clockOutTime,
    setClockOutTime,
    clockNote,
    setClockNote,
    showManualTimeModal,
    resetManualTimeModal,
    manualClockInTime,
    setManualClockInTime,
    manualClockOutTime,
    setManualClockOutTime,
    manualNote,
    setManualNote,
    selectedClockShift,
    shiftsForTimeRegistration,
    handleRegisterClockIn,
    handleRegisterClockOut,
    openRegisterTimeModal,
    openManualTimeModal,
    handleSubmitManualTimeWithoutShift,
  } = useScheduleTimeRegistration({
    selectedDate,
    shifts,
    timeEntries,
    currentUser,
    currentUserId: currentUser?.id,
    openTimeEntry,
    needsMasterCinemaSelection,
    showMissingActiveCinemaMessage,
    infoDialog,
    clockIn,
    clockOut,
    submitManualTimeEntry,
  });

  const {
    showStaffingRequestModal,
    resetStaffingRequestModal,
    staffingTargetUsers,
    selectedStaffingRequestShift,
    staffingRequestShiftId,
    staffingRequestTargetMode,
    staffingRequestTargetUserId,
    setStaffingRequestTargetUserId,
    staffingRequestType,
    setStaffingRequestType,
    staffingRequestPriority,
    setStaffingRequestPriority,
    staffingRequestMessage,
    setStaffingRequestMessage,
    staffingRequestStartTime,
    setStaffingRequestStartTime,
    staffingRequestEndTime,
    setStaffingRequestEndTime,
    staffingRequestWorkTypeId,
    setStaffingRequestWorkTypeId,
    openStaffingRequestModal,
    handleStaffingRequestShiftChange,
    handleStaffingRequestTargetModeChange,
    handleSubmitStaffingRequest,
  } = useScheduleStaffingRequest({
    selectedDate,
    shifts,
    users,
    workTypes,
    needsMasterCinemaSelection,
    showMissingActiveCinemaMessage,
    hideShiftFormModal,
    infoDialog,
    createStaffingRequest,
  });

  function handleOpenStaffingRequestForSelectedShift() {
    if (!selectedShift) return;

    openStaffingRequestModal(selectedShift);
  }

  useRealtimeShifts({
    onShiftsUpdated: () =>
      refreshDayData({ showErrors: false, showLoading: false }),
    onShiftTradesUpdated: () =>
      refreshDayData({ showErrors: false, showLoading: false }),
    enableToasts: false,
  });

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    const nextDate = dateToLocalDateString(date);
    setSelectedDate(nextDate);
    resetShiftFormForDate(nextDate);
  }

  function goToToday() {
    const today = getTodayLocalDate();
    setSelectedDate(today);
    resetShiftFormForDate(today);
  }

  function goToDate(nextDate: string) {
    if (!nextDate) return;

    setSelectedDate(nextDate);
    resetShiftFormForDate(nextDate);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser vagter...
      </main>
    );
  }

  return (
    <AiScheduleFeatures
      enabled={aiEnabled}
      selectedDate={selectedDate}
      shifts={shifts}
      users={users}
      workTypes={workTypes}
      movieShowings={filteredMovieShowings}
      createShift={createShift}
      showError={infoDialog.showError}
    >
      {(ai) => (
        <>
          <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
            <ScheduleMainContent
              ai={ai}
              shifts={shifts}
              users={users}
              selectedDate={selectedDate}
              canManageShifts={canManageShifts}
              needsMasterCinemaSelection={needsMasterCinemaSelection}
              leaveRequests={leaveRequests}
              movieShowings={filteredMovieShowings}
              onOpenRegisterTimeModal={openRegisterTimeModal}
              onOpenManualTimeModal={openManualTimeModal}
              onOpenStaffingRequest={() => openStaffingRequestModal(null)}
              onOpenCreateShiftModal={openCreateShiftModal}
              onPreviousDay={() => changeDate(-1)}
              onToday={goToToday}
              onDateChange={goToDate}
              onNextDay={() => changeDate(1)}
              onSelectShift={handleSelectShift}
              onMoveShift={handleMoveShift}
              onChangeShiftUser={handleChangeShiftUser}
              onResizeShift={handleResizeShift}
            />

            <ScheduleShiftFormModal
              open={showShiftFormModal}
              selectedShift={selectedShift}
              users={users}
              workTypes={workTypes}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              note={note}
              setNote={setNote}
              userId={userId}
              setUserId={setUserId}
              workTypeId={workTypeId}
              setWorkTypeId={setWorkTypeId}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              onCancel={closeShiftFormModal}
              onOfferTrade={handleOfferTrade}
              onSendStaffingRequest={handleOpenStaffingRequestForSelectedShift}
              leaveRequests={leaveRequests}
            />

            <StaffingRequestModal
              open={showStaffingRequestModal}
              onClose={resetStaffingRequestModal}
              onSubmit={handleSubmitStaffingRequest}
              shifts={shifts}
              workTypes={workTypes}
              staffingTargetUsers={staffingTargetUsers}
              selectedShift={selectedStaffingRequestShift}
              selectedShiftId={staffingRequestShiftId}
              onShiftChange={handleStaffingRequestShiftChange}
              targetMode={staffingRequestTargetMode}
              onTargetModeChange={handleStaffingRequestTargetModeChange}
              targetUserId={staffingRequestTargetUserId}
              onTargetUserIdChange={setStaffingRequestTargetUserId}
              requestType={staffingRequestType}
              onRequestTypeChange={setStaffingRequestType}
              priority={staffingRequestPriority}
              onPriorityChange={setStaffingRequestPriority}
              message={staffingRequestMessage}
              onMessageChange={setStaffingRequestMessage}
              startTime={staffingRequestStartTime}
              onStartTimeChange={setStaffingRequestStartTime}
              endTime={staffingRequestEndTime}
              onEndTimeChange={setStaffingRequestEndTime}
              workTypeId={staffingRequestWorkTypeId}
              onWorkTypeIdChange={setStaffingRequestWorkTypeId}
              getShiftOptionText={(shift) =>
                getStaffingShiftOptionText(shift, users)
              }
              getUserDisplayName={getUserDisplayName}
            />

            <TimeRegistrationModal
              open={showClockModal}
              onClose={resetClockModal}
              openTimeEntry={openTimeEntry}
              clockShiftId={clockShiftId}
              setClockShiftId={setClockShiftId}
              shifts={shifts}
              shiftsForTimeRegistration={shiftsForTimeRegistration}
              selectedClockShift={selectedClockShift}
              clockInTime={clockInTime}
              setClockInTime={setClockInTime}
              clockOutTime={clockOutTime}
              setClockOutTime={setClockOutTime}
              clockNote={clockNote}
              setClockNote={setClockNote}
              onRegisterClockIn={handleRegisterClockIn}
              onRegisterClockOut={handleRegisterClockOut}
            />

            <ManualTimeRegistrationModal
              open={showManualTimeModal}
              onClose={resetManualTimeModal}
              clockInTime={manualClockInTime}
              setClockInTime={setManualClockInTime}
              clockOutTime={manualClockOutTime}
              setClockOutTime={setManualClockOutTime}
              note={manualNote}
              setNote={setManualNote}
              onSubmit={handleSubmitManualTimeWithoutShift}
            />
          </main>

          <ConfirmModal
            open={confirmDialog.open}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmText={confirmDialog.confirmText}
            cancelText={confirmDialog.cancelText}
            confirmVariant={confirmDialog.confirmVariant}
            loading={confirmDialog.loading}
            onConfirm={confirmDialog.handleConfirm}
            onCancel={confirmDialog.handleCancel}
          />

          <InfoModal
            open={infoDialog.open}
            title={infoDialog.title}
            description={infoDialog.description}
            buttonText={infoDialog.buttonText}
            variant={infoDialog.variant}
            onClose={infoDialog.close}
          />
        </>
      )}
    </AiScheduleFeatures>
  );
}
