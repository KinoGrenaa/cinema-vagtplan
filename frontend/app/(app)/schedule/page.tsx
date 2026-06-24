"use client";

import { useEffect, useMemo, useState } from "react";
import StaffingRequestModal from "./components/StaffingRequestModal";
import {
  ManualTimeRegistrationModal,
  TimeRegistrationModal,
} from "./components/TimeRegistrationModals";
import ScheduleShiftFormModal from "./components/ScheduleShiftFormModal";
import ScheduleMainContent from "./components/ScheduleMainContent";
import { useScheduleStaffingRequest } from "./hooks/useScheduleStaffingRequest";
import { useScheduleTimeRegistration } from "./hooks/useScheduleTimeRegistration";
import { useSchedule } from "../../hooks/useSchedule";
import AiScheduleFeatures from "./components/AiScheduleFeatures";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  dateToLocalDateString,
  getTodayLocalDate,
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import type { Shift } from "../../../../shared/types";
import {
  getShiftConfirmText,
  getShiftUserId,
  getStaffingShiftOptionText,
  getUserDisplayName,
} from "./helpers/scheduleShiftText";
import {
  getMovedShiftTimes,
  getResizedShiftTimes,
} from "./helpers/scheduleShiftTime";
import { getMovieShowingsForDate } from "./helpers/scheduleDerivedData";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { toast } from "sonner";

export default function SchedulePage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  const todayDefault = getTodayLocalDate();

  const [selectedDate, setSelectedDate] = useState(todayDefault);

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

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftFormModal, setShowShiftFormModal] = useState(false);

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(0);
  const [workTypeId, setWorkTypeId] = useState(0);
  useEffect(() => {
    if (
      userId !== 0 &&
      users.length > 0 &&
      !users.some((user) => user.id === userId)
    ) {
      setUserId(0);
    }
  }, [userId, users]);

  useEffect(() => {
    if (
      workTypeId !== 0 &&
      workTypes.length > 0 &&
      !workTypes.some((workType) => workType.id === workTypeId)
    ) {
      setWorkTypeId(0);
    }
  }, [workTypeId, workTypes]);

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
    hideShiftFormModal: () => setShowShiftFormModal(false),
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

  function clearForm() {
    setSelectedShift(null);

    setUserId(0);
    setWorkTypeId(0);

    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);

    setNote("");
  }

  function openCreateShiftModal() {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    clearForm();
    setShowShiftFormModal(true);
  }

  function closeShiftFormModal() {
    clearForm();
    setShowShiftFormModal(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = {
      startTime: localDateTimeToISOString(startTime),
      endTime: localDateTimeToISOString(endTime),
      note,
      userId: userId > 0 ? userId : null,
      workTypeId,
    };

    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, body);
      } else {
        await createShift(body);
      }

      closeShiftFormModal();
    } catch (error) {
      infoDialog.showError(
        selectedShift
          ? "Vagten kunne ikke opdateres"
          : "Vagten kunne ikke oprettes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle gemmes. Prøv igen.",
      );
    }
  }

  function handleDelete() {
    if (!selectedShift) return;

    const shiftToDelete = selectedShift;

    confirmDialog.confirm({
      title: "Slet vagt",
      description: `Er du sikker på, at du vil slette denne vagt?

${getShiftConfirmText(shiftToDelete)}

Handlingen kan ikke fortrydes.`,
      confirmText: "Slet vagt",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteShift(shiftToDelete.id);
          closeShiftFormModal();
          toast.success("Vagten er slettet");
        } catch (error) {
          infoDialog.showError(
            "Vagten kunne ikke slettes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagten skulle slettes. Prøv igen.",
          );
        }
      },
    });
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(toInputDateTime(shift.startTime));
    setEndTime(toInputDateTime(shift.endTime));
    setNote(shift.note || "");
    setUserId(getShiftUserId(shift) ?? 0);
    setWorkTypeId(shift.workTypeId);
    setShowShiftFormModal(true);
  }

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const nextDate = dateToLocalDateString(date);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function goToToday() {
    const today = getTodayLocalDate();

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  function goToDate(nextDate: string) {
    if (!nextDate) return;

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setShowShiftFormModal(false);
  }

  async function handleMoveShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) {
    const { newStart, newEnd } = getMovedShiftTimes({
      shift,
      selectedDate,
      newStartHour,
      newStartMinute,
    });

    try {
      await updateShift(shift.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: getShiftUserId(shift),
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Vagten kunne ikke flyttes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle flyttes. Prøv igen.",
      );
    }
  }

  async function handleChangeShiftUser(shift: Shift, newUserId: number | null) {
    try {
      await updateShift(shift.id, {
        startTime: shift.startTime,
        endTime: shift.endTime,
        note: shift.note,
        userId: newUserId,
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Medarbejder kunne ikke ændres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagten skulle tildeles en anden medarbejder. Prøv igen.",
      );
    }
  }

  async function handleResizeShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) {
    const { newStart, newEnd } = getResizedShiftTimes({
      shift,
      selectedDate,
      newStartHour,
      newStartMinute,
      newEndHour,
      newEndMinute,
    });

    try {
      await updateShift(shift.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: getShiftUserId(shift),
        workTypeId: shift.workTypeId,
      });
    } catch (error) {
      infoDialog.showError(
        "Vagten kunne ikke ændres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtens tidspunkt skulle ændres. Prøv igen.",
      );
    }
  }

  function handleOfferTrade() {
    if (!selectedShift) return;

    if (!getShiftUserId(selectedShift)) {
      infoDialog.showError(
        "Vagten er ikke tildelt",
        "Vagten skal tildeles en medarbejder, før den kan sendes i byttepuljen.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Send vagt i byttepulje",
      description: `Er du sikker på, at du vil sende denne vagt i vagtpuljen?

${getShiftConfirmText(selectedShift)}`,
      confirmText: "Send i pulje",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await offerShiftTrade(selectedShift);
          toast.success("Vagten er sendt i byttepuljen");
        } catch (error) {
          infoDialog.showError(
            "Vagten kunne ikke sendes i byttepuljen",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagten skulle sendes i byttepuljen. Prøv igen.",
          );
        }
      },
    });
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
